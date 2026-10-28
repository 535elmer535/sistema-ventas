# Guía 4 — Historias de usuario de Mueblex

Actualización: 28/10/2026.

## Historias y criterios de aceptación

### HU-01

Como vendedor, quiero registrar ventas y pedidos con sus muebles y pagos iniciales.

- Requerimiento: **RF-03**.
- Caso de uso: **CU-01**.
- Aceptación: Una venta descuenta stock vigente en el servidor; un pedido guarda especificaciones y anticipo sin descontar stock de catálogo.

### HU-02

Como vendedor, quiero consultar existencias antes de ofrecer un mueble.

- Requerimiento: **RF-02**.
- Caso de uso: **CU-02**.
- Aceptación: La consulta muestra la existencia almacenada; si falla, informa el error.

### HU-03

Como administrador, quiero registrar muebles de catálogo para mantener el inventario de la tienda.

- Requerimiento: **RF-01**.
- Caso de uso: **CU-03**.
- Aceptación: El administrador registra desde la aplicación; el vendedor no tiene autorización para hacerlo.

### HU-04

Como administrador, quiero distinguir lo vendido, lo cobrado y lo devuelto para revisar la caja.

- Requerimiento: **RF-04**.
- Caso de uso: **CU-04**.
- Aceptación: La fecha de venta determina el valor vendido; la fecha de cada cobro o devolución determina su movimiento. El neto es cobros menos devoluciones y puede ser negativo.

### HU-05

Como administrador, quiero revisar el negocio desde mi celular.

- Requerimiento: **RF-05**.
- Caso de uso: **CU-05**.
- Aceptación: Verificar el despliegue accesible y la navegación en un dispositivo real; sigue pendiente esa comprobación.

### HU-06

Como vendedor, quiero identificar muebles con pocas unidades para informar su reposición.

- Requerimiento: **RF-06**.
- Caso de uso: **CU-06**.
- Aceptación: El inventario muestra Agotado, Stock bajo o Disponible según la existencia; no envía notificaciones automáticas.

### HU-07

Como vendedor, quiero imprimir comprobantes y especificaciones para el taller.

- Requerimiento: **RF-07**.
- Caso de uso: **CU-07**.
- Aceptación: Reimprimir no registra otra operación. Se identifican anulaciones y devoluciones; la nota del taller no incluye importes comerciales.

### HU-08

Como vendedor, quiero mantener los datos de los clientes para atenderlos y contactarlos.

- Requerimiento: **RF-08**.
- Caso de uso: **CU-09**.
- Aceptación: La dirección puede estar vacía; un pedido utiliza un cliente registrado con contacto. Una eliminación puede ser rechazada por relaciones existentes.

### HU-09

Como vendedor, quiero revisar el detalle de las operaciones registradas.

- Requerimiento: **RF-09**.
- Caso de uso: **CU-12**.
- Aceptación: Ver detalle muestra los datos de la operación seleccionada y permite distinguir activa de anulada.

### HU-10

Como vendedor, quiero registrar pagos posteriores para actualizar el saldo del cliente.

- Requerimiento: **RF-10**.
- Caso de uso: **CU-13**.
- Aceptación: Se rechazan importes no positivos, superiores al saldo y cobros de operaciones anuladas; se conserva el historial de pagos.

### HU-11

Como vendedor, quiero actualizar el avance del taller para conocer el estado del pedido.

- Requerimiento: **RF-11**.
- Caso de uso: **CU-14**.
- Aceptación: El avance respeta la secuencia; registra usuario, fecha y estados anterior y nuevo. No se avanza un pedido anulado.

### HU-12

Como vendedor, quiero guardar quién recibe el pedido y dónde se entrega.

- Requerimiento: **RF-12**.
- Caso de uso: **CU-09, CU-14**.
- Aceptación: Los datos se conservan al recargar. La dirección es obligatoria para domicilio y los cambios concurrentes se controlan mediante una versión.

### HU-13

Como administrador, quiero actualizar precios y registrar ingresos de muebles con trazabilidad.

- Requerimiento: **RF-13**.
- Caso de uso: **CU-10**.
- Aceptación: La edición de precio no altera el stock. La reposición tiene historial y reutiliza la misma solicitud si requiere recuperación.

### HU-14

Como administrador, quiero anular una operación conservando sus movimientos para corregirla sin perder el historial.

- Requerimiento: **RF-14**.
- Caso de uso: **CU-15**.
- Aceptación: El vendedor no anula. Si hay cobros se registra su devolución completa; no se admiten devoluciones parciales ni anular pedidos ya entregados en este flujo.

### HU-15

Como administrador, quiero crear cuentas de trabajo con los permisos correspondientes.

- Requerimiento: **RF-15**.
- Caso de uso: **CU-11**.
- Aceptación: La interfaz utiliza la función registrar-usuario; la autorización debe verificarse también en el servidor.

### HU-16

Como vendedor, quiero recuperar una operación pendiente después de una interrupción sin registrarla de nuevo.

- Requerimiento: **RF-16**.
- Caso de uso: **CU-16**.
- Aceptación: La referencia se conserva por cuenta en el mismo navegador y origen. Al recuperar, se reutilizan los datos originales y se libera la referencia al confirmar o recibir un rechazo definido.

## Acceso y permisos

El inicio y cierre de sesión se documentan en CU-08 y RNF-03 como regla transversal. Tanto el administrador como el vendedor acceden con su propia cuenta. Registro de muebles, cambios de precio, reposiciones, creación de usuarios y anulaciones están reservados al administrador; el vendedor realiza las consultas y operaciones comerciales autorizadas.

## Backlog de verificación

1. Conservar evidencias de los flujos ya comprobados: operaciones, pagos, devoluciones, inventario y recuperación tras desconexión.
2. Completar pruebas de pérdida de respuesta después de una confirmación del servidor, acceso simultáneo y uso desde distintas cuentas.
3. Verificar acceso desde una dirección desplegada y navegación en celulares reales.
4. Revisar reglas futuras: entrega con saldo, correcciones de taller, ajustes de inventario y devoluciones parciales.

## Límites de la recuperación

HU-16 conserva solicitudes que se intentaron enviar. No guarda de forma general todos los campos que se escriben antes del envío, ni sincroniza pendientes entre computadoras. No debe describirse como un sistema completo de trabajo sin conexión.

## Reflexión

Se conservaron HU-01 a HU-07 y se ampliaron las historias hasta HU-16. Cada historia se vincula con un requerimiento y un caso de uso. Los criterios describen qué verificar y distinguen las funciones del código de las comprobaciones todavía pendientes.
