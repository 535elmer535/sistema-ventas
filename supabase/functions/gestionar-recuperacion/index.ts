// Recuperación MUEBLEX. Las claves de administrador permanecen en el servidor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json", "Cache-Control": "no-store"
  };
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Método no permitido." }, 405);
  const validoUUID = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const validaPassword = (p) => typeof p === "string" && p.length >= 12 && new TextEncoder().encode(p).length <= 72;
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Inicia sesión para continuar." }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    // getUser consulta Authentication: no se confía en roles ni marcas de un JWT antiguo.
    const { data: identidad, error: errorIdentidad } = await admin.auth.getUser(token);
    if (errorIdentidad || !identidad.user) return reply({ error: "La sesión no es válida. Vuelve a entrar." }, 401);
    const actorAuth = identidad.user;
    // getUser ya validó este JWT. Se comprueba además que sea posterior al reset.
    let emitido = 0;
    try { emitido = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).iat || 0; } catch { /* Token no válido. */ }
    if (emitido < (actorAuth.app_metadata?.mueblex_restablecido_desde || 0)) {
      return reply({ error: "Este acceso es anterior al restablecimiento. Cierra sesión y vuelve a entrar." }, 401);
    }
    const { data: actor, error: errorActor } = await admin.from("usuarios")
      .select("id_auth,nombre,rol").eq("id_auth", actorAuth.id).single();
    if (errorActor || !actor) return reply({ error: "La cuenta no tiene un perfil disponible." }, 403);
    let body;
    try { body = await req.json(); } catch { return reply({ error: "Solicitud inválida." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Solicitud inválida." }, 400);
    const pendiente = actorAuth.app_metadata?.mueblex_cambio_pendiente === true;

    if (body.accion === "completar_cambio") {
      if (!pendiente) return reply({ error: "Esta cuenta no tiene un cambio obligatorio pendiente. Vuelve a entrar." }, 409);
      if (!validaPassword(body.actual) || !validaPassword(body.nueva) || body.actual === body.nueva) {
        return reply({ error: "Escribe la contraseña temporal y una nueva distinta, de al menos 12 caracteres y hasta 72 bytes." }, 400);
      }
      if (actorAuth.factors?.some(f => f.status === "verified")) {
        return reply({ error: "Esta cuenta utiliza verificación adicional. Solicita asistencia al responsable de Supabase." }, 409);
      }
      const verificador = createClient(url, Deno.env.get("SUPABASE_ANON_KEY"), {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data: acceso, error: errorAcceso } = await verificador.auth.signInWithPassword({
        email: actorAuth.email, password: body.actual
      });
      if (errorAcceso || acceso.user?.id !== actorAuth.id) {
        return reply({ error: "La contraseña temporal no es correcta o no se pudo verificar. Vuelve a intentarlo." }, 400);
      }
      // No queda una sesión adicional abierta por esta comprobación.
      await verificador.auth.signOut({ scope: "local" });
      const { error } = await admin.auth.admin.updateUserById(actorAuth.id, {
        password: body.nueva,
        app_metadata: { mueblex_cambio_pendiente: false,
          mueblex_completar_version: actorAuth.app_metadata.mueblex_restablecimiento_id }
      });
      if (error) return reply({ error: "No se confirmó el cambio. La nueva debe ser distinta; si otro administrador restableció el acceso, usa su contraseña más reciente." }, 409);
      return reply({ ok: true, volver_a_ingresar: true });
    }

    if (pendiente || actor.rol !== "administrador") {
      return reply({ error: "Solo los administradores con acceso vigente pueden gestionar la recuperación." }, 403);
    }
    if (actorAuth.factors?.some(f => f.status === "verified")) {
      return reply({ error: "La recuperación de cuentas con verificación adicional debe atenderla el responsable de Supabase." }, 409);
    }
    if (body.accion === "listar") {
      const buscar = typeof body.buscar === "string" ? body.buscar.trim() : "";
      const pagina = body.pagina ?? 0;
      if (buscar.length > 100 || !Number.isSafeInteger(pagina) || pagina < 0 || pagina > 100000) {
        return reply({ error: "Búsqueda o página inválida." }, 400);
      }
      let consulta = admin.from("usuarios").select("id_auth,nombre,correo,rol,whatsapp_recuperacion", { count: "exact" })
        .not("id_auth", "is", null).order("nombre").order("id_usuario");
      // Solo letras, números, correo y separadores habituales: no se interpola sintaxis PostgREST.
      if (buscar) {
        if (!/^[\p{L}\p{N} .@+_-]+$/u.test(buscar)) return reply({ error: "Busca con un nombre o correo, sin símbolos especiales." }, 400);
        const filtro = buscar.replace(/[_%]/g, "\\$&");
        consulta = consulta.or(`nombre.ilike.%${filtro}%,correo.ilike.%${filtro}%`);
      }
      const { data, error, count } = await consulta.range(pagina * 20, pagina * 20 + 19);
      if (error) return reply({ error: "No se pudo consultar usuarios. Comprueba el SQL de instalación." }, 500);
      return reply({ usuarios: data, total: count, mi_id: actorAuth.id });
    }
    if (body.accion === "historial") {
      const pagina = body.pagina ?? 0;
      if (!Number.isSafeInteger(pagina) || pagina < 0 || pagina > 100000) return reply({ error: "Página inválida." }, 400);
      const { data, error, count } = await admin.from("historial_recuperaciones_mueblex")
        .select("id,fecha,tipo,nombre_cuenta,correo_cuenta,nombre_responsable", { count: "exact" })
        .order("id", { ascending: false }).range(pagina * 20, pagina * 20 + 19);
      if (error) return reply({ error: "No se pudo consultar el historial." }, 500);
      return reply({ historial: data, total: count });
    }
    if (!["contacto", "restablecer"].includes(body.accion) || !validoUUID(body.id_auth)) {
      return reply({ error: "Acción o cuenta inválida." }, 400);
    }
    const { data: destino, error: errorDestino } = await admin.from("usuarios")
      .select("id_auth,nombre,rol").eq("id_auth", body.id_auth).single();
    if (errorDestino || !destino) return reply({ error: "La cuenta no está disponible. Actualiza el listado." }, 404);
    if (body.accion === "contacto") {
      const telefono = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
      if (destino.rol !== "administrador" || (telefono && !/^[1-9]\d{7,14}$/.test(telefono))) {
        return reply({ error: "Selecciona un administrador y usa código de país y número, solo dígitos." }, 400);
      }
      const { error } = await admin.from("usuarios").update({ whatsapp_recuperacion: telefono || null }).eq("id_auth", destino.id_auth);
      if (error) return reply({ error: "No se pudo guardar el contacto." }, 500);
      return reply({ ok: true });
    }
    if (destino.id_auth === actorAuth.id) return reply({ error: "Para tu cuenta utiliza Cambiar contraseña." }, 409);
    if (body.identidad_verificada !== true || !validaPassword(body.temporal)) {
      return reply({ error: "Verifica la identidad y utiliza una contraseña temporal de al menos 12 caracteres y hasta 72 bytes." }, 400);
    }
    const { data: cuentaAuth, error: errorCuenta } = await admin.auth.admin.getUserById(destino.id_auth);
    if (errorCuenta || !cuentaAuth.user) return reply({ error: "La cuenta ya no tiene acceso." }, 404);
    if (cuentaAuth.user.factors?.some(f => f.status === "verified")) {
      return reply({ error: "La cuenta utiliza verificación adicional. Debe atenderla el responsable de Supabase." }, 409);
    }
    const { error } = await admin.auth.admin.updateUserById(destino.id_auth, {
      password: body.temporal,
      app_metadata: { mueblex_cambio_pendiente: true,
        mueblex_restablecimiento_id: crypto.randomUUID(), mueblex_restablecido_por: actorAuth.id,
        mueblex_restablecido_desde: Math.floor(Date.now() / 1000) + 1 }
    });
    if (error) return reply({ error: "No se confirmó el restablecimiento. Actualiza el historial antes de repetirlo." }, 409);
    return reply({ ok: true });
  } catch {
    // Nunca registrar solicitudes, contraseñas ni tokens en logs o respuestas.
    return reply({ error: "No se pudo confirmar la operación. Comprueba el historial antes de repetir." }, 500);
  }
});
