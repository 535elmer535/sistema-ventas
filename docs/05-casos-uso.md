# Guía 5 — Casos de uso de Mueblex

## 1. Descripción del sistema

Mueblex es una aplicación web para administrar una mueblería
de melamina.

Permite gestionar muebles de catálogo, ventas, clientes,
pedidos a medida, pagos y reportes mediante cuentas autorizadas.

Este documento describe el comportamiento que debe alcanzar
el proyecto y distingue las funciones existentes de las pendientes.

Actualización: 28/10/2026. Se revisaron app.js e index.html y las evidencias manuales compartidas. Las funciones SQL se contrastan con los respaldos del proyecto; no se ejecutaron nuevas consultas del servidor durante esta revisión. Las pruebas formales siguen siendo necesarias para escenarios no comprobados.

## 2. Actores

- Administrador: administra productos, usuarios, ventas,
  pedidos, pagos y reportes según sus permisos.
- Vendedor: consulta muebles y realiza las operaciones
  comerciales autorizadas.
- Personal del taller: recibe las especificaciones de fabricación.
  No se requiere una cuenta de acceso al taller en esta versión.

## 3. Reglas generales

- Las operaciones internas requieren una sesión autorizada.
- Los permisos deben comprobarse en el servidor o en Supabase;
  ocultar un botón no constituye una protección suficiente.
- Cada venta, pedido, pago y anulación debe identificar
  al usuario responsable.
- Las cantidades de muebles deben ser enteros positivos.
- Los precios deben ser mayores a cero.
- Las existencias deben ser enteros de cero o más.
- Los importes monetarios se manejan con hasta dos decimales.
- Los pedidos a medida no descuentan stock de exhibición.
- El valor vendido y el dinero cobrado son conceptos distintos.
- Una anulación debe conservar el historial de la operación.

---

## CU-01: Registrar una venta de stock o un pedido a medida

- Historia relacionada: HU-01.
- Requerimiento relacionado: RF-03.
- Actores: Vendedor o administrador.
- Estado: Implementado mediante funciones SQL; registro y recuperación tras desconexión comprobados manualmente.
- Precondición: Sesión iniciada con autorización para registrar ventas.

### Flujo principal: venta de muebles en stock

1. El usuario abre “Registrar venta de muebles en stock”.
2. Selecciona un mueble y escribe la cantidad.
3. Pulsa “Agregar mueble”.
4. El sistema valida los datos y muestra el subtotal.
5. El usuario agrega otros muebles si corresponde.
6. El sistema calcula el total de la lista.
7. El usuario confirma el registro de la venta.
8. El sistema comprueba los permisos y las existencias
   vigentes en la base de datos.
9. Guarda la venta, sus detalles y el usuario responsable,
   y descuenta las existencias como una sola operación.
10. Muestra la confirmación y actualiza los datos de la pantalla.

### Flujo alternativo: pedido a medida

1. El usuario abre “Registrar pedido a medida”.
2. Selecciona un cliente registrado.
3. Ingresa descripción, medidas, color, cantidad, precio
   y fecha estimada de entrega.
4. Agrega el mueble a la lista del pedido.
5. Repite el proceso si incluye varios muebles.
6. Ingresa el importe recibido y su método de pago, si corresponde.
7. El sistema calcula el total y el saldo pendiente.
8. El usuario confirma.
9. El sistema guarda el pedido, sus especificaciones,
   el usuario responsable y el pago inicial como una sola operación.
10. Muestra la confirmación, el total, lo recibido y el saldo.

### Otros flujos alternativos

- Si la cantidad es inválida, no se agrega el mueble.
- Si no hay stock suficiente al confirmar, se rechaza la venta
  y se informa la existencia disponible.
- El usuario puede quitar muebles antes de confirmar.
- Una lista vacía no puede registrarse.
- Si el anticipo es negativo o supera el total, se rechaza.
- Mientras se guarda, se impiden envíos repetidos.
- Si falla el guardado, la operación no debe quedar incompleta.
- Si se pierde la respuesta y el resultado es incierto,
  debe comprobarse la operación antes de repetirla.

### Postcondición

La venta o pedido queda registrado una sola vez, con su
responsable y sus datos completos. El stock se descuenta
únicamente en las ventas de muebles de catálogo.

### Situación actual y pendientes

Las funciones registrar_venta_stock y registrar_pedido_seguro identifican al usuario mediante su sesión. Guardan cada operación de forma indivisible. Las ventas descuentan stock validado en el servidor; los pedidos guardan sus especificaciones y anticipo sin descontar inventario de catálogo.

Las solicitudes inciertas se conservan por cuenta en el navegador y se recuperan con el mismo identificador, según CU-16. La venta de stock se registra pendiente de cobro; su pago se registra desde el detalle.

---

## CU-02: Consultar existencia de muebles

- Historia relacionada: HU-02.
- Requerimiento relacionado: RF-02.
- Actores: Vendedor o administrador.
- Estado: Implementado en el código; pendiente de pruebas formales.
- Precondición: Sesión iniciada con permiso de consulta.

### Flujo principal

1. El usuario abre la sección de inventario.
2. El sistema consulta los muebles registrados.
3. Muestra nombre, precio y existencia.
4. El usuario identifica el mueble y consulta su disponibilidad.

### Flujo alternativo: buscar por nombre

1. El usuario escribe el nombre en el buscador general.
2. El sistema busca coincidencias.
3. Muestra los muebles encontrados con precio y existencia.

### Otros flujos alternativos

- Si no hay muebles registrados, se muestra un mensaje.
- Si no hay coincidencias, se informa al usuario.
- Si la existencia es cero, se muestra ese valor.
- Si falla la consulta, se informa el error sin mostrar
  información anterior como si estuviera actualizada.

### Postcondición

El usuario conoce la existencia registrada sin modificar datos.

---

## CU-03: Registrar un nuevo mueble de catálogo

- Historia relacionada: HU-03.
- Requerimiento relacionado: RF-01.
- Actor: Administrador.
- Estado: Formulario y función registrar_mueble_seguro implementados; registro comprobado manualmente.
- Precondición: Sesión de administrador y categoría disponible.

### Flujo principal

1. El administrador abre el formulario de registro de muebles.
2. Ingresa nombre y selecciona categoría.
3. Ingresa precio y existencia inicial.
4. Confirma el registro.
5. El sistema comprueba los datos y la autorización.
6. Guarda el producto.
7. Muestra la confirmación y actualiza el catálogo interno
   y el selector de ventas.

### Flujos alternativos

- Si faltan datos obligatorios, se solicita completarlos.
- Si el precio o la existencia son inválidos, no se guarda.
- Si la categoría no existe, se solicita una categoría válida.
- Si el usuario no está autorizado, se rechaza la operación.
- Si cancela antes de confirmar, no se crea el producto.

### Postcondición

El mueble queda disponible para consulta y venta.

### Situación actual

El administrador registra los muebles desde Mueblex, sin utilizar el Table Editor. Se validan categoría, precio y existencia inicial; la autorización también se comprueba en la función SQL.

---

## CU-04: Consultar ventas y dinero cobrado por período

- Historia relacionada: HU-04.
- Requerimiento relacionado: RF-04.
- Actor principal: Administrador.
- Estado: Reportes de ventas activas, cobros, devoluciones y neto implementados y comprobados manualmente.
- Precondición: Sesión iniciada y autorización para consultar reportes.

### Flujo principal

1. El usuario abre la sección de reportes.
2. Selecciona las fechas Desde y Hasta.
3. Solicita la consulta.
4. El sistema interpreta el período en horario de Bolivia,
   incluyendo el último día seleccionado.
5. Muestra por separado:
   - Cantidad y valor de ventas y pedidos activos del período.
   - Cobros originales por método y su cantidad.
   - Devoluciones por método y su cantidad.
   - Neto cobrado: cobros menos devoluciones.
6. Muestra hasta 50 operaciones activas recientes del período; los totales agregados incluyen todas las operaciones elegibles. Los detalles y pagos individuales se consultan desde los historiales.

### Reglas del cálculo

- El valor vendido utiliza la fecha de la venta.
- El dinero cobrado utiliza la fecha de cada pago.
- Un anticipo no se vuelve a sumar cuando se cobra el saldo.
- Un pedido pendiente de pago no se considera dinero cobrado.
- Los pagos de ventas anteriores se incluyen si fueron
  recibidos dentro del período consultado.
- Las operaciones anuladas se excluyen del valor vendido. Sus cobros originales se conservan y las devoluciones se cuentan según su propia fecha.
- El neto puede ser negativo cuando en el período se devuelve más de lo cobrado. No representa ganancia.

### Flujos alternativos

- Si Desde es posterior a Hasta, se solicita corregir el rango.
- Si no hay movimientos, se muestran valores en cero.
- Si falla la consulta, se informa el error.
- El reporte actual de ventas permite consultar sin filtro
  dejando ambas fechas vacías.

### Consulta complementaria

El sistema muestra las unidades vendidas por mueble de catálogo,
ordenadas de mayor a menor.

### Postcondición

El administrador distingue cuánto se vendió de cuánto se cobró.

### Situación actual

La función consultar_resumen_negocio agrega ventas activas, pagos y devoluciones en el servidor. Los límites diarios usan America/La_Paz. Se comprobó que una devolución realizada en fecha diferente del cobro produce el neto correspondiente.

Inicio muestra valor vendido de operaciones activas, no dinero cobrado. El conteo de pedidos activos incluye pedidos entregados que no fueron anulados; no equivale a pedidos pendientes de fabricación.

---

## CU-05: Consultar el sistema desde un celular

- Historia relacionada: HU-05.
- Requerimiento relacionado: RF-05.
- Actor principal: Administrador.
- Estado: Diseño adaptable incorporado; funcionamiento móvil
  y acceso remoto pendientes de verificación.
- Precondición: Cuenta autorizada, conexión a Internet
  y dirección del sistema accesible desde el dispositivo.

### Flujo principal

1. El administrador abre Mueblex desde el navegador del celular.
2. Inicia sesión.
3. Accede al inicio, reportes o consulta de pedidos.
4. El sistema presenta los datos adaptados a la pantalla.
5. El administrador consulta la información necesaria.

### Flujos alternativos

- Credenciales incorrectas: se deniega el acceso.
- Sin datos: se muestran los mensajes correspondientes.
- Sin conexión: se informa el problema.
- Tablas anchas: deben poder consultarse sin perder
  el acceso a sus datos y controles.

### Postcondición

El administrador puede revisar el negocio desde el celular.

---

## CU-06: Mostrar alertas de existencias bajas o agotadas

- Historia relacionada: HU-06.
- Requerimiento relacionado: RF-06.
- Actores: Administrador o vendedor.
- Estado: Avisos de inventario implementados y comprobados manualmente.
- Precondición: Existencias actualizadas y un umbral
  de stock bajo definido por el negocio.

### Flujo principal

1. El sistema consulta la existencia de los muebles.
2. Identifica Agotado con cero unidades, Stock bajo entre una y tres y Disponible con más de tres. El umbral actual es fijo.
3. Muestra el nombre y la cantidad disponible.
4. Actualiza la alerta después de una venta o reposición.

### Flujos alternativos

- Si hay existencias suficientes, se muestra Disponible. No se envían avisos externos ni notificaciones automáticas.
- Los pedidos a medida no descuentan stock de exhibición.
- Si falla la consulta, no se presenta una alerta anterior
  como si fuera información actual.

### Postcondición

El personal identifica los muebles que requieren reposición.

---

## CU-07: Generar comprobantes y notas para el taller

- Historia relacionada: HU-07.
- Requerimiento relacionado: RF-07.
- Actores: Vendedor o administrador.
- Estado: Documentos internos imprimibles implementados y comprobados manualmente.
- Precondición: Venta o pedido registrado correctamente.

### Flujo principal

1. El usuario abre una operación desde el historial.
2. Solicita el comprobante o la nota de pedido.
3. El sistema genera el documento con su identificador,
   fecha y datos correspondientes.
4. El comprobante distingue total, pagos recibidos y saldo.
5. La nota para el taller incluye muebles, cantidades,
   medidas, colores y fecha estimada de entrega.
6. El usuario imprime o guarda como PDF mediante el diálogo del navegador. La nota del taller omite importes comerciales.

### Flujos alternativos

- Si falla la generación o impresión, puede reintentarse.
- Reimprimir no crea otra venta ni otro pago.
- Si la operación está anulada, el documento debe indicarlo.

### Postcondición

El cliente dispone del comprobante y el taller de las
especificaciones necesarias para fabricar.

### Situación actual

Se generan comprobantes internos y notas para el taller desde el detalle. Los documentos identifican operaciones anuladas; los comprobantes muestran cobros y devoluciones. Una nota de pedido anulado advierte que no debe fabricarse ni entregarse. No se trata de facturación fiscal.

---

## CU-08: Iniciar y cerrar sesión

- Regla relacionada: Acceso exclusivo a personal autorizado.
- Requerimiento relacionado: RNF-03.
- Actores: Administrador o vendedor.
- Estado: Implementado en el código.

### Flujo principal

1. El usuario abre la aplicación.
2. Ingresa correo y contraseña.
3. El sistema verifica las credenciales.
4. Consulta el perfil y su rol.
5. Muestra las opciones autorizadas.
6. Al terminar, el usuario pulsa Cerrar sesión.
7. El sistema finaliza la sesión del navegador.

### Flujos alternativos

- Si faltan credenciales, se solicita completarlas.
- Si son incorrectas, no se permite el acceso.
- Si falla la conexión, se muestra un mensaje.
- Recordarme determina el almacenamiento de la sesión.
- Una cuenta sin perfil autorizado no debe obtener
  acceso a las operaciones internas.

### Postcondición

El usuario accede con su identidad o finaliza su sesión.

---

## CU-09: Administrar clientes y datos de entrega

- Regla relacionada: Gestión de clientes de ventas y pedidos.
- Actores: Administrador o vendedor autorizado.
- Estado: Nombre, contacto, dirección del cliente y entrega por pedido implementados; persistencia de entrega comprobada manualmente.
- Relaciones: RF-08 / HU-08 y RF-12 / HU-12.
- Precondición: Sesión iniciada.

### Flujo principal

1. El usuario abre Clientes.
2. Ingresa nombre, contacto y dirección opcional de la ficha del cliente.
3. Confirma el registro.
4. El sistema valida y guarda los datos.
5. Actualiza el listado y el selector de clientes de pedidos.
6. El usuario puede consultar o editar los datos autorizados.
7. Desde el detalle de un pedido activo registra retiro en tienda o entrega a domicilio, receptor, contacto, dirección y referencia. La dirección es obligatoria para domicilio.
8. El sistema guarda estos datos para ese pedido y controla su versión para evitar sobrescribir un cambio concurrente. No modifica automáticamente la ficha del cliente.

### Flujos alternativos

- Si faltan datos obligatorios, no se guarda.
- Cancelar edición descarta los cambios del formulario.
- Solo un administrador puede eliminar clientes.
- La eliminación debe rechazarse si existen relaciones
  que requieren conservar al cliente en el historial.
- Si falla una operación, se muestra un mensaje.

### Postcondición

La información del cliente queda disponible para
atención, pedidos y entregas.

---

## CU-10: Editar muebles y registrar reposiciones

- Requerimiento relacionado: RF-01.
- Actor principal: Administrador.
- Estado: Edición de precio y reposiciones con historial implementadas y comprobadas manualmente.
- Relaciones: RF-13 / HU-13, además de RF-01.
- Precondición: Producto existente y usuario autorizado.

### Flujo principal

1. El administrador abre Inventario.
2. Para cambiar el precio, selecciona Editar precio y confirma un precio positivo. El servidor compara el precio anterior y modifica únicamente el precio.
3. Para ingresar unidades utiliza el formulario de reposición, selecciona mueble, cantidad entera positiva y motivo.
4. El sistema valida la autorización y registra atómicamente el incremento y su movimiento.
5. El historial de reposiciones muestra usuario, fecha, motivo, cantidad y existencias anterior y nueva.
6. Si la respuesta es incierta, puede confirmar la misma solicitud de reposición conservada por el navegador.

### Flujos alternativos

- Se rechazan precios menores o iguales a cero.
- Se rechazan existencias negativas o no enteras.
- Cancelar edición descarta los cambios.
- La eliminación queda reservada al administrador.
- Un producto relacionado con ventas no debe eliminarse
  si ello compromete el historial.

### Postcondición

El catálogo queda actualizado y los cambios de inventario
pueden revisarse posteriormente.

### Situación actual

El formulario Editar precio no modifica la existencia. Las reposiciones pasan por reponer_stock_seguro y la edición por actualizar_precio_mueble. Las actualizaciones directas de productos se restringieron para los roles de la aplicación.

Los vendedores consultan el inventario e historial de reposiciones, pero no cambian precios ni ingresan stock. Este historial registra reposiciones; el reintegro por anulación se conserva en la operación anulada. Los ajustes por pérdida, rotura o corrección manual quedan pendientes de un flujo específico.

---

## CU-11: Registrar cuentas de usuarios

- Relaciones: RF-15 / HU-15.
- Regla relacionada: Solo el administrador registra cuentas.
- Requerimiento relacionado: RNF-03.
- Actor: Administrador.
- Estado: Implementado en el código mediante la función
  registrar-usuario de Supabase.
- Precondición: Sesión de administrador y función desplegada.

### Flujo principal

1. El administrador abre Administrar usuarios.
2. Ingresa nombre, correo, contacto, contraseña y rol.
3. Confirma.
4. El servidor comprueba la identidad y el rol del solicitante.
5. Valida los datos.
6. Crea la cuenta y su perfil.
7. Muestra la confirmación.

### Flujos alternativos

- Un vendedor o una persona sin sesión no puede crear cuentas.
- Si los datos son inválidos, se rechaza la solicitud.
- Si falla la creación o la asociación del perfil,
  se informa el problema.
- Los errores no deben dejar cuentas incompletas sin advertencia.

### Postcondición

La cuenta queda asociada a su perfil y permisos.

---

## CU-12: Consultar historial y detalle de operaciones

- Regla relacionada: Seguimiento de ventas y pedidos.
- Actores: Administrador o vendedor autorizado.
- Estado: Historiales paginados y detalles implementados y comprobados manualmente.
- Relaciones: RF-09 / HU-09.
- Precondición: Sesión iniciada.

### Flujo principal

1. El usuario abre el historial.
2. Recorre el historial paginado de ventas de stock o de pedidos. El buscador general permite localizar ventas por identificador, fecha o coincidencias de tipo y estado de pago; no se presenta como filtro completo del historial por cliente.
3. Selecciona una venta o pedido.
4. El sistema muestra sus muebles, cantidades, precios,
   cliente, usuario responsable, pagos y saldo.
5. Si es un pedido, muestra sus especificaciones
   y estado de fabricación y entrega.

### Flujos alternativos

- Si no hay coincidencias, se informa.
- Si la operación está anulada, se identifica claramente.
- Si no está autorizado, se rechaza la consulta.

### Postcondición

El usuario puede revisar una operación sin alterar sus datos.

---

## CU-13: Registrar cobros y pagos de saldos

- Regla relacionada: Control de cobros y anticipos.
- Actor: Administrador o vendedor autorizado.
- Estado: Anticipos iniciales y cobros posteriores implementados; recuperación tras desconexión comprobada en ventas y pedidos.
- Relaciones: RF-10 / HU-10 y RF-16 / HU-16.
- Precondición: Operación existente, activa y con saldo pendiente.

### Flujo principal

1. El usuario abre la operación.
2. El sistema muestra total, pagos confirmados y saldo.
3. El usuario ingresa el importe y método de pago.
4. Confirma.
5. El sistema vuelve a comprobar el saldo vigente.
6. Registra el pago con fecha y usuario responsable.
7. Actualiza el saldo y el estado de pago.
8. Muestra la confirmación.

### Flujos alternativos

- Se rechazan importes de cero, negativos o superiores al saldo.
- Una operación pagada no admite otro cobro.
- Una operación anulada no admite nuevos cobros.
- Se impiden envíos repetidos durante el procesamiento.
- Un cobro incierto se conserva por cuenta y bloquea nuevos cobros hasta resolverlo con Confirmar cobro pendiente, según CU-16.
- Si falla el guardado, no debe quedar un pago
  con un saldo o estado incoherente.

### Postcondición

El pago queda registrado una sola vez y el saldo actualizado.

---

## CU-14: Actualizar fabricación y entrega de pedidos

- Regla relacionada: Seguimiento de pedidos a medida.
- Actores: Administrador o vendedor autorizado.
- Estado: Avance secuencial, historial y entrega implementados y comprobados manualmente.
- Relaciones: RF-11 / HU-11 y RF-12 / HU-12.
- Precondición: Pedido registrado y no anulado.

### Flujo principal

1. El usuario autorizado abre el detalle del pedido.
2. Revisa las especificaciones y fecha prevista.
3. Avanza cada mueble siguiendo la secuencia pendiente → en fabricación → listo → entregado.
4. El sistema registra la fecha y el responsable del cambio.
5. Si corresponde, registra los datos de entrega.
6. Muestra el estado actualizado.

### Flujos alternativos

- No se permite marcar como entregado un pedido anulado.
- La interfaz actual no permite retroceder estados. Una corrección con motivo requiere un desarrollo adicional.
- El saldo se muestra en el detalle. No se ha incorporado un bloqueo de entrega por deuda; esa regla debe definirse antes de implementarla.

### Postcondición

El personal conoce el avance del pedido y su situación de entrega.

---

## CU-15: Anular una operación conservando su historial

- Regla relacionada: Corrección de ventas y pedidos.
- Actor: Administrador.
- Estado: Anulación sin cobros y con devolución completa implementada y comprobada manualmente.
- Relaciones: RF-14 / HU-14.
- Precondición: Operación activa y elegible, sesión de administrador y motivo de anulación.

### Flujo principal

1. El administrador abre la operación.
2. Solicita anularla e ingresa el motivo.
3. El sistema muestra los efectos sobre stock, pagos y pedido.
4. El administrador confirma.
5. El sistema registra la anulación, fecha y responsable.
6. En ventas de stock, aplica la restitución correspondiente
   según la situación de entrega o devolución del mueble.
7. Si existen pagos, registra una devolución del total efectivamente cobrado. El administrador selecciona método y confirma que ya devolvió ese dinero; la aplicación no ejecuta transferencias. Se conservan los pagos originales.
8. Actualiza reportes e historial.

### Flujos alternativos

- Un vendedor no puede anular operaciones.
- Una operación ya anulada no se procesa nuevamente.
- No se devuelve stock si el mueble no ha sido recuperado
  cuando corresponde una devolución física.
- Si falla el procesamiento, no se aplican efectos parciales.
- No se admiten devoluciones parciales en este flujo.
- Los pedidos con algún mueble entregado no admiten esta anulación.
- En ventas con cobros se exige confirmar la recuperación física de los muebles aptos para reintegrarse al stock.
- Las ventas antiguas sin constancia de descuento automático de stock requieren revisión y no se reintegran automáticamente.
- La base limita la devolución a una por operación y conserva su identificador para impedir procesarla dos veces.

### Postcondición

La operación queda identificada como anulada y se conserva
la trazabilidad de sus movimientos.

---

## CU-16: Recuperar solicitudes con resultado incierto

- Relaciones: RF-16 / HU-16; complementa CU-01 y CU-13.
- Actores: Administrador o vendedor autorizado.
- Estado: Recuperación implementada; desconexión y recarga comprobadas manualmente en ventas, pedidos con anticipo y cobros posteriores.
- Precondición: Solicitud conservada por la misma cuenta en el mismo navegador y origen de la aplicación.

### Flujo principal

1. Antes de enviar una venta, pedido o cobro, el sistema guarda la solicitud y un identificador único en el navegador, asociados a la cuenta.
2. Si no recibe confirmación, informa que el resultado es incierto y bloquea los reenvíos normales correspondientes.
3. Al recargar, busca la referencia de la cuenta y ofrece Confirmar venta pendiente, Confirmar pedido pendiente o Confirmar cobro pendiente.
4. El usuario restablece la conexión y solicita confirmar.
5. La aplicación reutiliza el identificador y los datos originales. La función SQL devuelve el registro existente si ya se procesó la misma solicitud o procesa la solicitud si todavía no existe y continúa siendo válida.
6. Al confirmar, libera la referencia local y actualiza historiales y reportes. Los cobros se consultan abriendo nuevamente el detalle.

### Flujos alternativos y límites

- Un rechazo definido por la función SQL libera la referencia y permite corregir los datos; una respuesta incierta la conserva.
- Si no puede leerse el almacenamiento local o la referencia está dañada, se bloquea la operación para revisión; no se elimina silenciosamente el pendiente.
- El panel de recuperación de cobros está disponible en Ventas y Pedidos porque ambas secciones comparten una referencia de cobro por cuenta.
- No implica cobrar otra vez al cliente: se confirma el registro del mismo importe recibido.
- Una venta, pedido y cobro tienen referencias separadas. La aplicación no constituye un sistema completo de trabajo sin conexión.
- Recargar puede vaciar la lista temporal visible; la solicitud enviada conserva los datos originales. Los borradores no enviados no se recuperan de forma general.
- Cambiar de equipo, navegador, perfil u origen no traslada las referencias locales. Borrar datos del navegador elimina esas referencias y exige conciliar con el historial del servidor antes de repetir operaciones.
- Las pruebas compartidas simularon solicitudes fallidas sin conexión. Quedan pendientes pruebas formales de respuesta perdida tras confirmación del servidor y de varias pestañas o cuentas concurrentes; no se consideran demostradas por esas capturas.

### Postcondición

La solicitud queda confirmada o claramente pendiente de resolución, sin crear un identificador nuevo para el reintento de la misma operación.

---

## 4. Ampliaciones futuras

Estas funciones quedan fuera de la implementación inmediata:

- Catálogo público para compradores, separado del panel interno.
- Fotografías y fichas públicas de muebles.
- Contacto comercial por WhatsApp.
- Borradores persistentes de formularios antes del envío y sincronización de pendientes entre dispositivos. Las solicitudes enviadas con resultado incierto ya tienen recuperación local según CU-16.

No se consideran implementadas en la versión actual.

## 5. Reflexión

Los casos de uso se actualizaron para representar Mueblex
y las mejoras acordadas para el negocio.

Se conservaron CU-01 a CU-15 y se agregó CU-16 para documentar la recuperación de solicitudes. RF-01 a RF-07 y HU-01 a HU-07 mantienen sus identificadores; las ampliaciones RF-08 a RF-16 y HU-08 a HU-16 se describen en los documentos 03 y 04.

El documento distingue entre el comportamiento objetivo
y el estado de implementación. Así, una función pendiente
no se elimina ni se presenta como terminada.

El plan de pruebas utilizará estos identificadores para
comprobar las funciones existentes e identificar los casos
que dependen de desarrollos pendientes.

La documentación registra las pruebas manuales disponibles y deja pendientes las comprobaciones formales de concurrencia, respuesta perdida después de confirmar el servidor y uso móvil real.
