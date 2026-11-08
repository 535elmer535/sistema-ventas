// Sesión, perfil, contraseñas y gestión de cuentas de Mueblex.

let usuarioEsAdministrador = false;

// Mostrar el formulario de inicio de sesión.
function mostrarLogin() {
  document.querySelector("#seccion-app").style.display = "none";
  document.querySelector("#seccion-login").style.display = "block";
}


// Guía 14: mostrar el sistema y cargar sus datos.
async function mostrarApp() {

  document.querySelector("#seccion-login").style.display = "none";
  document.querySelector("#seccion-app").style.display = "block";

  await mostrarSaludoUsuario();
  await prepararCategoriasAdmin();
  await prepararRecuperacionVenta();
  await prepararRecuperacionPedido();
  await prepararRecuperacionCobro();
  await prepararRegistroMueble();
  await cargarProductos();
  await cargarHistorialReposiciones();
  await cargarHistorialVentas();
  await cargarHistorialPedidos();
  await probarClientes();
  await cargarResumenVentas();
await cargarProductosVendidos();
}

// Guía 14: comprobar la sesión al abrir la página.
async function iniciar() {
  try {
    const {
      data: { session },
      error
    } = await clientesupabase.auth.getSession();

    if (error) throw error;

    if (session) {
      await mostrarApp();
    } else {
      mostrarLogin();
    }
  } catch (error) {
    console.error("Error al comprobar la sesión:", error);
    mostrarLogin();
    document.querySelector("#mensaje-login").textContent =
      "No se pudo comprobar la sesión. Actualiza la página.";
  }
}

// Guía 14: cerrar la sesión en este navegador.
document.querySelector("#btn-logout")
  .addEventListener("click", async () => {
    const boton = document.querySelector("#btn-logout");
    if (boton.disabled) return;

    boton.disabled = true;

    try {
      const { error } = await clientesupabase.auth.signOut({
        scope: "local"
      });

      if (error) throw error;

      // Recargar también limpia los formularios y listas temporales.
      location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      window.alert(
        "No se pudo cerrar la sesión. Inténtalo nuevamente."
      );
      boton.disabled = false;
    }
  });


  // Guía 14: iniciar sesión.
document.querySelector("#form-login")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje = document.querySelector("#mensaje-login");

    if (boton.disabled) return;

    const email =
      document.querySelector("#login-email").value.trim();
    const password =
      document.querySelector("#login-password").value;

    if (!email || !password) {
      mensaje.textContent = "Completa el correo y la contraseña.";
      return;
    }

    boton.disabled = true;
    mensaje.textContent = "Iniciando sesión...";
    recordarSesion = selectorRecordarme.checked;
    localStorage.setItem(PREFERENCIA_RECORDAR, String(recordarSesion));

    try {
      const { error } =
        await clientesupabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        mensaje.textContent =
          "No se pudo iniciar sesión. Revisa el correo y la contraseña.";
        return;
      }

      formulario.reset();
      mensaje.textContent = "";
      await mostrarApp();
    } catch (error) {
      console.error("Error durante el inicio de sesión:", error);
      mensaje.textContent =
        "Ocurrió un problema de conexión. Inténtalo nuevamente.";
    } finally {
      boton.disabled = false;
    }
  });

  // Recordarme usa el almacenamiento definido en supabase-client.js.
const selectorRecordarme = document.querySelector("#recordarme");
selectorRecordarme.checked = recordarSesion;
selectorRecordarme.nextElementSibling.classList.toggle("on", recordarSesion);
selectorRecordarme.addEventListener("change", () => {
  selectorRecordarme.nextElementSibling.classList.toggle("on", selectorRecordarme.checked);
});

  // Guía 14: cambiar la contraseña del usuario actual.
document.querySelector("#form-cambiar-password")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje = document.querySelector("#mensaje-password");

    if (boton.disabled) return;

    const nueva =
      document.querySelector("#nueva-password").value;
    const confirmacion =
      document.querySelector("#confirmar-password").value;

    if (nueva.length < 12) {
      mensaje.textContent =
        "La contraseña debe tener al menos 12 caracteres.";
      return;
    }

    if (nueva !== confirmacion) {
      mensaje.textContent = "Las contraseñas no coinciden.";
      return;
    }

    boton.disabled = true;
    mensaje.textContent = "Cambiando contraseña...";

    try {
      const { error } = await clientesupabase.auth.updateUser({
        password: nueva
      });

      if (error) {
        mensaje.textContent =
          "No se pudo cambiar la contraseña: " + error.message;
        return;
      }

      formulario.reset();
      mensaje.textContent =
        "Contraseña actualizada correctamente. Ya puedes probar el ingreso con la nueva.";
    } catch {
      mensaje.textContent =
        "No se pudo confirmar el cambio. Comprueba tu conexión.";
    } finally {
      boton.disabled = false;
    }
  });

  async function mostrarSaludoUsuario() {
  const saludo = document.querySelector("#saludo-usuario");
  saludo.textContent = "Bienvenido";
usuarioEsAdministrador = false;
  try {
    const { data: { session }, error: errorSesion } =
      await clientesupabase.auth.getSession();

    if (errorSesion) throw errorSesion;
    if (!session) return;

    const { data: usuario, error } = await clientesupabase
      .from("usuarios")
      .select("nombre, rol")
      .eq("id_auth", session.user.id)
      .maybeSingle();

    if (error) throw error;
     usuarioEsAdministrador = usuario?.rol === "administrador";
    document.querySelector("#panel-usuarios-admin").hidden = !usuarioEsAdministrador;
    saludo.textContent =
      `Bienvenido, ${usuario?.nombre || session.user.email}`;
  } catch (error) {
    console.error("No se pudo cargar el saludo:", error);
  }
}

// Alta de usuarios: la función Edge valida nuevamente el rol del solicitante
// en Supabase antes de crear cualquier cuenta (no basta con ocultar el panel).
document.querySelector("#form-nuevo-usuario").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formulario = event.currentTarget;
  const mensaje = document.querySelector("#mensaje-nuevo-usuario");
  if (!usuarioEsAdministrador) {
    mensaje.textContent = "Solo el administrador puede registrar usuarios.";
    return;
  }
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  mensaje.textContent = "Registrando usuario...";
  try {
    const { data, error } = await clientesupabase.functions.invoke("registrar-usuario", {
      body: {
        nombre: document.querySelector("#nuevo-usuario-nombre").value.trim(),
        correo: document.querySelector("#nuevo-usuario-correo").value.trim(),

contacto: document.querySelector("#nuevo-usuario-contacto").value.trim(),

        password: document.querySelector("#nuevo-usuario-password").value,
        rol: document.querySelector("#nuevo-usuario-rol").value
      }
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || "No se pudo registrar.");
    formulario.reset();
    mensaje.textContent = "Usuario registrado correctamente.";
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    mensaje.textContent = "No se pudo registrar. Verifica que la función segura esté desplegada en Supabase y que tengas permisos de administrador.";
  } finally {
    boton.disabled = false;
  }
});

document.querySelector("#enlace-recuperar")?.addEventListener("click", async (event) => {
  event.preventDefault();
  const mensaje = document.querySelector("#mensaje-login");
  const email = document.querySelector("#login-email").value.trim();
  if (!email) {
    mensaje.textContent = "Escribe primero tu correo electrónico para recuperar la contraseña.";
    document.querySelector("#login-email").focus();
    return;
  }
  try {
    const { error } = await clientesupabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    mensaje.textContent = "Si el correo está registrado y la recuperación está configurada, recibirás instrucciones por email.";
  } catch (error) {
    console.error("Error al solicitar recuperación:", error);
    mensaje.textContent = "No se pudo solicitar la recuperación. Consulta al administrador.";
  }
});

