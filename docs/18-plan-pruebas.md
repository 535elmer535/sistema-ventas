# Guía 18 — Plan de pruebas de Mueblex

## 1. Objetivo y alcance

Documentar las situaciones que se comprobarán en Mueblex, aplicación web interna para una mueblería de melamina. El plan se basa en los casos de uso de docs/05-casos-uso.md y en las funciones actuales del proyecto.

Este archivo se prepara en la Guía 18. Los casos se ejecutarán y sus resultados se documentarán en la Guía 19. Las comprobaciones informales anteriores no significan que estos casos formales ya estén aprobados.

## 2. Condiciones generales para la futura ejecución

- Utilizar cuentas y datos de prueba identificados como tales.
- Anotar los identificadores de los registros utilizados, las existencias iniciales y los identificadores de las operaciones creadas.
- Comprobar en el servidor los cambios esperados, además del mensaje de la interfaz. Las consultas de verificación son de lectura; no se modifica el stock manualmente para simular el resultado.
- Usar una fecha de entrega válida, posterior al día de ejecución, en los pedidos nuevos.
- Antes de cada caso, comprobar sus precondiciones y que no haya solicitudes anteriores pendientes de recuperar en la cuenta y navegador de prueba.
- Conservar los identificadores CP al ejecutar el plan. Registrar resultado observado y evidencia por separado, sin reemplazar el resultado esperado.
- Estado inicial de todos los casos de este documento: pendiente de ejecución formal.

## 3. Actividad A — Casos derivados de CU-01

### CP-01 — Registrar una venta válida de stock

**Caso de uso relacionado:** CU-01, flujo principal de venta de stock.

**Requerimiento e historia:** RF-03 / HU-01.

**Tipo:** Funcional.

**Precondiciones:** Sesión iniciada como vendedor autorizado. Existe un mueble de prueba con precio positivo y al menos dos unidades disponibles. Se anotan su identificador, su precio unitario P y su existencia inicial E. No se modifica ese mueble desde otra sesión durante este caso.

**Pasos:**

1. Abrir Ventas y seleccionar el mueble de prueba.
2. Escribir cantidad 2 y pulsar Agregar mueble.
3. Comprobar que la lista tiene una línea de dos unidades y un total de 2 × P.
4. Pulsar Confirmar venta una sola vez.
5. Anotar el identificador confirmado y abrir su detalle desde el historial.
6. Consultar la existencia actual del mueble y verificar en Supabase la venta y sus detalles.

**Resultado esperado:**

- Se confirma una venta por 2 × P y aparece una nueva operación activa en el historial.
- La venta corresponde al usuario vendedor que la registró, no a un usuario fijo.
- Existe una venta nueva con un detalle del producto, cantidad 2, precio unitario P y subtotal 2 × P.
- La existencia pasa de E a E − 2.
- La venta queda pendiente de cobro, sin pagos asociados y con saldo igual al total. Registrar la venta no registra automáticamente su cobro.
- La lista temporal queda vacía y el total del formulario vuelve a cero.

### CP-02 — Registrar un pedido a medida con anticipo

**Caso de uso relacionado:** CU-01, flujo alternativo de pedido a medida.

**Requerimiento e historia:** RF-03 / HU-01.

**Tipo:** Funcional.

**Precondiciones:** Sesión iniciada como vendedor autorizado. Existe un cliente de prueba con contacto. Se anota su identificador y se registran las existencias de catálogo antes de la prueba. No hay movimientos concurrentes de inventario durante el caso.

**Pasos:**

1. Abrir Pedidos y seleccionar el cliente de prueba.
2. Escribir descripción Repisa de prueba del plan, alto 40 cm, ancho 60 cm, profundidad 25 cm y color Blanco.
3. Ingresar cantidad 1, precio unitario Bs 200 y una fecha de entrega posterior al día de ejecución.
4. Pulsar Agregar mueble a medida.
5. Escribir Bs 50 como monto recibido y seleccionar Efectivo.
6. Comprobar total Bs 200 y saldo Bs 150; pulsar Registrar pedido a medida una sola vez.
7. Anotar el identificador de venta confirmado y consultar el detalle, sus especificaciones y cobros.
8. Verificar en Supabase los registros asociados y comparar las existencias de catálogo.

**Resultado esperado:**

- Se crea una operación activa de tipo pedido_medida, por Bs 200, asociada al cliente y al usuario de la sesión.
- Se guarda una especificación del mueble con cantidad 1, medidas, color y fecha ingresados.
- Se guarda un solo anticipo de Bs 50 en efectivo, con el responsable de la sesión.
- El detalle muestra Bs 50 cobrados, Bs 150 de saldo y estado anticipo_cobrado.
- Las existencias de los muebles de catálogo no cambian por registrar el pedido.
- La lista temporal del pedido queda vacía después de la confirmación.

### CP-03 — Rechazar una cantidad cero

**Caso de uso relacionado:** CU-01, flujo alternativo de cantidad inválida.

**Requerimiento e historia:** RF-03 / HU-01.

**Tipo:** Validación.

**Precondiciones:** Sesión iniciada como vendedor. Existe un mueble de prueba y la lista de venta está vacía. Se anota su existencia inicial.

**Pasos:**

1. Abrir Ventas y seleccionar el mueble de prueba.
2. Escribir 0 en Cantidad.
3. Pulsar Agregar mueble.
4. Revisar el aviso y la lista de muebles seleccionados.
5. Verificar que el intento no generó una venta ni un detalle y comparar la existencia del producto.

**Resultado esperado:**

- Se informa que la cantidad debe ser mayor que cero.
- El mueble no se agrega a la lista y el total permanece en Bs 0.
- Confirmar venta permanece deshabilitado mientras la lista siga vacía.
- No se crean registros en ventas ni detalle_ventas y no cambia la existencia.

### CP-04 — Impedir registrar una venta sin sesión

**Caso de uso relacionado:** CU-01, restricción de acceso; relacionado también con CU-08 y RNF-03.

**Requerimiento e historia:** RF-03 / HU-01.

**Tipo:** Seguridad.

**Precondiciones:** Se dispone de un mueble de prueba existente, su precio en centavos y su existencia inicial. No hay sesión de usuario activa en el navegador utilizado para el intento.

**Pasos:**

1. Cerrar sesión y recargar la aplicación.
2. Comprobar qué pantalla se muestra y si puede accederse al formulario de venta.
3. Mediante un cliente de Supabase sin sesión, intentar llamar a registrar_venta_stock con un identificador de solicitud nuevo y detalles válidos del mueble de prueba.
4. Desde una sesión autorizada separada, consultar si se creó una venta con ese identificador y revisar la existencia del producto.

**Resultado esperado:**

- La aplicación muestra el inicio de sesión y mantiene oculto el panel interno de ventas.
- El servidor rechaza la solicitud sin sesión, aunque sus cantidades y precios sean válidos.
- No se crea una venta ni sus detalles con el identificador del intento.
- La existencia del producto conserva su valor inicial.

### CP-05 — Rechazar una cantidad superior al stock mostrado

**Caso de uso relacionado:** CU-01, flujo alternativo de existencia insuficiente.

**Requerimiento e historia:** RF-03 / HU-01.

**Tipo:** Validación.

**Precondiciones:** Sesión iniciada como vendedor. Existe un mueble de prueba con existencia E mayor que cero. El listado está actualizado y la lista de venta está vacía. No hay cambios concurrentes de ese producto durante este caso.

**Pasos:**

1. Consultar y anotar E en Inventario.
2. Abrir Ventas y seleccionar el mismo mueble.
3. Escribir E + 1 en Cantidad y pulsar Agregar mueble.
4. Revisar el mensaje y la lista temporal.
5. Verificar que el intento no creó una operación y consultar la existencia nuevamente.

**Resultado esperado:**

- Se informa que la cantidad supera la existencia mostrada.
- No se agrega la línea a la lista y no se habilita Confirmar venta con una lista vacía.
- No se crea una venta ni sus detalles y la existencia sigue siendo E.
- Este caso comprueba la validación de la interfaz con stock actualizado; no sustituye una prueba de concurrencia ni la comprobación del stock vigente en el servidor al confirmar.

### CP-06 — Rechazar un anticipo superior al total del pedido

**Caso de uso relacionado:** CU-01, flujo alternativo de anticipo inválido.

**Requerimiento e historia:** RF-03 / HU-01.

**Tipo:** Validación.

**Precondiciones:** Sesión iniciada como vendedor. Cliente de prueba con contacto disponible. Formulario de pedido nuevo y sin solicitudes pendientes de recuperar.

**Pasos:**

1. Seleccionar el cliente y agregar un mueble a medida de cantidad 1 y precio Bs 200, con especificaciones completas y fecha futura válida.
2. Escribir Bs 250 como monto recibido y seleccionar Efectivo.
3. Intentar pulsar Registrar pedido a medida.
4. Revisar el aviso del formulario y comprobar que el intento no generó registros nuevos de venta, especificaciones ni pago para ese pedido.

**Resultado esperado:**

- El formulario impide el envío y señala que el importe supera el máximo o que el monto recibido no es válido. El aviso puede provenir de la validación HTML del campo o de la aplicación.
- No se confirma un pedido ni aparece uno nuevo por este intento en el historial.
- No se crean la venta, las especificaciones ni el anticipo de Bs 250.
- El stock de catálogo no se modifica.

## 4. Actividad B — Casos derivados de CU-02 y CU-03

### CP-07 — Consultar la existencia de un mueble registrado

**Caso de uso relacionado:** CU-02, flujo principal de consulta de existencias.

**Requerimiento e historia:** RF-02 / HU-02.

**Tipo:** Funcional.

**Precondiciones:** Sesión iniciada como vendedor autorizado. Existe un mueble de prueba cuyo identificador, nombre, precio y existencia E se han consultado en Supabase. No se modifica ese producto desde otra sesión durante el caso.

**Pasos:**

1. Abrir Inventario.
2. Localizar el mueble de prueba en el listado.
3. Comparar su nombre, precio y existencia con los datos previamente consultados.
4. Comprobar el estado de stock correspondiente a E.
5. Consultar nuevamente el producto en Supabase para verificar que la consulta no lo modificó.

**Resultado esperado:**

- El listado muestra el nombre y el precio del mueble consultado y exactamente E unidades.
- Si E es 0, muestra Agotado; entre 1 y 3, Stock bajo; por encima de 3, Disponible.
- La consulta no cambia los datos del producto ni crea una venta, un pedido o un movimiento de inventario.

### CP-08 — Buscar un mueble sin coincidencias

**Caso de uso relacionado:** CU-02, flujo alternativo de búsqueda sin resultados.

**Requerimiento e historia:** RF-02 / HU-02.

**Tipo:** Validación de resultados de búsqueda.

**Precondiciones:** Sesión iniciada como vendedor. Se ha verificado que ningún nombre de producto contiene el texto MuebleInexistentePlan18. Hay conexión disponible.

**Pasos:**

1. Escribir MuebleInexistentePlan18 en el buscador general.
2. Pulsar Buscar y esperar a que termine la consulta.
3. Revisar específicamente el grupo Productos de los resultados; los demás grupos se consultan por separado.
4. Comprobar que no se alteraron los productos del inventario.

**Resultado esperado:**

- El grupo Productos informa Sin coincidencias.
- No muestra productos de una búsqueda anterior como si coincidieran con el texto actual.
- No se presenta un error de conexión como si fuera una búsqueda válida sin resultados.
- No se registra ni modifica ningún producto por realizar la búsqueda.

### CP-09 — Registrar un mueble como administrador

**Caso de uso relacionado:** CU-03, flujo principal de registro de muebles de catálogo.

**Requerimiento e historia:** RF-01 / HU-03.

**Tipo:** Funcional.

**Precondiciones:** Sesión iniciada como administrador. Existe una categoría disponible en el selector. Se elige y anota un nombre de prueba único, por ejemplo Velador plan18 seguido de un sufijo identificable. No hay un registro incierto de producto pendiente de revisar.

**Pasos:**

1. Abrir Inventario y localizar el formulario de registro de muebles.
2. Escribir el nombre de prueba y seleccionar la categoría disponible.
3. Ingresar precio Bs 350 y existencia inicial 4.
4. Pulsar el botón de registro una sola vez y esperar la confirmación.
5. Anotar el identificador del nuevo producto y consultar su fila en Inventario y Supabase.
6. Abrir Ventas y localizar el nuevo mueble en el selector, sin registrar una venta.

**Resultado esperado:**

- Se confirma el registro y se crea un solo producto con el nombre elegido, la categoría seleccionada, precio Bs 350 y existencia 4.
- Inventario muestra el mueble con estado Disponible.
- El mueble aparece en el selector de ventas con sus datos actuales.
- Registrar el producto no genera una venta ni un pago y no altera la existencia de otros productos.

### CP-10 — Rechazar el registro de un mueble como vendedor

**Caso de uso relacionado:** CU-03, flujo alternativo de usuario sin autorización.

**Requerimiento e historia:** RF-01 / HU-03; RNF-03.

**Tipo:** Seguridad.

**Precondiciones:** Sesión iniciada como vendedor autorizado para ventas, pero sin rol administrador. Existe una categoría válida. Se prepara un nombre de producto de prueba único y se comprueba que todavía no existe.

**Pasos:**

1. Abrir Inventario con la cuenta de vendedor.
2. Comprobar si se muestra el formulario de registro de muebles.
3. Con un cliente de Supabase autenticado como ese vendedor, intentar llamar a registrar_mueble_seguro con el nombre único, la categoría válida, precio de 35000 centavos y existencia inicial 4.
4. Desde una sesión de administrador separada, consultar si se creó el producto con ese nombre.

**Resultado esperado:**

- El formulario de registro de muebles no está disponible para el vendedor.
- La función del servidor rechaza el intento por falta de autorización, aunque los datos comerciales sean válidos.
- No se crea el producto del intento y no se modifica el inventario.
- Ocultar el formulario no se considera por sí solo prueba suficiente de autorización: debe comprobarse también el rechazo del servidor.

### CP-11 — Rechazar un precio cero al registrar un mueble

**Caso de uso relacionado:** CU-03, flujo alternativo de precio inválido.

**Requerimiento e historia:** RF-01 / HU-03.

**Tipo:** Validación.

**Precondiciones:** Sesión iniciada como administrador. Existe una categoría válida y se ha elegido un nombre de prueba único.

**Pasos:**

1. Abrir el formulario de registro de muebles.
2. Escribir el nombre de prueba y seleccionar una categoría válida.
3. Ingresar precio 0 y existencia inicial 4.
4. Intentar registrar el mueble.
5. Revisar la validación y comprobar que no se creó el producto con ese nombre.

**Resultado esperado:**

- El formulario impide el registro e informa que el precio debe ser positivo o que el valor está fuera del mínimo permitido.
- El aviso puede proceder de la validación HTML del campo o de la aplicación.
- No aparece una confirmación de producto registrado.
- No se crea el producto del intento en Supabase ni se alteran los productos existentes.

## 5. Actividad C — Priorización del plan

La prioridad se toma de docs/03-requerimientos.md. RF-01, RF-02, RF-03 y RF-08 están clasificados como **Debe tener**. Por eso los once casos de las actividades A y B, los dos del reto y el caso adicional de concurrencia pertenecen a esa misma categoría; no se cambia su clasificación para obtener artificialmente prioridades distintas.

Dentro de Debe tener, se ordena la ejecución por riesgo y dependencia. Primero se revisa el acceso y la autorización; después, las consultas y el registro de muebles necesarios para las operaciones comerciales; finalmente, las ventas, pedidos y sus validaciones. La consulta de verificación con administrador indicada en las pruebas de seguridad no cambia la cuenta utilizada para realizar el intento.

| Orden en la Guía 19 | Caso | Comprobación | CU o regla relacionada | RF relacionado | Prioridad MoSCoW |
| --- | --- | --- | --- | --- | --- |
| 1 | CP-04 | Impedir registrar una venta sin sesión | CU-01; CU-08 | RF-03; RNF-03 | Debe tener |
| 2 | CP-10 | Rechazar el registro de muebles como vendedor | CU-03 | RF-01; RNF-03 | Debe tener |
| 3 | CP-12 | Impedir que un vendedor elimine un cliente | Regla del reto; CU-09 | RF-08; RNF-03 | Debe tener |
| 4 | CP-13 | Permitir eliminar un cliente sin relaciones como administrador | Regla del reto; CU-09 | RF-08; RNF-03 | Debe tener |
| 5 | CP-07 | Consultar la existencia de un mueble registrado | CU-02 | RF-02 | Debe tener |
| 6 | CP-08 | Buscar un mueble sin coincidencias | CU-02 | RF-02 | Debe tener |
| 7 | CP-09 | Registrar un mueble como administrador | CU-03 | RF-01 | Debe tener |
| 8 | CP-11 | Rechazar un precio cero al registrar un mueble | CU-03 | RF-01 | Debe tener |
| 9 | CP-01 | Registrar una venta válida de stock | CU-01 | RF-03 | Debe tener |
| 10 | CP-14 | Dos vendedores intentan vender la última unidad | Escenario adicional; CU-01 | RF-03; RNF-05 | Debe tener |
| 11 | CP-03 | Rechazar una cantidad cero | CU-01 | RF-03 | Debe tener |
| 12 | CP-05 | Rechazar una cantidad superior al stock mostrado | CU-01 | RF-03 | Debe tener |
| 13 | CP-02 | Registrar un pedido a medida con anticipo | CU-01 | RF-03 | Debe tener |
| 14 | CP-06 | Rechazar un anticipo superior al total | CU-01 | RF-03 | Debe tener |

El orden de ejecución no modifica los identificadores CP. Por ejemplo, CP-04 se ejecuta primero, pero conserva su ID para relacionar después resultados, incidencias y evidencias.

Si falla una prueba de seguridad o integridad que comprometa las operaciones siguientes, se registra la incidencia y se corrige antes de continuar con los casos afectados. Cada caso mantiene sus propias precondiciones; no se supone que una prueba anterior dejó automáticamente los datos necesarios para la siguiente.

La tabla incluye los casos de las actividades A y B, del reto y del primer desafío opcional. Todos los casos actuales tienen una prioridad y un orden de ejecución. Cualquier ampliación posterior deberá incorporarse también a esta tabla.

## 6. Reto 3.5 — Política de eliminación de clientes

Estos casos se derivan del **reto de la Guía 15: restringir DELETE de clientes al administrador**. Su origen es esa política de seguridad incorporada al proyecto, no los flujos originales de CU-01, CU-02 y CU-03 utilizados en las actividades A y B. La regla también quedó reflejada posteriormente en CU-09 de Mueblex.

### CP-12 — Impedir que un vendedor elimine un cliente

**Regla relacionada:** Solo el administrador puede eliminar clientes, mediante autorización del servidor y RLS.

**Origen:** Reto de la Guía 15; referencia complementaria CU-09.

**Requerimiento e historia:** RF-08 / HU-08; RNF-03.

**Tipo:** Seguridad.

**Precondiciones:** Existe un cliente creado exclusivamente para esta prueba, sin ventas ni pedidos asociados. Se anotan su identificador, nombre y contacto. Sesión de vendedor iniciada en el navegador del intento. Se dispone de una sesión de administrador separada para consultar el resultado. La ausencia de relaciones evita confundir un rechazo por clave foránea con una restricción por rol.

**Pasos:**

1. Con la cuenta de vendedor, abrir Clientes y localizar el cliente de prueba.
2. Comprobar si aparece el botón Eliminar para ese cliente.
3. Mediante un cliente de Supabase autenticado como ese vendedor, intentar eliminar exclusivamente el registro con el identificador anotado.
4. Consultar el resultado de la petición y si se devolvió alguna fila eliminada.
5. Con la sesión de administrador, consultar nuevamente ese mismo identificador y comparar sus datos.

**Resultado esperado:**

- El vendedor no dispone del botón Eliminar en el listado de clientes.
- El servidor no permite que ese vendedor elimine el registro: la solicitud puede devolver un error de permisos o no afectar ninguna fila por la política RLS.
- No se considera suficiente comprobar solamente que hubo o no hubo un mensaje de error; debe verificarse que el cliente continúa existiendo con el mismo identificador y datos.
- No se elimina ningún otro cliente ni se modifican relaciones históricas.

### CP-13 — Permitir que un administrador elimine un cliente sin relaciones

**Regla relacionada:** Solo el administrador puede eliminar clientes, respetando las relaciones que conservan el historial.

**Origen:** Reto de la Guía 15; referencia complementaria CU-09.

**Requerimiento e historia:** RF-08 / HU-08; RNF-03.

**Tipo:** Seguridad, escenario autorizado.

**Precondiciones:** Sesión iniciada como administrador. Existe un cliente creado exclusivamente para esta prueba, sin ventas ni pedidos asociados. Se anotan su identificador y sus datos. Se verifica esta condición aunque se reutilice el cliente de CP-12: no se supone automáticamente que el caso anterior terminó correctamente.

**Pasos:**

1. Abrir Clientes con la cuenta de administrador.
2. Localizar el cliente de prueba y comprobar que su identificador corresponde al anotado.
3. Pulsar Eliminar y aceptar la confirmación.
4. Esperar el resultado y actualizar el listado.
5. Consultar en Supabase si todavía existe el registro con ese identificador y revisar que los demás clientes permanezcan.

**Resultado esperado:**

- El administrador dispone de la acción Eliminar.
- Después de confirmar, la aplicación informa que se eliminó el cliente y el registro desaparece del listado actualizado.
- El cliente con el identificador anotado ya no existe en Supabase.
- Los demás clientes permanecen sin cambios.
- No se eliminan ventas, pedidos ni pagos. El caso utiliza un cliente sin relaciones; no exige que se permita eliminar uno vinculado a operaciones históricas.

## 7. Reflexión 3.7 — Un resultado esperado verificable

### Caso elegido

CP-02 — Registrar un pedido a medida con anticipo. Este caso adapta el flujo de pedidos de Mueblex; no es el ejemplo de venta de stock de la sección teórica de la guía.

### Resultado esperado copiado de CP-02

> - Se crea una operación activa de tipo pedido_medida, por Bs 200, asociada al cliente y al usuario de la sesión.
> - Se guarda una especificación del mueble con cantidad 1, medidas, color y fecha ingresados.
> - Se guarda un solo anticipo de Bs 50 en efectivo, con el responsable de la sesión.
> - El detalle muestra Bs 50 cobrados, Bs 150 de saldo y estado anticipo_cobrado.
> - Las existencias de los muebles de catálogo no cambian por registrar el pedido.
> - La lista temporal del pedido queda vacía después de la confirmación.

### Por qué puede comprobarse

Este resultado no se limita a decir que el pedido debe funcionar. Indica registros, cantidades e importes que una persona puede revisar en el detalle del pedido y en Supabase.

El total debe ser Bs 200 y debe existir un solo anticipo de Bs 50 en efectivo. Por tanto, el saldo debe ser exactamente Bs 150. Si aparece otro importe o dos anticipos, el caso no cumple el resultado esperado aunque la interfaz muestre un mensaje de éxito.

También se comprueba que la operación corresponda al cliente elegido y al usuario que inició sesión, que las especificaciones coincidan con los datos ingresados y que no cambie el stock de catálogo, porque se trata de un mueble por fabricar. Para verificar esta última condición se comparan las existencias anotadas antes y después y se evita que otra sesión haga movimientos durante la prueba.

Por último, la lista temporal debe quedar vacía al confirmarse el pedido. Cada observación tiene un criterio concreto: coincidencia de datos, existencia de los registros, un solo anticipo, igualdad de importes o ausencia de un cambio de stock. Esto permite decidir si el caso pasó o falló y explicar qué comprobación no se cumplió.

Esta reflexión justifica la redacción del resultado esperado. No registra un resultado de ejecución formal de CP-02; esa evaluación se realizará en la Guía 19.

## 8. Desafío opcional 3.8 — Venta concurrente de la última unidad

Se incorpora el primer desafío opcional: una situación adicional que no tiene un flujo específico en los casos de uso documentados. Está relacionada con CU-01 y con la regla de impedir ventas sin existencias, pero introduce dos sesiones que trabajan sobre el mismo stock al mismo tiempo.

### CP-14 — Dos vendedores intentan vender la última unidad

**Caso de uso o regla relacionada:** CU-01 como referencia; escenario adicional de concurrencia sobre la última unidad. RF-03 / HU-01 y RNF-05.

**Tipo:** Concurrencia e integridad.

**Precondiciones:** Existen dos cuentas autorizadas distintas, abiertas en navegadores o perfiles separados y conectadas al mismo proyecto de Supabase. Se utiliza un mueble creado para esta prueba, con existencia exactamente 1 y precio positivo P. Se anota su identificador y se comprueba que no hay otras personas modificándolo ni solicitudes anteriores pendientes de recuperar. No se reutilizan credenciales de administrador de base de datos para realizar las ventas.

**Pasos:**

1. En ambas sesiones, actualizar el listado y comprobar que el mismo mueble muestra una unidad disponible.
2. En cada sesión, seleccionar ese mueble, ingresar cantidad 1 y pulsar Agregar mueble, sin confirmar todavía ninguna venta.
3. Comprobar que las dos listas temporales contienen la misma última unidad y total P.
4. Intentar confirmar las dos ventas al mismo tiempo. Si una petición llega después de la otra, mantener la segunda lista tal como estaba, sin actualizar sus datos antes de confirmar; así se comprueba también el rechazo de un stock mostrado que ya quedó desactualizado.
5. Anotar el resultado de cada sesión y cualquier identificador de venta confirmado.
6. Consultar en Supabase las operaciones de ambos intentos y sus detalles; verificar también el stock actual del producto.

**Resultado esperado:**

- Solo una de las solicitudes confirma una venta de una unidad por el importe P, con su usuario responsable y detalle asociado.
- La otra solicitud es rechazada porque ya no existe stock suficiente. Un formulario que todavía mostraba una unidad no puede omitir la comprobación del servidor.
- La existencia final es exactamente 0; nunca queda negativa.
- El intento rechazado no deja otra venta ni detalles parciales y no descuenta stock.
- Las operaciones se registran sin crear automáticamente un pago, como corresponde al flujo de venta de stock.
- Al actualizar el inventario en ambas sesiones, el mueble aparece agotado.

La evidencia de ejecución deberá identificar las dos cuentas de prueba, el producto utilizado y los resultados de ambas sesiones. Si no se dispone de dos sesiones o del stock requerido, el caso se registra como bloqueado por precondición, no como aprobado. Se ejecutará en la Guía 19.

## 9. Alcance del entregable y cierre pendiente

El documento contiene las actividades A, B y C, el reto 3.5, la reflexión 3.7 y el primer desafío opcional 3.8. Tiene catorce casos, con identificadores y orden de ejecución.

El segundo desafío opcional, redactar un plan completo de todo el emprendimiento, no forma parte de esta ampliación. Este plan se centra en CU-01, CU-02 y CU-03, la política de eliminación de clientes y el caso adicional de concurrencia. No se presenta como cobertura completa de los dieciséis casos de uso ni de todas las mejoras de Mueblex.

La actividad D consiste en guardar la versión final de este archivo mediante commit y push y verificar que aparece en GitHub. La ejecución formal de los casos y el registro de resultados corresponden a la Guía 19.

