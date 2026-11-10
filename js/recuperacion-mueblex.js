// Solicitud por WhatsApp, acceso temporal y ayuda de administradores.
const RecuperacionMueblex = (() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let esAdmin = false, miId = null, usuarios = [], contactos = [];
  let pagina = 0, total = 0, busqueda = "", paginaHistorial = 0, totalHistorial = 0;
  let versionUsuarios = 0, versionHistorial = 0, versionContactos = 0;
  let destinoPassword = null, destinoContacto = null, guardando = false;
  let cargandoUsuarios = false, cargandoHistorial = false;
  const validaPassword = valor => valor.length >= 12 && new TextEncoder().encode(valor).length <= 72;

  async function invocar(body) {
    const { data, error } = await clientesupabase.functions.invoke("gestionar-recuperacion", { body });
    if (error) {
      let detalle;
      try { detalle = await error.context?.json(); } catch { /* Puede no ser JSON. */ }
      throw new Error(detalle?.error || "No se pudo confirmar la operación. Revisa la conexión y actualiza el historial antes de repetir.");
    }
    if (!data || data.error) throw new Error(data?.error || "Respuesta del servidor no disponible.");
    return data;
  }
  function paginacion() {
    $("accesos-anterior").disabled = guardando || cargandoUsuarios || pagina === 0;
    $("accesos-siguiente").disabled = guardando || cargandoUsuarios || (pagina + 1) * 20 >= total;
    $("pagina-accesos").textContent = `Página ${pagina + 1} · ${total} cuentas`;
    $("recuperaciones-anterior").disabled = guardando || cargandoHistorial || paginaHistorial === 0;
    $("recuperaciones-siguiente").disabled = guardando || cargandoHistorial || (paginaHistorial + 1) * 20 >= totalHistorial;
    $("pagina-recuperaciones").textContent = `Página ${paginaHistorial + 1} · ${totalHistorial} registros`;
  }
  function filaTexto(tbody, valores) {
    const fila = document.createElement("tr");
    valores.forEach(valor => { const td = document.createElement("td"); td.textContent = valor; fila.append(td); });
    tbody.append(fila);
    return fila;
  }
  function mostrarUsuarios() {
    const tbody = $("filas-accesos"); tbody.replaceChildren();
    usuarios.forEach(usuario => {
      const fila = filaTexto(tbody, [usuario.nombre, usuario.correo, usuario.rol,
        usuario.rol === "administrador" ? (usuario.whatsapp_recuperacion || "Sin publicar") : "—"]);
      const td = document.createElement("td"), acciones = document.createElement("div"); acciones.className = "rec-fila";
      const agregar = (texto, accion) => {
        const boton = document.createElement("button"); boton.type = "button"; boton.textContent = texto;
        boton.disabled = guardando || cargandoUsuarios;
        boton.addEventListener("click", accion); acciones.append(boton);
      };
      if (usuario.id_auth !== miId) agregar("Restablecer contraseña", () => abrirPassword(usuario));
      if (usuario.rol === "administrador") agregar("WhatsApp de ayuda", () => abrirContacto(usuario));
      if (usuario.id_auth === miId) { const nota = document.createElement("span"); nota.textContent = "Tu cuenta: usa Cambiar contraseña."; acciones.append(nota); }
      td.append(acciones); fila.append(td);
    });
    if (!usuarios.length) { const fila = filaTexto(tbody, ["No hay cuentas para esta búsqueda."]); fila.firstElementChild.colSpan = 5; }
    paginacion();
  }
  async function cargarUsuarios() {
    if (!esAdmin || guardando) return;
    const version = ++versionUsuarios;
    cargandoUsuarios = true; mostrarUsuarios();
    $("mensaje-accesos").textContent = "Consultando cuentas…";
    try {
      const data = await invocar({ accion: "listar", buscar: busqueda, pagina });
      if (version !== versionUsuarios || !esAdmin) return;
      usuarios = data.usuarios; total = data.total; miId = data.mi_id;
      $("mensaje-accesos").textContent = "Lista actualizada.";
    } catch (error) {
      if (version !== versionUsuarios || !esAdmin) return;
      usuarios = []; total = 0; $("mensaje-accesos").textContent = error.message;
    } finally { if (version === versionUsuarios) { cargandoUsuarios = false; mostrarUsuarios(); } }
  }
  async function cargarHistorial() {
    if (!esAdmin || guardando) return;
    const version = ++versionHistorial;
    cargandoHistorial = true; paginacion();
    $("mensaje-historial-recuperaciones").textContent = "Consultando historial…";
    try {
      const data = await invocar({ accion: "historial", pagina: paginaHistorial });
      if (version !== versionHistorial || !esAdmin) return;
      totalHistorial = data.total;
      const tbody = $("filas-historial-recuperaciones"); tbody.replaceChildren();
      data.historial.forEach(item => filaTexto(tbody, [
        new Date(item.fecha).toLocaleString("es-BO"), `${item.nombre_cuenta} · ${item.correo_cuenta}`,
        item.tipo === "restablecimiento" ? "Contraseña temporal establecida" : "Cambio obligatorio completado",
        item.nombre_responsable
      ]));
      if (!data.historial.length) { const fila = filaTexto(tbody, ["No hay restablecimientos registrados."]); fila.firstElementChild.colSpan = 4; }
      $("mensaje-historial-recuperaciones").textContent = "Historial actualizado. No almacena contraseñas.";
    } catch (error) {
      if (version !== versionHistorial || !esAdmin) return;
      $("filas-historial-recuperaciones").replaceChildren(); totalHistorial = 0;
      $("mensaje-historial-recuperaciones").textContent = error.message;
    } finally { if (version === versionHistorial) { cargandoHistorial = false; paginacion(); } }
  }
  async function preparar(administrador) {
    esAdmin = administrador === true;
    $("panel-recuperacion-admin").hidden = !esAdmin;
    if (!esAdmin) {
      versionUsuarios++; versionHistorial++; usuarios = []; miId = null; total = 0; totalHistorial = 0;
      cargandoUsuarios = false; cargandoHistorial = false;
      $("filas-accesos").replaceChildren(); $("filas-historial-recuperaciones").replaceChildren();
      return;
    }
    pagina = 0; paginaHistorial = 0; busqueda = ""; $("buscar-acceso").value = "";
    await Promise.all([cargarUsuarios(), cargarHistorial()]);
  }
  async function verificarAcceso() {
    const { data, error } = await clientesupabase.rpc("estado_recuperacion_mueblex");
    if (error || !data || typeof data.requiere_cambio !== "boolean") {
      if (error?.code === "42501") {
        $("seccion-app").style.display = "none"; $("seccion-login").style.display = "block";
        $("mensaje-login").textContent = "Vuelve a iniciar sesión con tu contraseña vigente.";
        await preparar(false);
      }
      throw new Error("No se pudo comprobar el acceso. Revisa la instalación de recuperación en Supabase.");
    }
    $("cambio-obligatorio").hidden = !data.requiere_cambio;
    if (data.requiere_cambio) {
      $("seccion-login").style.display = "none"; $("seccion-app").style.display = "none";
      await preparar(false); $("titulo-cambio-obligatorio").focus();
      return false;
    }
    return true;
  }
  function abrirPassword(usuario) {
    if (!esAdmin || guardando) return;
    destinoPassword = usuario.id_auth; $("form-restablecer-acceso").reset();
    $("rec-cuenta-destino").textContent = `${usuario.nombre} · ${usuario.correo}`;
    $("mensaje-restablecer-acceso").textContent = ""; $("dialogo-restablecer-acceso").showModal();
  }
  function abrirContacto(usuario) {
    if (!esAdmin || guardando) return;
    destinoContacto = usuario.id_auth; $("form-contacto-recuperacion").reset();
    $("rec-cuenta-contacto").textContent = usuario.nombre;
    $("rec-telefono").value = usuario.whatsapp_recuperacion || "";
    $("mensaje-contacto-recuperacion").textContent = ""; $("dialogo-contacto-recuperacion").showModal();
  }
  async function bloquear(formulario, accion) {
    if (guardando) return;
    guardando = true; formulario.dataset.guardando = "true";
    const controles = [...formulario.querySelectorAll("input,button,select")];
    controles.forEach(c => { c.disabled = true; }); mostrarUsuarios();
    try { await accion(); }
    finally { guardando = false; delete formulario.dataset.guardando; controles.forEach(c => { c.disabled = false; }); mostrarUsuarios(); }
  }
  $("form-restablecer-acceso").addEventListener("submit", async event => {
    event.preventDefault();
    if (!esAdmin || !destinoPassword || guardando) return;
    const temporal = $("rec-temporal").value;
    if (!validaPassword(temporal) || temporal !== $("rec-temporal-repetir").value || !$("rec-identidad").checked) {
      $("mensaje-restablecer-acceso").textContent = "Verifica la identidad y escribe dos contraseñas iguales, de al menos 12 caracteres y hasta 72 bytes."; return;
    }
    await bloquear(event.currentTarget, async () => {
      $("mensaje-restablecer-acceso").textContent = "Restableciendo acceso…";
      try {
        await invocar({ accion: "restablecer", id_auth: destinoPassword, temporal, identidad_verificada: true });
        $("dialogo-restablecer-acceso").close();
        $("mensaje-accesos").textContent = "Acceso restablecido. Entrega la contraseña temporal en privado; deberá cambiarla al entrar.";
      } catch (error) { $("mensaje-restablecer-acceso").textContent = error.message; }
      finally { $("rec-temporal").value = ""; $("rec-temporal-repetir").value = ""; $("rec-identidad").checked = false; }
    });
    paginaHistorial = 0; await cargarHistorial();
  });
  $("form-contacto-recuperacion").addEventListener("submit", async event => {
    event.preventDefault();
    if (!esAdmin || !destinoContacto || guardando) return;
    const whatsapp = $("rec-telefono").value.trim();
    if (whatsapp && !/^[1-9]\d{7,14}$/.test(whatsapp)) {
      $("mensaje-contacto-recuperacion").textContent = "Escribe código de país y número, solo dígitos."; return;
    }
    await bloquear(event.currentTarget, async () => {
      $("mensaje-contacto-recuperacion").textContent = "Guardando…";
      try {
        await invocar({ accion: "contacto", id_auth: destinoContacto, whatsapp });
        $("dialogo-contacto-recuperacion").close();
        $("mensaje-accesos").textContent = "Contacto guardado.";
      } catch (error) { $("mensaje-contacto-recuperacion").textContent = error.message; }
    });
    await cargarUsuarios();
  });
  $("form-buscar-acceso").addEventListener("submit", event => {
    event.preventDefault(); if (guardando) return;
    busqueda = $("buscar-acceso").value.trim(); pagina = 0; cargarUsuarios();
  });
  $("actualizar-accesos").addEventListener("click", () => {
    if (guardando) return;
    busqueda = ""; pagina = 0; $("buscar-acceso").value = ""; cargarUsuarios();
  });
  $("accesos-anterior").addEventListener("click", () => { if (pagina > 0 && !cargandoUsuarios && !guardando) { pagina--; cargarUsuarios(); } });
  $("accesos-siguiente").addEventListener("click", () => { if ((pagina + 1) * 20 < total && !cargandoUsuarios && !guardando) { pagina++; cargarUsuarios(); } });
  $("actualizar-recuperaciones").addEventListener("click", () => { if (!guardando) { paginaHistorial = 0; cargarHistorial(); } });
  $("recuperaciones-anterior").addEventListener("click", () => { if (paginaHistorial > 0 && !cargandoHistorial && !guardando) { paginaHistorial--; cargarHistorial(); } });
  $("recuperaciones-siguiente").addEventListener("click", () => { if ((paginaHistorial + 1) * 20 < totalHistorial && !cargandoHistorial && !guardando) { paginaHistorial++; cargarHistorial(); } });

  document.querySelectorAll("[data-rec-cerrar]").forEach(boton => boton.addEventListener("click", () => {
    const dialogo = boton.closest("dialog");
    if (!dialogo.querySelector('[data-guardando="true"]')) dialogo.close();
  }));
  document.querySelectorAll(".rec-dialogo").forEach(dialogo => dialogo.addEventListener("cancel", event => {
    if (dialogo.querySelector('[data-guardando="true"]')) event.preventDefault();
  }));
  $("dialogo-restablecer-acceso").addEventListener("close", () => { $("form-restablecer-acceso").reset(); destinoPassword = null; });
  $("dialogo-contacto-recuperacion").addEventListener("close", () => { $("form-contacto-recuperacion").reset(); destinoContacto = null; });
  function limpiarEnlace() { $("rec-abrir-whatsapp").hidden = true; $("rec-abrir-whatsapp").removeAttribute("href"); }
  $("rec-correo").addEventListener("input", limpiarEnlace);
  $("rec-administrador").addEventListener("change", limpiarEnlace);
  // Diseño B: usa el mismo formulario de recuperación dentro de la tarjeta.
  // Si se restaura el Diseño A, continúa abriéndose como diálogo modal.
  function vistaContacto(abrir) {
    const tarjeta = $("login-tarjeta-b");
    if (!tarjeta) return;
    tarjeta.classList.toggle("recuperando", abrir);
    $("form-login").inert = abrir;
    if (abrir) $("form-login").setAttribute("aria-hidden", "true");
    else $("form-login").removeAttribute("aria-hidden");
    tarjeta.querySelector(".login-copy-acceso").hidden = abrir;
    tarjeta.querySelector(".login-copy-recuperar").hidden = !abrir;
    $("enlace-recuperar").setAttribute("aria-expanded", String(abrir));
    $("login-b-alternar").setAttribute("aria-expanded", String(abrir));
    $("login-b-alternar").textContent = abrir ? "Volver a iniciar sesión" : "Recuperar mi cuenta";
  }
  if ($("login-tarjeta-b")) {
    $("login-b-alternar").addEventListener("click", () => {
      if ($("dialogo-contactar-admin").open) $("dialogo-contactar-admin").close();
      else $("enlace-recuperar").click();
    });
    $("login-tarjeta-b").addEventListener("keydown", event => {
      if (event.key === "Escape" && $("dialogo-contactar-admin").open) {
        event.preventDefault(); $("dialogo-contactar-admin").close();
      }
    });
  }
  $("enlace-recuperar").addEventListener("click", async event => {
    event.preventDefault();
    if ($("dialogo-contactar-admin").open) return;
    const version = ++versionContactos; contactos = []; limpiarEnlace();
    $("rec-correo").value = $("login-email").value.trim();
    const select = $("rec-administrador"); select.replaceChildren(new Option("Consultando…", ""));
    $("mensaje-contactar-admin").textContent = "Consultando contactos…";
    if ($("login-tarjeta-b")) {
      vistaContacto(true);
      $("dialogo-contactar-admin").show();
      $("rec-correo").focus();
    } else $("dialogo-contactar-admin").showModal();
    try {
      const { data, error } = await clientesupabase.rpc("administradores_recuperacion_mueblex");
      if (version !== versionContactos || !$("dialogo-contactar-admin").open) return;
      if (error) throw error;
      contactos = (data || []).filter(c => typeof c.nombre === "string" && /^[1-9]\d{7,14}$/.test(c.whatsapp));
      select.replaceChildren(new Option("Selecciona un administrador", ""));
      contactos.forEach((c, i) => select.add(new Option(`${c.nombre} · +${c.whatsapp}`, String(i))));
      $("mensaje-contactar-admin").textContent = contactos.length ? "Completa tu correo y elige a quién contactar."
        : "Todavía no hay contactos publicados. Contacta al responsable del negocio por tu medio habitual.";
    } catch {
      select.replaceChildren(new Option("Contactos no disponibles", ""));
      $("mensaje-contactar-admin").textContent = "No se pudieron consultar los contactos. Revisa la conexión o contacta al responsable del negocio.";
    }
  });
  $("dialogo-contactar-admin").addEventListener("close", () => {
    versionContactos++; contactos = []; limpiarEnlace(); $("form-contactar-admin").reset();
    vistaContacto(false);
    if ($("login-tarjeta-b")) $("enlace-recuperar").focus();
  });
  $("form-contactar-admin").addEventListener("submit", event => {
    event.preventDefault(); limpiarEnlace();
    const email = $("rec-correo").value.trim(), indice = $("rec-administrador").value;
    const contacto = indice !== "" ? contactos[Number(indice)] : null;
    if (!email || !$("rec-correo").checkValidity() || !contacto) {
      $("mensaje-contactar-admin").textContent = "Escribe tu correo y selecciona un administrador."; return;
    }
    const texto = `Hola, ${contacto.nombre}. Solicito ayuda para recuperar el acceso a mi cuenta de Melanova. Mi correo es ${email}. ¿Puedes verificar mi identidad y ayudarme a restablecer la contraseña?`;
    $("rec-abrir-whatsapp").href = `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(texto)}`;
    $("rec-abrir-whatsapp").hidden = false;
    $("mensaje-contactar-admin").textContent = "Mensaje preparado. Abre WhatsApp y pulsa Enviar. Todavía no se ha enviado.";
    $("rec-abrir-whatsapp").focus();
  });
  $("form-cambio-obligatorio").addEventListener("submit", async event => {
    event.preventDefault();
    if (guardando) return;
    const actual = $("rec-password-actual").value, nueva = $("rec-password-nueva").value;
    if (!validaPassword(actual) || !validaPassword(nueva) || actual === nueva || nueva !== $("rec-password-repetir").value) {
      $("mensaje-cambio-obligatorio").textContent = "La nueva debe ser distinta de la temporal, coincidir en ambos campos y tener al menos 12 caracteres y hasta 72 bytes."; return;
    }
    await bloquear(event.currentTarget, async () => {
      $("mensaje-cambio-obligatorio").textContent = "Guardando contraseña…";
      try {
        await invocar({ accion: "completar_cambio", actual, nueva });
        $("form-cambio-obligatorio").reset();
        await clientesupabase.auth.signOut({ scope: "local" });
        sessionStorage.setItem("mueblex-aviso-acceso", "Contraseña actualizada. Inicia sesión con tu nueva contraseña.");
        location.reload();
      } catch (error) { $("mensaje-cambio-obligatorio").textContent = error.message; }
      finally { $("form-cambio-obligatorio").reset(); }
    });
  });
  $("salir-cambio-obligatorio").addEventListener("click", async () => {
    if (guardando) return;
    const { error } = await clientesupabase.auth.signOut({ scope: "local" });
    if (error) { $("mensaje-cambio-obligatorio").textContent = "No se pudo cerrar sesión. Revisa tu conexión."; return; }
    location.reload();
  });
  window.addEventListener("focus", async () => {
    if ($("seccion-app").style.display !== "block" || guardando) return;
    try { await verificarAcceso(); } catch { /* Las operaciones siguen protegidas en Supabase. */ }
  });
  const aviso = sessionStorage.getItem("mueblex-aviso-acceso");
  if (aviso) { $("mensaje-login").textContent = aviso; sessionStorage.removeItem("mueblex-aviso-acceso"); }
  return Object.freeze({ verificarAcceso, preparar, actualizarUsuarios: cargarUsuarios });
})();
