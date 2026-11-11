# Recuperación de acceso de MUEBLEX

> Antecedente del desarrollo o instrucciones de su paquete original. No volver a instalarlo ni aplicar SQL para actualizar este ZIP. El estado vigente y los pendientes se indican en [Estado actual de Melanova](docs/estado-actual-melanova.md). Las descripciones del proceso manual inicial son contexto del planteamiento, no hechos verificables desde el código.


Paquete adaptado al proyecto enviado después de la Guía 22. No copies los archivos
del ZIP antiguo `Administracion-y-WhatsApp-MUEBLEX.zip`.

## Qué añade

- En «¿Olvidaste tu contraseña?»: correo y elección de administrador.
- Mensaje preparado para WhatsApp; la persona abre el chat y pulsa Enviar.
- Cada administrador puede publicar o retirar un número de ayuda desde el panel.
- Búsqueda de usuarios por nombre o correo, con paginación.
- Restablecimiento por un administrador después de verificar la identidad.
- Contraseña temporal y cambio obligatorio antes de acceder al negocio.
- Historial de restablecimientos y cambios completados, sin contraseñas.

No añade eliminación de cuentas ni cambios de roles. `js/app.js` sigue siendo
el punto de entrada. Las categorías, ventas, pedidos, clientes y estilos anteriores
se conservan. No cambia las contraseñas de las cuentas existentes al instalar.

## Antes de instalar

1. Conserva el ZIP actual de tu proyecto como respaldo de archivos.
2. Extrae este paquete en una carpeta aparte. No lo copies todavía al proyecto.
3. El paquete contiene solo archivos nuevos o modificados, no una carpeta completa
   del proyecto. Combina carpetas al copiar; no borres las carpetas existentes.
4. No incluye ni sustituye `.git`, la configuración de conexión ni secretos.
5. No ejecutes el SQL antiguo de usuarios/WhatsApp ni repitas migraciones anteriores.

## Bloque 1 — Preparar Supabase

1. Abre `docs/sql/mejora-11-recuperacion-whatsapp.sql` de este paquete.
2. En el SQL Editor del proyecto correcto, crea una consulta nueva.
3. Copia y ejecuta TODO el archivo, incluida la transacción.
4. Si aparece un error, detente y comparte el mensaje. No ejecutes fragmentos sueltos:
   el script revierte los cambios si encuentra una incompatibilidad.
5. La consulta final debe mostrar los 12 nombres de funciones con `protegida = true`.

Este bloque añade el campo de WhatsApp y el historial. También protege las tablas
y funciones existentes contra operaciones de cuentas que todavía deben sustituir
su contraseña temporal. Conserva una copia de las definiciones anteriores de esas
funciones en el esquema privado `mueblex_respaldo`.

Las cuentas que ya existen conservan su acceso normal. La protección adicional
solo afecta a una cuenta cuando se restablece su contraseña con esta mejora.

## Bloque 2 — Instalar las funciones del servidor

En Supabase, abre Edge Functions:

1. Crea una función llamada EXACTAMENTE `gestionar-recuperacion`.
2. Sustituye el ejemplo por TODO el contenido de
   `supabase/functions/gestionar-recuperacion/index.ts` y despliega.
3. Abre la función EXISTENTE `registrar-usuario`, sustituye su contenido por la
   versión incluida en este paquete y vuelve a desplegarla. No la elimines.
4. Mantén la verificación JWT activada, igual que en tu función actual.

Se utilizan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`
del entorno de Supabase. Ninguna clave privada debe copiarse a los archivos de
la página ni enviarse por WhatsApp.

La actualización de `registrar-usuario` impide que una sesión anterior a un
restablecimiento o un administrador con cambio pendiente cree otras cuentas.

## Bloque 3 — Copiar los archivos al proyecto

Después de completar los bloques anteriores, copia el contenido de este paquete
en tu carpeta `sistema-ventas`, conservando las rutas y combinando carpetas.
Solo reemplaza los archivos incluidos que tengan el mismo nombre. No borres
ninguna carpeta ni `.git`.

Los archivos que ya existían y se reemplazan son:

- `index.html`
- `js/auth.js`
- `supabase/functions/registrar-usuario/index.ts`
- `README.md`

Los demás archivos son nuevos. `MANIFIESTO-RECUPERACION.json` enumera los archivos
y sus huellas para comprobar que el paquete corresponde a esta versión.

Abre Live Server y recarga con Ctrl+F5. Si no puedes entrar, revisa primero que el
SQL completo y ambas funciones Edge estén instalados; no reintroduzcas el app.js
antiguo. Este módulo comprueba el estado de recuperación antes de cargar los datos.

## Bloque 4 — Contactos de WhatsApp

1. Entra como administrador y abre Administración → Acceso de los usuarios.
2. Pulsa «WhatsApp de ayuda» en la cuenta de un administrador.
3. Escribe el código de país y el número, solo dígitos. Bolivia: 591 y los 8 dígitos.
4. Guarda. El nombre y número estarán visibles en la recuperación del login.
5. Repite con los demás administradores que recibirán solicitudes.
6. Deja el campo vacío y guarda para retirar un contacto.
7. Cierra sesión, abre «¿Olvidaste tu contraseña?» y elige cada administrador.
8. Comprueba que WhatsApp abre el destinatario correcto y el correo escrito.
   No necesitas enviar un mensaje para comprobar la selección.

La lista pública solo devuelve nombres y números publicados. No devuelve la lista
de vendedores ni confirma si el correo del solicitante existe.

## Bloque 5 — Restablecer y comprobar el acceso

Utiliza primero una cuenta de vendedor de prueba; no tus únicas credenciales de
administrador.

1. El administrador comprueba la identidad de la persona por un medio conocido.
   Escribir un correo en WhatsApp no demuestra ser propietario de esa cuenta.
2. Busca su nombre o correo y pulsa «Restablecer contraseña».
3. Escribe dos veces una contraseña temporal nueva, de al menos 12 caracteres.
4. Marca que verificaste la identidad y guarda.
5. Entrega la contraseña en privado. El sistema no la envía automáticamente,
   no la guarda en el historial ni permite consultarla posteriormente.
6. El usuario entra con esa contraseña. Solo debe aparecer «Crea tu nueva contraseña».
7. Debe escribir la temporal y dos veces una contraseña personal distinta.
8. Al completarlo, vuelve a iniciar sesión con la nueva. La temporal ya no sirve.
9. El administrador actualiza el historial: debe ver el restablecimiento y el cambio
   completado, con sus responsables.
10. Si una respuesta falla por conexión, actualiza el historial antes de repetir.
    La contraseña nunca se conserva en los formularios tras un intento de guardado.

Para cambiar tu propia contraseña, utiliza el formulario existente «Cambiar
contraseña». Un administrador que olvidó la suya solicita ayuda a otro. Si ninguno
puede entrar, deberá intervenir el propietario del proyecto desde Supabase.

El cambio obligatorio de esta mejora se aplica a los RESTABLECIMIENTOS. No fuerza
un cambio masivo de las cuentas existentes ni modifica el alta actual de cuentas.

## Bloque 6 — Comprobar los permisos y la integración

- Administrador normal: lista, búsqueda, contactos, historial y registro de usuarios.
- Vendedor normal: panel de recuperación oculto; mantiene sus funciones habituales.
- Cuenta con contraseña temporal: sin acceso a inventario, ventas ni demás datos.
- Intento directo de `consultar_resumen_negocio` desde una cuenta con contraseña
  temporal: debe ser rechazado, aunque se intente desde la consola.
- Vendedor llamando `gestionar-recuperacion` con `accion: "listar"`: debe dar 403.
- Sin sesión, la función de gestión debe ser rechazada; la consulta pública de
  contactos sí debe funcionar.
- Comprobar que los enlaces preparados desaparecen al cambiar correo o destinatario.
- Verificar en móvil los diálogos y el desplazamiento horizontal de las tablas.
- Comprobar lectura de inventario, clientes, categorías, historiales y reportes
  con las cuentas habituales. Utiliza los datos de prueba para cualquier prueba
  que registre ventas, pagos o pedidos; no hace falta modificar datos reales.

Las sesiones anteriores al restablecimiento quedan sin acceso a las operaciones
protegidas. La pantalla ya abierta puede conservar información que había cargado:
no se promete borrar a distancia lo que un dispositivo ya mostró.

Las cuentas con MFA/verificación adicional quedan fuera de este restablecimiento
por contraseña: la función pide asistencia al responsable de Supabase.

## Validación del paquete

- 48 pruebas del código real del servidor con Supabase simulado.
- 36 pruebas del módulo real con DOM y Supabase simulados.
- Sintaxis de los JavaScript y de las dos funciones TypeScript comprobada con Node.
- Recursos locales, conservación de IDs y cobertura de las RPC del negocio revisados.

La preparación inicial no ejecutó cambios en Supabase. Posteriormente el usuario
instaló el SQL y las funciones y realizó las pruebas documentadas en
`docs/recuperacion-whatsapp.md`. Se corrigió un conflicto de nombres del historial
y se adaptaron las tablas a tarjetas móviles. Las comprobaciones adicionales
no realizadas están identificadas allí. El navegador automatizado no pudo
iniciarse en el entorno de preparación; la revisión visual fue realizada por
el usuario mediante capturas.

Para repetir las pruebas locales, desde la raíz del proyecto:

```bash
node tests/recuperacion-servidor.cjs
node tests/recuperacion-interfaz.cjs
```

## Guardado y futuras mejoras

Guarda en Git al terminar la instalación y las pruebas. Este paquete no hace commit,
push ni publica la web. Se puede utilizar con Live Server y después con Netlify.

Una función RPC nueva que maneje datos del negocio debe llamar a
`public.exigir_acceso_mueblex()` y mantener sus comprobaciones de rol. Si vuelves a
ejecutar una migración antigua que reemplace una RPC protegida, revisa que conserve
ese control. Las funciones originales respaldadas son referencia para recuperación;
no se deben restaurar sin revisar las protecciones añadidas.


## Instalación existente comprobada

Si ya aplicaste el SQL, desplegaste las dos funciones y probaste la recuperación
con asistencia en el chat, este paquete de cierre solo sincroniza archivos y
documentación. No repitas los pasos de instalación ni ejecutes nuevamente los
SQL. Conserva el archivo `mejora-11b-corregir-historial-recuperacion.sql` como
registro de la corrección ya aplicada.
