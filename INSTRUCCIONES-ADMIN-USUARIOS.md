# Integración del login y registro administrativo

- **Recordarme** activado: sesión persistente en este navegador (localStorage). Desactivado: sesión de esta pestaña (sessionStorage), conservada al recargar pero normalmente perdida al cerrar la pestaña. El selector no guarda la contraseña directamente.
- Se quitó el enlace **Sign up** público. La recuperación de contraseña sigue disponible.
- Dentro de la aplicación aparece **Administrar usuarios** únicamente cuando el rol consultado es `administrador`.
- **Para que registrar usuarios funcione**, hay que desplegar `supabase/functions/registrar-usuario/index.ts` en el proyecto Supabase correspondiente, con verificación JWT activa, y configurar el secreto de servidor `SUPABASE_SERVICE_ROLE_KEY` en Supabase (no en el código del navegador). Por ejemplo, con la CLI de Supabase vinculada al proyecto, `supabase functions deploy registrar-usuario`.
- La función verifica el JWT del solicitante y comprueba el rol en `public.usuarios` desde el servidor; crea el usuario en Auth y su vínculo con `public.usuarios`. Si falla el segundo paso, intenta revertir la cuenta Auth. Los roles permitidos son `administrador` y `vendedor`.
- **Verificar antes de usar:** que la tabla `public.usuarios` acepte INSERT con `id_auth`, `nombre`, `correo` y `rol`, y que `id_usuario` sea generado automáticamente (o tenga un valor predeterminado). Si hay columnas obligatorias adicionales, ajustar la función. La función todavía no está desplegada en tu proyecto remoto.
- **Seguridad:** ocultar el formulario no es una barrera de seguridad; la comprobación del rol debe realizarse en el servidor, como aquí. No publiques nunca la `service_role` en HTML o JS del navegador.
- No se cambiaron las políticas RLS existentes ni se borraron pantallas de ventas.
