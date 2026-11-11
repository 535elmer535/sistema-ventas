# Guía 21 — Refactorización de Mueblex

> Registro histórico de esta etapa. Las fechas, cantidades de pruebas y pendientes que aparecen abajo corresponden a su momento; no son una certificación de la versión actual. Consulta [estado-actual-melanova.md](estado-actual-melanova.md) para el estado consolidado.


## Actividad A — Identificar duplicación y código sin uso

- **Patrón repetido.** El inventario y la lista de ventas del reporte usan `map(...).join("")` para convertir registros en fragmentos de HTML y unirlos. Los bloques terminan en las líneas 300 y 2056 de `js/app.js`.
- **Función en uso.** `probarClientes()` tiene un nombre que parece de prueba, pero se llama al abrir la aplicación después de iniciar sesión y en otros puntos del sistema.
- **Mensajes de consola.** No se encontraron coincidencias de `console.log` en `js/app.js`. El `console.error` de la línea 302 ayuda a diagnosticar fallos al cargar el inventario.

- **Posible código sin uso.** `validarEdicionProducto()` está definida en `js/app.js`, línea 1413. La búsqueda en el proyecto encontró su definición y una mención en la documentación de la Guía 17. El formulario actual valida el precio directamente. Se deja anotada para la revisión de la Actividad C.

- **Recuperación de operaciones.** Las ventas, los pedidos y los cobros repiten un patrón: generan un identificador y guardan la solicitud en el navegador antes de enviarla a Supabase. Al reorganizar el código, se debe conservar la recuperación de cada operación con el mismo identificador.

## Actividad B — Avance de la separación del código

Se conectaron `utils.js` y `auth.js` en `index.html`, antes de `app.js`.

- En `utils.js` se trasladaron `escaparHTML()` y `manejarError()`.
- En `auth.js` se trasladaron las funciones de mostrar el login, mostrar la aplicación, comprobar la sesión y consultar el nombre y rol del usuario. También se movieron los bloques de inicio y cierre de sesión, Recordarme, cambio de contraseña, registro de usuarios y recuperación de contraseña.
- La llamada `iniciar();` permanece en `app.js`.

Se comprobaron el inicio y cierre de sesión, la recarga con sesión y sin sesión, Recordarme y la carga de Inventario, Clientes y Reportes. También se verificaron los mensajes de contraseñas diferentes, campos obligatorios y recuperación con correo vacío. Las capturas se guardaron en `diagramas`.

Quedan pendientes las pruebas de cambio efectivo de contraseña, registro de una cuenta nueva, envío del correo de recuperación y acceso con otro rol.

La Actividad B continúa. Todavía falta organizar productos, ventas y las demás operaciones de Mueblex.

### Avance de productos e inventario

Se conectó `productos.js` en `index.html`, antes de `app.js`.

Se trasladaron la lista `productosCache`, las variables de control del registro de muebles y los siguientes bloques:

- Selector de productos y carga del inventario.
- Clasificación del stock.
- Preparación y envío del formulario de registro de muebles.
- Apertura de la edición y guardado del precio.
- Eliminación con confirmación.

Se comprobaron la carga del inventario, el selector de Ventas, las categorías y los estados del stock. También se verificó el rechazo de un nombre formado solo por espacios.

Se guardó el precio existente de “Mueble de prueba sin stock”. El sistema confirmó la actualización y conservó el precio de Bs 120 y la existencia de 4 unidades.

Se probó Cancelar en el aviso de eliminación y se confirmó que el mueble permaneció en la tabla.

Quedan pendientes las pruebas de registro válido y eliminación efectiva de un mueble. La organización del inventario continúa.

### Corrección visual del resaltado

Se trasladó `resaltarFilaEditada()` a `utils.js` porque la utilizan productos y clientes.

Durante la prueba, el resaltado verde quedaba cubierto por los fondos de las celdas. Se ajustó la función para animar cada celda de la fila.

Después del ajuste, se confirmó que el resaltado aparece durante un segundo al guardar el precio existente de “Mueble de prueba sin stock”, Bs 120.

Este ajuste visual se realizó durante la Actividad B, además del traslado del código.

### Avance de reposiciones y funciones compartidas

Se trasladaron a `productos.js` las funciones, variables y eventos del formulario de reposición y de su historial.

Se comprobó que seleccionar distintos muebles actualiza la existencia consultada. La validación rechazó un motivo formado solo por espacios antes de enviar la reposición.

El historial carga sus registros y responde al botón Actualizar historial. La captura `diagramas/guia21-productos-historial-reposiciones.png` muestra fechas, horas y ningún error rojo visible en la consola.

También se trasladaron `importeEnCentavos()` y `fechaHistorialMueblex()` a `utils.js`, porque las utilizan varias operaciones.

Quedan pendientes las pruebas de una reposición efectiva y de recuperación de una solicitud pendiente después de la reorganización.

### Cierre de los traslados de la Actividad B

El código se organizó en archivos por responsabilidad:

- `utils.js` contiene funciones compartidas.
- `auth.js` contiene sesión, cuentas, contraseñas y consulta del rol.
- `productos.js` contiene inventario, registro de muebles, edición de precio y reposiciones.
- `ventas.js` contiene ventas, pedidos a medida, cobros, reportes, taller, entregas, comprobantes y anulaciones.
- `clientes.js` contiene las operaciones de clientes. Se añadió para adaptar la organización de la guía a Mueblex.

Se actualizó el orden de carga en `index.html`. Los bloques trasladados se compararon con la versión de la Guía 20 y se comprobó su sintaxis.

Las pruebas realizadas confirmaron la carga de los módulos, las listas temporales de ventas y pedidos, los historiales y detalles, las vistas de impresión y la apertura de formularios. En Clientes se comprobó la carga de la lista, la apertura y cancelación de edición, los campos obligatorios y el selector de clientes en Pedidos.

`app.js` conserva la llamada `iniciar();` y la función `validarEdicionProducto()`, pendiente de resolver en la Actividad C.

La validación funcional continúa en la Actividad C, incluidos CP-01, CP-02 y CP-04. Las operaciones efectivas y las recuperaciones pendientes no se consideran aprobadas por las pruebas de apertura de formularios.

## Actividad C — Limpieza y pruebas

Se retiró `validarEdicionProducto()` después de comprobar que no tenía llamadas. El formulario actual valida el precio directamente en `productos.js`. `app.js` quedó como punto de entrada con `iniciar();`.

### CP-01 — Venta válida de stock

**Resultado: aprobado.**

Con la cuenta “vendedor de prueba” se registró la venta 20 del producto 6, “Mueble de prueba sin stock”.

- Existencia inicial: 4 unidades.
- Cantidad vendida: 2 unidades.
- Precio unitario: Bs 120.
- Total: Bs 240.
- Existencia final: 2 unidades.
- Operación activa, pago pendiente y cero cobros.
- La lista temporal quedó vacía y su total volvió a cero.

El detalle de Mueblex y la consulta en Supabase confirmaron los valores y el responsable de la venta.

Las cinco capturas de evidencia se guardaron en `diagramas` con el prefijo `guia21-cp01-`.

Esta prueba creó una venta real de prueba y descontó dos unidades del inventario.

### CP-02 — Pedido a medida con anticipo

**Resultado: aprobado.**

Con la cuenta “vendedor de prueba” se registró el pedido asociado a la venta 21 para el cliente santiago.

- Mueble: Repisa de prueba del plan.
- Medidas: 40 × 60 × 25 cm; color blanco.
- Cantidad: 1; precio y total: Bs 200.
- Entrega estimada: 11/11/2026.
- Un anticipo de Bs 50 en efectivo, registrado por el vendedor de la sesión.
- Saldo pendiente: Bs 150.
- Operación activa y estado de pago `anticipo_cobrado`.

Supabase confirmó el pedido, sus especificaciones, un solo pago de Bs 50 y `stock_descontado = false`. Las consultas anteriores y posteriores mostraron las mismas existencias en los ocho productos del catálogo.

La lista temporal se vació después de confirmar el pedido.

Esta prueba creó un pedido y registró un anticipo de prueba en la base de datos.

### CP-04 — Impedir registrar una venta sin sesión

**Resultado: aprobado.**

Después de cerrar sesión y recargar, Mueblex mostró el formulario de ingreso.

Se intentó registrar una venta del producto 6, cantidad 1 y precio de Bs 120, mediante el cliente de Supabase sin sesión.

- Solicitud: `32fadeae-54b2-4866-9324-6139752cb107`.
- Sesión activa: false.
- El servidor rechazó la llamada con HTTP 401 y código 42501, permiso denegado para `registrar_venta_stock`.
- Resultado de la llamada: null.
- La consulta en Supabase confirmó cero ventas con ese identificador.
- La existencia del producto 6 permaneció en 2 unidades.

Se completaron CP-01, CP-02 y CP-04 después de reorganizar el código.

### Cierre de la Actividad C

Se revisaron los nombres de las funciones y se conservaron las convenciones del proyecto. No se encontraron `console.log` de depuración en los módulos reorganizados.

Se retiró la función sin llamadas `validarEdicionProducto()`. Los controles actuales del formulario de precio permanecen en `productos.js`.

CP-01, CP-02 y CP-04 quedaron aprobados con comprobaciones en Mueblex y Supabase.

## Decisión sobre el reto de tablas

Se decidió omitir `llenarTabla()`. En el código actual de Mueblex, el beneficio de compartir ese pequeño fragmento es reducido. Se conserva la construcción de las tablas dentro de sus módulos.

La guía se utiliza como referencia. Los cambios se evalúan según su utilidad para el proyecto real.

## Reflexión sobre el arranque

`app.js` llama a `iniciar()`, que comprueba la sesión. Cuando existe una sesión válida, `mostrarApp()` prepara el sistema y carga sus datos, incluido el inventario mediante `cargarProductos()`.

La carga del inventario pertenece a ese flujo porque se necesita tanto al recuperar una sesión existente como al iniciar sesión desde el formulario. Si se ejecutara directamente al arrancar `app.js`, podría consultar los productos antes de comprobar la sesión y faltaría coordinar su carga después del ingreso del usuario.


## Apartado 3.8 — Mejoras evaluadas para Mueblex

Se añadieron comentarios de cabecera a `auth.js`, `clientes.js`, `productos.js`, `ventas.js` y `utils.js`. Indican la responsabilidad de cada módulo para facilitar la localización de código durante el mantenimiento. `app.js` ya contaba con su comentario de punto de entrada.

Se revisaron los mensajes repetidos. Por ejemplo, el aviso de cambio de sesión aparece en varios flujos de `ventas.js`, y el aviso de nombre y teléfono se repite en `clientes.js`. Por ahora se conserva su organización dentro de esos módulos. Crear un archivo global `constantes.js` aportaría un beneficio reducido para esta distribución, por lo que se pospone hasta que exista una necesidad concreta de mantener mensajes compartidos entre módulos.

La aplicación de la reorganización al proyecto propio ya se realizó sobre Mueblex, conservando sus operaciones de muebles de melamina y adaptando la estructura con `clientes.js`.

### Comprobaciones del paquete de actualización

- Se comprobó la sintaxis de todos los archivos JavaScript de la carpeta `js`.
- En los cinco módulos comentados, el contenido anterior se conserva exactamente después de las cabeceras añadidas.
- Los demás archivos del proyecto se conservaron sin cambios, salvo esta actualización del documento.
- No se ejecutaron nuevas operaciones en Supabase durante la preparación del ZIP. Las pruebas funcionales registradas en los apartados anteriores corresponden a las realizadas con el usuario antes de añadir las cabeceras.
- Esta era la tarea de cierre de ese bloque. El usuario realizó después el commit y push de la Guía 21, antes de las guías 22 a 24. El nuevo ZIP necesita guardado propio al terminar la revisión.
