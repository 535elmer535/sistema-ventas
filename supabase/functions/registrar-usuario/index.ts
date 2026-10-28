// Desplegar como Edge Function "registrar-usuario" con verificación JWT activada.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son secretos del servidor, nunca del frontend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return respond({ error: "Método no permitido" }, 405);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond({ error: "Sesión requerida" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, adminKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return respond({ error: "Sesión inválida" }, 401);
  const { data: adminUser, error: roleError } = await admin.from("usuarios")
    .select("rol").eq("id_auth", authData.user.id).maybeSingle();
  if (roleError || adminUser?.rol !== "administrador") return respond({ error: "No autorizado" }, 403);
  let entrada;
  try { entrada = await req.json(); } catch { return respond({ error: "Solicitud inválida" }, 400); }
  const nombre = String(entrada.nombre ?? "").trim();
  const correo = String(entrada.correo ?? "").trim().toLowerCase();
  const contacto = String(entrada.contacto ?? "").trim();
  const password = String(entrada.password ?? "");
  const rol = entrada.rol;
  
if (!nombre || nombre.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    || !contacto || contacto.length > 30
    || password.length < 12 || !["administrador", "vendedor"].includes(rol)) {

    return respond({ error: "Nombre, correo, contraseña o rol inválidos" }, 400);
  }
  const { data: nuevo, error: crearError } = await admin.auth.admin.createUser({
    email: correo, password, email_confirm: true
  });
  if (crearError || !nuevo.user) return respond({ error: "No se pudo crear la cuenta en Authentication" }, 400);
  const { error: insertarError } = await admin.from("usuarios").insert({
   id_auth: nuevo.user.id, nombre, correo, contacto, rol
  });
  if (insertarError) {
    await admin.auth.admin.deleteUser(nuevo.user.id);
    console.error("Error al asociar el usuario a su rol", insertarError);
    return respond({ error: "No se pudo asociar el usuario a su rol; no se creó la cuenta" }, 500);
  }
  return respond({ ok: true });
});
