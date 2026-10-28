# Guía 3 — Análisis de requerimientos de Mueblex

Actualización: 28/10/2026.

## Alcance

Mueblex es una aplicación web interna para una mueblería de melamina. Administrador y vendedores gestionan muebles terminados, clientes, ventas, pedidos a medida, cobros y entregas. El catálogo de Inicio pertenece al panel interno; no es una tienda pública.

## Requerimientos funcionales (RF)

- **RF-01:** Registrar muebles de catálogo con nombre, categoría, precio positivo y existencia inicial entera no negativa.
- **RF-02:** Consultar nombre, precio y existencias, con búsqueda por nombre.
- **RF-03:** Registrar ventas de varios muebles de stock o pedidos a medida, con anticipo opcional, como operaciones indivisibles y con el usuario de la sesión.
- **RF-04:** Consultar por período las operaciones activas, el valor vendido, los cobros originales, las devoluciones y el neto cobrado, diferenciados por método.
- **RF-05:** Consultar el sistema desde un navegador de celular cuando exista una dirección accesible y una cuenta autorizada.
- **RF-06:** Mostrar existencias agotadas cuando son cero y stock bajo entre una y tres unidades.
- **RF-07:** Generar comprobantes internos de ventas y pedidos y notas para el taller, imprimibles o guardables como PDF desde el navegador.
- **RF-08:** Registrar y editar nombre, contacto y dirección del cliente; reservar su eliminación al administrador y conservar las relaciones históricas.
- **RF-09:** Consultar historiales paginados y detalles de ventas y pedidos con responsables, muebles, cobros, saldo, estados y devoluciones.
- **RF-10:** Registrar abonos o saldos con método, fecha y usuario responsable; comprobar el saldo en el servidor y conservar la coherencia entre pago y estado.
- **RF-11:** Avanzar cada mueble de un pedido activo por pendiente, en fabricación, listo y entregado, conservando el historial de estados.
- **RF-12:** Guardar por pedido retiro en tienda o entrega a domicilio, receptor, contacto y, cuando corresponda, dirección y referencia.
- **RF-13:** Editar únicamente el precio mediante la función autorizada y registrar reposiciones positivas con motivo, responsable, fecha y existencias anterior y nueva.
- **RF-14:** Anular operaciones con motivo, fecha y responsable; conservar pagos, devolver el stock elegible y registrar la devolución completa del dinero cobrado cuando corresponda.
- **RF-15:** Crear cuentas autorizadas mediante el servicio de administración de usuarios y asociarlas con su perfil y rol.
- **RF-16:** Conservar en el navegador solicitudes enviadas de ventas, pedidos y cobros cuyo resultado quede incierto y permitir confirmarlas con el mismo identificador.

## Requerimientos no funcionales (RNF)

- **RNF-01 — Usabilidad:** formularios con validaciones, mensajes de resultado, estados de carga y prevención de reenvíos durante el procesamiento.
- **RNF-02 — Disponibilidad:** ejecución en un navegador moderno, sin instalar una aplicación; las operaciones del servidor requieren conexión. La recuperación de una solicitud no equivale a operar completamente sin Internet.
- **RNF-03 — Seguridad:** acceso mediante Supabase Auth y perfiles autorizados; comprobar roles y permisos en el servidor y aplicar RLS. Ocultar controles no sustituye la autorización.
- **RNF-04 — Compatibilidad:** uso en computadora y celular; verificar navegación, tablas y formularios en dispositivos reales. La accesibilidad remota y la validación móvil siguen pendientes de comprobación.
- **RNF-05 — Integridad:** registrar atómicamente las operaciones comerciales y manejar importes con hasta dos decimales. El servidor comprueba existencias y saldos actuales.
- **RNF-06 — Trazabilidad:** conservar responsables, fechas, pagos, anulaciones, devoluciones, movimientos de reposición y cambios de taller. Los registros históricos anteriores a estas mejoras pueden carecer de algunos datos.

## Reglas de negocio

- Las ventas de catálogo descuentan stock al registrarse; los pedidos a medida no descuentan ese inventario.
- Una venta de stock se registra inicialmente pendiente de cobro. Sus pagos se registran desde el detalle.
- Un pedido puede recibirse sin anticipo, con anticipo o con pago completo.
- Los reportes excluyen las operaciones anuladas del valor vendido y mantienen los cobros originales y las devoluciones como movimientos separados.
- Los períodos monetarios utilizan el horario de Bolivia. El neto cobrado no representa ganancia: no descuenta costos ni gastos.
- Anular no borra la operación ni sus pagos. Una venta de stock con dinero cobrado requiere confirmar la devolución del dinero y la recuperación de los muebles en condiciones de volver al inventario.
- La aplicación registra la devolución que el personal realizó; no transfiere dinero al cliente.
- El avance de taller es secuencial. Una política de entrega condicionada al pago completo requiere una definición adicional; no se presenta como restricción ya implementada.
- El formulario de entrega guarda información del pedido; no reemplaza automáticamente la dirección de la ficha del cliente.

## Restricciones

- Tecnologías: HTML, CSS, JavaScript y Supabase.
- Mantener el proyecto dentro de las capacidades del plan gratuito utilizado.
- La recuperación local depende del mismo navegador, cuenta y dirección de la aplicación. Borrar sus datos elimina las referencias locales, sin borrar las operaciones guardadas en Supabase.
- El control detallado de planchas, cortes, tornillos y otros insumos del taller queda fuera del alcance actual.

## Priorización (MoSCoW)

- **Debe tener:** RF-01, RF-02, RF-03, RF-08, RF-10, RF-15 y seguridad e integridad de operaciones.
- **Debería tener:** RF-04, RF-09, RF-11, RF-12, RF-13, RF-14 y RF-16.
- **Podría tener:** RF-05, RF-06 y RF-07. El sistema ya incluye alertas e impresión; esta clasificación conserva su prioridad inicial, no significa que estén pendientes.
- **No por ahora:** catálogo público, pagos en línea, insumos detallados del taller y devoluciones parciales.

## Verificación y límites

Las pruebas manuales compartidas comprobaron registro y recuperación después de desconexión de una venta, un pedido con anticipo y pagos posteriores; también mostraron anulaciones, devoluciones, stock y reportes. No sustituyen una batería formal de concurrencia, pérdida de respuesta después de confirmar el servidor, dispositivos y despliegue. Estos casos se documentan para su verificación posterior.

## Reflexión

Se mantienen RF-01 a RF-07 y se incorporan RF-08 a RF-16 para representar las mejoras del negocio. El valor vendido, el movimiento de caja y el avance de fabricación se documentan por separado para evitar confundir sus resultados.
