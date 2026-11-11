# Guía 22 — Preparación de Mueblex para publicación

> Registro histórico de esta etapa. Las fechas, cantidades de pruebas y pendientes que aparecen abajo corresponden a su momento; no son una certificación de la versión actual. Consulta [estado-actual-melanova.md](estado-actual-melanova.md) para el estado consolidado.


## Estado

Guía cerrada por el usuario y publicada posteriormente según las evidencias de las guías 23 y 24. Los apartados siguientes conservan verificaciones realizadas en su etapa. No certifican por sí solos la configuración remota actual. Estado consolidado en [estado-actual-melanova.md](estado-actual-melanova.md).

## Actividad A — Seguridad

- Se comprobó que la clave de `js/supabase-client.js` tiene rol `anon`.
- La búsqueda realizada en 69 archivos de texto versionados del proyecto actual no detectó contraseñas literales ni claves privadas. Esta búsqueda no certifica las contraseñas de las cuentas ni el historial completo de Git.
- La consulta de Supabase confirmó RLS activo en las 11 tablas públicas de Mueblex.
- Se revisaron las 17 políticas exportadas y los permisos efectivos de `anon` y `authenticated`.
- Se retiró TRUNCATE de `categorias`, `clientes`, `productos` y `usuarios`. La consulta posterior confirmó `false` en las 22 combinaciones de tabla y rol. El ajuste aplicado se conserva en `docs/sql/22-retirar-truncate.sql`.
- Las 13 funciones exportadas bloquean la ejecución directa de `anon`. Las 11 funciones operativas permiten ejecución con sesión; las dos funciones de disparadores bloquean la ejecución directa de ambos roles.
- Se revisaron las validaciones internas de sesión y rol. Registrar muebles, cambiar precios, reponer stock y anular operaciones requieren administrador. Ventas, pedidos, cobros, taller, entregas y reportes verifican los roles administrador o vendedor.

## Administración de categorías solicitada para el negocio

Se añadió en Administración un formulario de nombre y una tabla con acciones Editar. El panel se muestra al administrador. Los vendedores conservan la consulta de categorías.

El ajuste `docs/sql/22-categorias-administrador.sql` retira la escritura directa de los roles de la aplicación y añade `guardar_categoria_segura`, que valida sesión y perfil administrador en Supabase. Cambiar el nombre conserva el identificador y la descripción de la categoría, así como las asociaciones existentes de los muebles.

Se comprueban nombres vacíos y duplicados sin distinguir mayúsculas al crear o renombrar. Una creación repetida devuelve la categoría existente. Las escrituras se serializan y las ediciones incluyen el nombre anterior para detectar cambios concurrentes. Si la respuesta del guardado es incierta, el formulario pide actualizar la lista antes de continuar.

La lista de Administración actualiza también el selector de categorías de Inventario, conservando la selección actual.

### Lista de comprobación inicial — resuelta después según las pruebas reales

- Aplicar el SQL de categorías y comprobar los permisos resultantes.
- Comprobar creación y edición con administrador y rechazo con vendedor y sin sesión.
- Comprobar el selector de Inventario y la presentación móvil.
- Comprobar que las cuentas activas utilizan contraseñas adecuadas y revisar la configuración de altas de cuentas.
- Confirmar la configuración y el funcionamiento de la función de servidor que registra usuarios.

## Estado actualizado de la guía

- Seguridad, categorías y registro de cuentas: revisados según
  las pruebas documentadas más abajo.
- Datos de prueba: se conservarán durante las verificaciones.
- README y rutas: revisados.
- Alojamiento elegido: Netlify.
- Reflexión incluida al final; cierre en Git realizado por el usuario antes de continuar con la Guía 23.

Antes de publicar:

- El usuario confirmó el cambio de las contraseñas antes de publicar. Sus valores no se verifican ni se guardan en este documento.

Antes de ingresar datos reales:

- Preparar un respaldo de Supabase y autorizar una limpieza
  controlada de los datos de prueba.

## Verificación local del paquete de categorías

Se comprobaron la sintaxis de los 12 archivos JavaScript, las rutas locales de scripts y estilos, la conservación de los identificadores HTML anteriores y la asociación de etiquetas y campos.

Pasaron 32 comprobaciones con un DOM y respuestas de Supabase simulados sobre las funciones y eventos reales del módulo. Incluyeron carga por rol, creación, renombrado, conservación de la selección de Inventario, duplicados, cancelación, nombres vacíos, representación de texto HTML, conflictos de edición, respuesta incierta, fallo de consulta posterior al guardado y bloqueo de doble envío.

Estas comprobaciones no ejecutaron el SQL en la base real. El navegador de pruebas no pudo iniciarse en el entorno de preparación. En ese momento quedaban pendientes la comprobación visual, el SQL y las cuentas reales; sus resultados posteriores se registran en los siguientes apartados.

### Pruebas reales de administración de categorías

Se aplicó el SQL y se comprobó que los roles de la aplicación carecen de escritura directa sobre categorías. La función de guardado exige un perfil administrador.

Con administrador se comprobó la creación, el cambio de nombre, su actualización en el selector de Inventario y el rechazo de duplicados.

Con vendedor, el panel permanece oculto y Supabase rechaza los intentos directos de crear y editar. Sin sesión, la ejecución fue rechazada con HTTP 401, código 42501 y resultado null.

En la vista móvil de 390 × 844, el formulario, la tabla y los botones caben en el ancho mostrado.

### Registro de cuentas y acceso del personal

Se desactivó el registro público de cuentas en Supabase.

Con administrador se creó la cuenta “Vendedor prueba Guía 22”. La cuenta pudo iniciar sesión y sus paneles de administración de usuarios y categorías quedaron ocultos.

Desde esa cuenta se intentó llamar directamente a `registrar-usuario` con una solicitud vacía. El servidor rechazó la llamada con HTTP 403, resultado null y mensaje “No autorizado”.

La decisión inicial fue posponer las contraseñas; el usuario confirmó su cambio antes de la publicación de la Guía 23.

### Actividad B — Datos de prueba

El usuario confirmó que todos los datos actuales de Supabase son de prueba. Todavía no se han ingresado operaciones reales del negocio.

Se conservarán durante las verificaciones restantes. Antes de cargar datos reales, se preparará un respaldo de la base de datos y se revisará una limpieza controlada.

La limpieza sigue pendiente de preparación y autorización. Un ZIP del proyecto respalda los archivos del código, pero no sustituye el respaldo de los datos de Supabase.

### README y rutas

Se actualizó el README con las funciones, roles, tecnologías, estructura y estado actual de Mueblex.

Se verificaron sus seis enlaces de documentación. También se comprobaron 25 recursos locales de index.html y 3 referencias locales de los CSS. Todos los archivos referenciados existen y sus rutas son relativas.

### Plataforma elegida para publicar

Se utilizará Netlify para publicar Mueblex porque permite alojar
HTML, CSS y JavaScript y conectarse con GitHub para actualizar el sistema.

Supabase seguirá gestionando los usuarios y la base de datos.

Se comenzará con el plan gratuito, controlando su consumo mensual.
Más adelante se podrá trasladar la web a Cloudflare Pages si conviene.

### Reflexión final

El punto más fácil de pasar por alto fue revisar los permisos
reales de la base de datos. Tener RLS activo y ocultar botones
al vendedor no bastaba para comprobar toda la seguridad.

La revisión permitió detectar y retirar el permiso TRUNCATE,
que podía permitir vaciar tablas, y comprobar que el servidor
rechaza acciones que requieren un administrador.
