# Guía 19 — Ejecución de pruebas y corrección de errores de Mueblex

## 1. Referencia de la ejecución

- Plan utilizado: docs/18-plan-pruebas.md, versión subida con el commit 4a15a91.
- Fecha de preparación de este documento: 28/10/2026.
- Proyecto: Mueblex, aplicación web de gestión de una mueblería de melamina.
- Entorno observado: aplicación de la carpeta original sistema-ventas, abierta mediante Live Server en Chrome, dirección http://127.0.0.1:5500/index.html, conectada al proyecto de Supabase configurado. CP-14 utilizó además una ventana incógnita independiente.
- Alcance: catorce casos del plan y, posteriormente, auditoría del reto y regresiones de los errores que se confirmen.

## 2. Criterios de registro

- Pendiente: todavía no se ejecutó formalmente el caso.
- En curso: se están realizando sus pasos o reuniendo las verificaciones necesarias.
- Bloqueado: falta una precondición que impide ejecutar el caso. No equivale a Pasó ni a Falló.
- Pasó: se siguieron sus pasos y se comprobaron todos los resultados esperados.
- Falló: se observó un resultado distinto del esperado. Debe vincularse a un bug documentado.
- Registrar fecha, resultado observado y evidencias al ejecutar, no antes. Las pruebas informales anteriores no se contabilizan automáticamente como ejecuciones formales.
- Si se corrige y reprueba un caso, conservar su primer resultado y añadir la regresión con su fecha. No borrar la falla inicial.
- Cada bug se cierra únicamente después de comprobar mediante regresión que se resolvió. No se inventan fallas ni se rompe código deliberadamente para simular un bug real. Si no aparecen fallas, se amplía la exploración de casos límite y se registra lo realmente observado.

## 3. Actividad A — Resultados de ejecución

| Orden | Caso | Prueba | Primer resultado | Fecha de ejecución | Evidencia u observación |
| --- | --- | --- | --- | --- | --- |
| 1 | CP-04 | Impedir registrar una venta sin sesión | Pasó | 28/10/2026 | Sin sesión, servidor HTTP 401 / 42501; venta del intento inexistente y stock 5 sin cambios |
| 2 | CP-10 | Rechazar el registro de un mueble como vendedor | Pasó | 28/10/2026 | Rol vendedor confirmado; HTTP 400 / P0001; productos creados por el intento 0 |
| 3 | CP-12 | Impedir que un vendedor elimine un cliente | Pasó | 28/10/2026 | DELETE del vendedor devolvió []; cliente 8 intacto y sin operaciones asociadas |
| 4 | CP-13 | Permitir que un administrador elimine un cliente sin relaciones | Pasó | 28/10/2026 | Administrador eliminó cliente 8; consulta final confirmó 0 registros del cliente y 5 restantes |
| 5 | CP-07 | Consultar la existencia de un mueble registrado | Pasó | 28/10/2026 | Producto 6: nombre y precio coincidentes, existencia 5, Disponible; lectura posterior sin cambios |
| 6 | CP-08 | Buscar un mueble sin coincidencias | Pasó | 28/10/2026 | Buscador mostró 0 coincidencias; cuatro productos conservaron nombre, precio y stock |
| 7 | CP-09 | Registrar un mueble como administrador | Pasó | 28/10/2026 | Producto 7 creado una vez, categoría 4, Bs 350, stock 4, Disponible y visible en selector de ventas |
| 8 | CP-11 | Rechazar un precio cero al registrar un mueble | Pasó | 28/10/2026 | Validación HTML exigió mínimo 0,01; consulta confirmó 0 productos con el nombre del intento |
| 9 | CP-01 | Registrar una venta válida de stock | Pasó | 28/10/2026 | Venta 14 por Bs 700, vendedor de prueba, detalle de 2 unidades del producto 7; stock 4 a 2 y 0 pagos |
| 10 | CP-14 | Dos vendedores intentan vender la última unidad | Pasó | 28/10/2026 | Dos cuentas con listas preparadas: venta 15 de elmer por Bs 100; segundo intento rechazado, stock 0 y Agotado en ambas sesiones |
| 11 | CP-03 | Rechazar una cantidad cero | Pasó | 28/10/2026 | Aviso de cantidad mayor a cero, lista vacía y confirmación deshabilitada; stock 2, ventas 14 y detalles 12 sin cambios |
| 12 | CP-05 | Rechazar una cantidad superior al stock mostrado | Pasó | 28/10/2026 | Cantidad 3 rechazada con existencia 2; lista vacía, confirmación deshabilitada y recuentos 14 ventas / 12 detalles sin cambios |
| 13 | CP-02 | Registrar un pedido a medida con anticipo | Pasó | 28/10/2026 | Venta 16 activa por Bs 200, una especificación y un anticipo de Bs 50 en efectivo del vendedor; saldo 150 e inventario sin cambios |
| 14 | CP-06 | Rechazar un anticipo superior al total del pedido | Pasó | 28/10/2026 | Anticipo 250 rechazado para total 200; 15 ventas, 5 especificaciones y 9 pagos sin cambios; inventario intacto |

## 4. Bitácora de cada ejecución

Para cada caso ejecutado, añadir una entrada con esta estructura:

```text
Caso: CP correspondiente
Fecha y hora local:
Entorno y cuenta/rol utilizados:
Datos iniciales e identificadores:
Pasos realizados:
Resultado observado:
Comparación con los resultados esperados:
Estado: Pasó / Falló / Bloqueado
Evidencias: rutas de los archivos de diagramas/
Bug relacionado: si corresponde
```

No registrar contraseñas, tokens de sesión ni claves privadas en la bitácora ni en las capturas. Para identificar cuentas de prueba basta su nombre, rol o identificador de perfil cuando sea necesario.

### CP-04 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Entorno observado: Mueblex en navegador Chrome con DevTools; Supabase Table Editor y SQL Editor para verificación de lectura.
- Cuenta del intento: ninguna sesión de usuario activa. La consulta administrativa posterior en Supabase solo verificó los datos; no realizó el intento de venta.
- Datos iniciales: producto 6, Mueble de prueba sin stock, categoría 4, precio Bs 120, existencia 5.
- Datos enviados: cantidad 1 y precio unitario de 12000 centavos.
- Identificador de solicitud: fc9b438c-eaba-4f81-8b09-fe86bb5c3cee.

**Pasos y resultados observados:**

1. Se consultó el producto en el Table Editor: existencia inicial 5.
2. El usuario cerró sesión en Mueblex y recargó. La captura mostró el formulario de inicio de sesión y el panel interno oculto.
3. En la consola se comprobó la ausencia de sesión antes de intentar llamar a registrar_venta_stock con los datos válidos del producto y un identificador nuevo.
4. La respuesta mostró sesionActiva false, HTTP 401, datos null y código 42501: permission denied for function registrar_venta_stock.
5. Desde el SQL Editor se consultó el producto y se contó el número de ventas con ese identificador de solicitud. El resultado mostró existencia 5 y ventas_creadas_por_el_intento 0.

**Comparación con el resultado esperado:** el acceso interno permaneció oculto, el servidor denegó el intento sin sesión y no se creó la venta ni se descontaron existencias. No hay venta del intento a la cual asociar detalles. El rechazo de autorización es el resultado correcto del caso, no un bug.

**Evidencias recibidas y nombres indicados para conservarlas en el proyecto:**

- image(20261028-193111).png → diagramas/guia19-cp04-stock-antes.png.
- image(20261028-193640).png → diagramas/guia19-cp04-sin-sesion.png.
- image(20261028-193930).png → diagramas/guia19-cp04-rechazo-servidor.png.
- image(20261028-194221).png → diagramas/guia19-cp04-verificacion-final.png.

Las capturas se revisaron en la conversación y se propusieron esos nombres para conservarlas. No se ha inspeccionado la existencia de copias en diagramas de la PC del usuario ni se presume que su envío a la conversación las guarde automáticamente allí.

**Bug relacionado:** ninguno detectado en este caso.

### CP-10 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada: vendedor de prueba; rol vendedor confirmado mediante consulta del perfil correspondiente a la sesión.
- Interfaz: Inventario mostró historial de reposiciones y consulta de existencias, sin formulario para registrar muebles ni acciones de editar precio o eliminar productos.
- Nombre único del intento: CP10-mueble-4eb4c113-1431-498c-a438-e903b6d0c88a.
- Datos enviados: categoría 4, precio 35000 centavos (Bs 350) y existencia inicial 4. La categoría 4 ya estaba presente en productos existentes del proyecto.

**Pasos y resultados observados:**

1. El usuario inició sesión como vendedor y mostró el inicio de Inventario sin el formulario de registro.
2. El código de prueba comprobó que había sesión, que el perfil tenía rol vendedor y que el nombre único del intento no existía: productosAntes 0.
3. Con ese mismo cliente autenticado se intentó llamar a registrar_mueble_seguro con datos válidos.
4. La consola mostró HTTP 400, datos null y P0001: Solo el administrador puede registrar muebles.
5. Desde el SQL Editor se contó el número de productos con el nombre exacto del intento: productos_creados_por_el_intento 0.

**Comparación con el resultado esperado:** el vendedor no pudo acceder al formulario ni registrar el producto mediante la función del servidor. El rechazo del servidor corresponde a la regla de autorización; no se documenta como un bug.

**Evidencias revisadas:** image(20261028-194909).png, image(20261028-195206).png e image(20261028-195452).png. Las capturas se recibieron en la conversación; no se presume que todas se hayan guardado en diagramas de la PC. El resultado y los datos necesarios para repetir la comprobación quedan registrados en esta bitácora.

**Bug relacionado:** ninguno detectado en este caso.

### CP-12 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta del intento: vendedor de prueba, con rol vendedor comprobado mediante el perfil de la sesión.
- Cliente creado exclusivamente para CP-12 y CP-13: id_cliente 8, nombre Cliente prueba CP12 CP13 20261028, contacto 00000000 y dirección NULL.
- Precondición comprobada: cero operaciones en ventas asociadas al cliente; por tanto, el rechazo no se atribuye a una restricción de clave foránea por ventas o pedidos existentes.

**Pasos y resultados observados:**

1. Se registró el cliente de prueba desde Clientes. El listado de la cuenta de vendedor mostró la acción Editar, sin Eliminar.
2. El código de prueba comprobó la sesión, el rol vendedor, la existencia de un único cliente con el nombre exacto y la ausencia de operaciones asociadas.
3. Se intentó DELETE en clientes filtrando tanto por id_cliente 8 como por el nombre exacto, con solicitud de devolver los identificadores eliminados.
4. La respuesta mostró HTTP 200, filasEliminadas [] y error null: ninguna fila fue eliminada por ese intento.
5. Desde el SQL Editor se consultó el cliente 8 y sus relaciones. El cliente seguía existiendo con el mismo nombre, contacto 00000000, dirección NULL y operaciones_asociadas 0.

**Comparación con el resultado esperado:** el vendedor no tuvo la acción Eliminar ni logró borrar el cliente desde el servidor. Que la respuesta tenga HTTP 200 no significa que la eliminación se autorizó: el conjunto de filas eliminadas fue vacío y se verificó posteriormente la permanencia del registro mediante una consulta administrativa independiente.

**Evidencias revisadas:** image(20261028-195853).png, image(20261028-200138).png e image(20261028-200339).png. Estas evidencias fueron revisadas en la conversación; su copia local en diagramas no se presume automática.

**Bug relacionado:** ninguno detectado en este caso.

**Dato de preparación para CP-13:** el cliente 8 permanece disponible y sin operaciones asociadas al finalizar CP-12. CP-13 debe ejecutarse con cuenta de administrador y sobre ese cliente de prueba, no sobre otros clientes.

### CP-13 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal de eliminación**.
- Cuenta observada: elmer, identificada como Administrador en la interfaz.
- Cliente de prueba: id_cliente 8, Cliente prueba CP12 CP13 20261028. Al terminar CP-12 se comprobó que existía y no tenía operaciones asociadas.

**Pasos y resultados observados:**

1. El usuario cambió a la cuenta de administrador y abrió Clientes.
2. Eliminó únicamente el cliente de prueba. La interfaz mostró Cliente “Cliente prueba CP12 CP13 20261028” eliminado correctamente.
3. El listado actualizado conservó los cinco clientes anteriores: elmer, Cliente de prueba editado, venta en tienda, santiago y Cliente prueba dirección, con sus datos visibles coincidentes con la captura previa.
4. Desde el SQL Editor se consultó el número de registros con id_cliente 8 y el de otros clientes. La consulta completa sobre public.clientes devolvió cliente_de_prueba_restante 0 y otros_clientes 5.

**Comparación con el resultado esperado:** el administrador dispuso de la acción Eliminar y pudo borrar el cliente de prueba sin relaciones. La eliminación se verificó en el servidor y los demás clientes permanecieron en el listado.

**Incidencia de la herramienta de verificación:** la primera consulta de lectura proporcionada por el asistente omitía FROM public.clientes y devolvió 42703. Se corrigió la consulta y se repitió solo la lectura, sin repetir la eliminación. Fue un error en la instrucción de comprobación, no un bug de Mueblex ni una falla de su autorización; no se contabiliza como BUG del proyecto.

**Evidencias revisadas:** image(20261028-200657).png (eliminación en la aplicación), image(20261028-200822).png (consulta incompleta) e image(20261028-200938).png (verificación corregida con 0 y 5).

**Bug del proyecto relacionado:** ninguno detectado en este caso.

### CP-07 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada en Mueblex: vendedor de prueba.
- Producto utilizado: id_producto 6, Mueble de prueba sin stock.
- Datos iniciales consultados en Supabase: precio Bs 120 y existencia 5.

**Pasos y resultados observados:**

1. Se ejecutó SELECT de id_producto, nombre, precio y existencia del producto 6 en Supabase: nombre Mueble de prueba sin stock, precio 120 y existencia 5.
2. Con la cuenta de vendedor se abrió Inventario y se localizó la fila del mismo mueble.
3. La aplicación mostró el mismo nombre, precio 120, existencia 5 y estado Disponible, coherente con el umbral de más de tres unidades.
4. Se repitió la consulta de lectura en Supabase después de consultar Inventario. El producto conservó id 6, nombre, precio 120 y existencia 5.

**Comparación con el resultado esperado:** los datos de la interfaz coincidieron con el servidor y la lectura posterior confirmó que el producto no se modificó. Durante este caso no se enviaron formularios de venta, pedido, edición ni reposición. Las otras filas visibles mostraron también los avisos de stock bajo para existencias 2 y 3, sin que esas observaciones sustituyan pruebas específicas de otros escenarios.

**Evidencias revisadas:** image(20261028-201153).png (lectura inicial), image(20261028-201333).png (Inventario con cuenta de vendedor) e image(20261028-201554).png (lectura posterior).

**Bug relacionado:** ninguno detectado en este caso.

### CP-08 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada: vendedor de prueba.
- Texto utilizado: MuebleInexistentePlan18.
- Precondición: los cuatro nombres de producto conocidos no contenían ese texto.

**Pasos y resultados observados:**

1. Se escribió MuebleInexistentePlan18 en el buscador general de Mueblex y se consultaron los resultados.
2. El panel mostró 0 coincidencias mostradas. En el grupo Productos apareció Sin coincidencias, sin productos anteriores ni un error de conexión. Clientes y Ventas también mostraron Sin coincidencias, aunque esos grupos no determinan el resultado principal de CP-08.
3. Desde el SQL Editor se consultaron id_producto, nombre, precio y existencia de todos los productos ordenados por identificador.
4. Permanecían los mismos cuatro registros: producto 1 ropero, precio 1200 y existencia 3; producto 2 escritorio, precio 550 y existencia 5; producto 5 Velador de melamina de prueba, precio 300 y existencia 2; producto 6 Mueble de prueba sin stock, precio 120 y existencia 5.

**Comparación con el resultado esperado:** la búsqueda informó correctamente la ausencia de coincidencias y no alteró los nombres, precios ni existencias de los productos comparados. La consulta posterior confirma también que no se creó otro producto durante este caso.

**Evidencias revisadas:** image(20261028-201945).png (búsqueda) e image(20261028-202220).png (consulta de inventario posterior).

**Bug relacionado:** ninguno detectado en este caso.

### CP-09 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada: elmer, Administrador.
- Nombre único utilizado: Velador plan18 CP09 20261028. No aparecía entre los cuatro productos consultados antes de este caso.
- Datos confirmados: id_producto 7, id_categoria 4 (escritorios), precio Bs 350 y existencia inicial 4.

**Pasos y resultados observados:**

1. El usuario cambió a la cuenta de administrador y registró el mueble desde Inventario. La aplicación confirmó el nombre y el código 7; el formulario quedó reiniciado.
2. Se consultó el nombre exacto mediante una lectura de productos con su categoría. Supabase devolvió una sola fila, con código 7, categoría 4 escritorios, precio 350 y existencia 4.
3. En Inventario, la nueva fila mostró el nombre esperado, precio 350, existencia 4 y estado Disponible.
4. En la misma captura se conservaron los cuatro productos anteriores con sus precios y existencias: producto 1, 1200 y 3; producto 2, 550 y 5; producto 5, 300 y 2; producto 6, 120 y 5.
5. El usuario abrió Ventas y seleccionó el nuevo mueble en el desplegable. La lista temporal permaneció vacía y el total en Bs 0: no se confirmó una venta para esta comprobación.

**Comparación con el resultado esperado:** el administrador pudo registrar un solo producto con los datos previstos, este quedó disponible en Inventario y en el selector de ventas, y las existencias de los muebles anteriores permanecieron sin cambios. La categoría seleccionada es válida; su adecuación comercial al nombre Velador no es la condición de autorización ni de integridad que evalúa este caso.

**Evidencias revisadas:** image(20261028-202532).png (confirmación), image(20261028-202651).png (lectura del servidor), image(20261028-202739).png (Inventario) e image(20261028-202842).png (selector de ventas).

**Bug relacionado:** ninguno detectado en este caso.

### CP-11 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada: elmer, Administrador.
- Nombre del intento: Mueble precio cero CP11 20261028.
- Datos del formulario: categoría ropero, precio 0 y existencia inicial 4.

**Pasos y resultados observados:**

1. El usuario completó el formulario Registrar mueble con los datos indicados e intentó enviarlo.
2. El navegador mantuvo los campos y mostró sobre el precio: El valor debe ser superior o igual a 0,01. No apareció una confirmación de registro.
3. Desde el SQL Editor se contó el número de productos con el nombre exacto del intento. El resultado productos_creados_por_el_intento fue 0.

**Comparación con el resultado esperado:** la validación HTML impidió el envío con precio cero y no se creó el producto. Este caso evalúa ese rechazo en el formulario; no equivale a una prueba de elusión de la validación mediante una llamada directa del administrador a la función SQL.

**Evidencias revisadas:** image(20261028-203310).png (validación del mínimo) e image(20261028-203439).png (verificación de cero productos creados).

**Bug relacionado:** ninguno detectado en este caso.

### CP-01 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada: vendedor de prueba.
- Datos iniciales consultados en Supabase: producto 7, Velador plan18 CP09 20261028, precio Bs 350 y existencia 4.
- Cantidad vendida: 2. Total esperado: 2 × Bs 350 = Bs 700. Existencia final esperada: 4 − 2 = 2.

**Pasos y resultados observados:**

1. El usuario consultó el producto 7 en Supabase y luego, con cuenta de vendedor, agregó dos unidades a la lista de venta.
2. La lista mostró una sola línea, cantidad 2, precio unitario 350, subtotal 700 y total Bs 700.
3. Se confirmó la venta una sola vez. La aplicación informó Venta 14 registrada correctamente. Total Bs 700. Las existencias se actualizaron.
4. La lista temporal quedó vacía, el total del formulario volvió a Bs 0 y el botón Confirmar venta quedó deshabilitado mientras la lista permaneció vacía.
5. El detalle mostró la venta 14 Activa, responsable vendedor de prueba y estado del pago pendiente. Mostró dos unidades del mueble a Bs 350, total Bs 700, cobros Bs 0, saldo Bs 700 y ningún cobro en el historial.
6. Una consulta administrativa de lectura unió ventas, usuarios, detalle_ventas y productos y contó los pagos de la venta 14. Devolvió una fila: responsable vendedor de prueba, total 700, producto 7, cantidad 2, precio_unitario 350, subtotal 700, stock_actual 2 y pagos_registrados 0.

**Comparación con el resultado esperado:** la venta y su detalle quedaron registrados por los importes y la cantidad previstos; las existencias disminuyeron de 4 a 2 y no se creó un cobro automático. El usuario responsable coincide con la cuenta de vendedor usada en la ejecución.

**Evidencias revisadas:** image(20261028-203700).png (datos iniciales), image(20261028-203826).png (lista preparada), image(20261028-204017).png (confirmación), image(20261028-204048).png (detalle) e image(20261028-204226).png (verificación del servidor).

**Bug relacionado:** ninguno detectado en este caso.

### CP-14 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal con la modalidad de segunda lista sin actualizar prevista en el plan**.
- Entorno: Chrome, Mueblex en http://127.0.0.1:5500/index.html; ventana normal con elmer (Administrador) y ventana incógnita con vendedor de prueba. Son dos cuentas autorizadas y sesiones independientes.
- Producto preparado: id_producto 8, Mueble última unidad CP14 20261028, precio Bs 100 y existencia inicial 1. Se creó exclusivamente para esta comprobación.

**Pasos y resultados observados:**

1. Ambas cuentas agregaron una unidad del mismo producto antes de confirmar. Las dos listas mostraron cantidad 1, precio 100 y total Bs 100.
2. Se indicó confirmar primero como elmer y después como vendedor, sin recargar ni modificar la segunda lista. Las evidencias muestran el resultado de esas dos confirmaciones; no se afirma que las solicitudes llegaran simultáneamente al servidor.
3. La cuenta de administrador mostró Venta 15 registrada correctamente, total Bs 100; su lista se vació y el total volvió a cero.
4. La cuenta de vendedor conservó su lista y recibió Stock insuficiente para Mueble última unidad CP14 20261028. Disponible: 0.
5. La consulta de detalle_ventas para el producto 8, unida a ventas y usuarios, devolvió una sola fila: venta 15, responsable elmer, estado activa, cantidad 1, precio unitario 100, subtotal 100 y total 100. El recuento de pagos de esa venta fue 0. No apareció otra venta con detalle de ese producto.
6. La consulta independiente de productos confirmó existencia final 0, sin valor negativo.
7. Después de F5, Inventario mostró el producto con existencia 0 y estado Agotado en las dos sesiones. El usuario confirmó expresamente que ambas cuentas mostraban Agotado.

**Comparación con el resultado esperado:** se vendió una sola unidad y la segunda lista con stock obsoleto no permitió otra venta del producto. Los datos de venta y detalle son coherentes, no se registró un cobro automático y las dos interfaces reflejaron el agotamiento al recargar. La comprobación realizada cubre la variante secuencial con lista obsoleta del plan; no mide una carrera de solicitudes estrictamente simultáneas ni inspecciona por separado posibles cabeceras huérfanas sin detalles.

**Evidencias revisadas:** image(20261028-204617).png y image(20261028-204653).png (preparación del producto); image(20261028-205141).png e image(20261028-205156).png (listas de ambas cuentas); image(20261028-205709).png e image(20261028-205732).png (confirmación y rechazo); image(20261028-205831).png (venta y detalle); image(20261028-205927).png (existencia final); image(20261028-210014).png e image(20261028-210039).png (Agotado en ambas interfaces).

**Bug relacionado:** ninguno detectado en este caso.

### CP-03 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada: vendedor de prueba.
- Producto: id_producto 7, Velador plan18 CP09 20261028.
- Datos iniciales del servidor: existencia 2, total de registros en ventas 14 y en detalle_ventas 12. Estos recuentos son cantidades de registros, no el último identificador.

**Pasos y resultados observados:**

1. Se consultaron la existencia del producto y los recuentos globales de ventas y detalles antes del intento.
2. Con la lista de venta vacía, se seleccionó el producto 7, se escribió cantidad 0 y se pulsó Agregar mueble.
3. La aplicación mostró La cantidad debe ser mayor a cero. La lista permaneció vacía, el total en Bs 0.00 y Confirmar venta deshabilitado.
4. Se repitió la misma consulta en Supabase: existencia 2, total_ventas 14 y total_detalles 12. El usuario confirmó que los resultados no cambiaron.

**Comparación con el resultado esperado:** la cantidad cero fue rechazada sin agregar una línea ni habilitar la confirmación; no hubo nuevos registros de venta o detalle ni descuento de existencias.

**Evidencias revisadas:** image(20261028-210247).png (lectura inicial), image(20261028-210425).png (aviso y lista vacía) e image(20261028-210512).png (lectura posterior).

**Bug relacionado:** ninguno detectado en este caso.

### CP-05 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta observada: vendedor de prueba.
- Producto: id_producto 7, Velador plan18 CP09 20261028; existencia inicial E = 2, confirmada en Inventario.
- Referencia de lectura anterior: 14 registros en ventas y 12 en detalle_ventas al terminar CP-03.

**Pasos y resultados observados:**

1. En Inventario se comprobó que el producto tenía existencia 2 y estado Stock bajo.
2. En Ventas, con la lista vacía, se seleccionó el mismo producto, se ingresó cantidad 3 (E + 1) y se pulsó Agregar mueble.
3. La aplicación mostró La cantidad supera la existencia mostrada. Actualiza el listado antes de continuar.
4. La lista permaneció vacía, el total en Bs 0.00 y Confirmar venta deshabilitado.
5. La consulta posterior de Supabase devolvió existencia 2, total_ventas 14 y total_detalles 12, coincidentes con la referencia anterior.

**Comparación con el resultado esperado:** la interfaz rechazó la cantidad superior al stock actualizado sin crear ventas ni detalles y sin descontar existencias. Esta comprobación corresponde a la validación al agregar; no se confunde con el rechazo del servidor de CP-14.

**Evidencias revisadas:** image(20261028-210753).png (Inventario), image(20261028-210933).png (aviso) e image(20261028-210945).png (verificación del servidor).

**Bug relacionado:** ninguno detectado en este caso.

### CP-02 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Cuenta: vendedor de prueba. Cliente: Cliente de prueba editado, contacto 00000000.
- Inventario inicial por id_producto: 1 → 3; 2 → 5; 5 → 2; 6 → 5; 7 → 2; 8 → 0.
- Especificación: Repisa de prueba del plan, medidas 40 × 60 × 25 cm, color blanco, cantidad 1, precio Bs 200 y entrega estimada 04/11/2026.

**Pasos y resultados observados:**

1. Se consultó el inventario antes de preparar el pedido.
2. Se agregó la especificación y se ingresó monto recibido 50 con método Efectivo. El formulario mostró total Bs 200 y saldo Bs 150.
3. Al confirmar se informó Pedido registrado en la venta 16, total Bs 200, recibido Bs 50 y saldo Bs 150. El formulario reinició el saldo a cero y deshabilitó el registro; el historial mostró la nueva operación del cliente correcto, responsable vendedor de prueba y pago anticipo_cobrado.
4. La consulta de ventas, usuarios y pagos para id_venta 16 devolvió una sola fila: tipo pedido_medida, estado activa, total 200, estado_pago anticipo_cobrado, monto 50, metodo_pago efectivo, tipo_pago anticipo. Tanto el responsable de la venta como el del cobro fueron vendedor de prueba.
5. La consulta de pedidos_personalizados para venta 16 devolvió una especificación con descripción, medidas, color, cantidad 1, precio y subtotal 200 y fecha 2026-11-04 coincidentes con lo ingresado.
6. La lectura posterior de todo el inventario conservó las seis existencias iniciales, sin descontar productos de catálogo.
7. Ver detalle mostró la operación activa, el cliente y vendedor correctos, las especificaciones y taller Pendiente. Mostró total Bs 200, cobros Bs 50 y saldo por cobrar Bs 150. El historial contenía un único anticipo de Bs 50 en efectivo registrado por el vendedor.

**Comparación con el resultado esperado:** se guardó el pedido con su especificación y un solo anticipo, sin alterar el stock; la interfaz y el servidor coincidieron en total, cobro, responsables y saldo.

**Evidencias revisadas:** image(20261028-211226).png (inventario inicial), image(20261028-211528).png (lista y anticipo), image(20261028-211608).png (confirmación e historial), image(20261028-211812).png (venta y pago), image(20261028-211859).png (especificación), image(20261028-211922).png (inventario posterior), image(20261028-212020).png e image(20261028-212031).png (detalle del pedido).

**Bug relacionado:** ninguno detectado en este caso.

### CP-06 — Ejecución del 28/10/2026

- Resultado: **Pasó al primer intento formal**.
- Sesión de vendedor utilizada en la continuación de CP-02; formulario de pedido nuevo.
- Cliente indicado: Cliente de prueba editado. Mueble temporal: Repisa anticipo inválido CP06, medidas 40 × 60 × 25 cm, color blanco, cantidad 1, precio Bs 200 y fecha 2026-11-04.
- Recuentos iniciales: 15 registros en ventas, 5 en pedidos_personalizados y 9 en pagos.

**Pasos y resultados observados:**

1. Se consultaron los tres recuentos antes del intento.
2. Se agregó el mueble a medida y se ingresó monto recibido 250 con método Efectivo para un total de Bs 200.
3. Al intentar registrar, el navegador mostró El valor debe ser inferior o igual a 200. La aplicación mostró Monto recibido no válido en el área del saldo y conservó la lista temporal. No se mostró una confirmación de registro.
4. La misma consulta posterior devolvió 15 ventas, 5 especificaciones y 9 pagos: ningún registro nuevo por el intento.
5. La consulta posterior de productos conservó las existencias por identificador: 1 → 3; 2 → 5; 5 → 2; 6 → 5; 7 → 2; 8 → 0, coincidentes con la referencia de inventario de CP-02.

**Comparación con el resultado esperado:** el formulario rechazó el anticipo superior al total sin crear una venta, una especificación o un pago. El inventario no se modificó. La línea temporal que permanece en el formulario no es un pedido guardado.

**Evidencias revisadas:** image(20261028-212235).png (recuentos iniciales), image(20261028-212552).png (validación), image(20261028-212754).png (recuentos finales) e image(20261028-212905).png (inventario final).

**Bug relacionado:** ninguno detectado en este caso.

## 5. Actividad B — Bugs encontrados

### BUG-01 — Se rechaza un importe decimal sin cero inicial

- Origen: AUD-03, auditoría del reto de la Guía 17 sobre edición de producto; fuera de los catorce casos originales.
- Fecha de detección: 28/10/2026.
- Estado: **Cerrado tras corrección y regresión satisfactoria el 28/10/2026**.
- Severidad: **Baja**. Impide guardar una representación válida de un importe; existe la alternativa de escribir 0.50. No se observó pérdida de datos ni un importe incorrecto guardado.
- Precondiciones: cuenta elmer, Administrador; producto 8 con precio 100 y existencia 0; formulario Editar precio.

**Pasos para reproducir:**

1. Abrir Inventario y pulsar Editar precio del Mueble última unidad CP14 20261028.
2. Escribir .50 en Precio, con punto y sin cero inicial.
3. Pulsar Guardar cambios.
4. Consultar precio y existencia del producto 8 en Supabase.

**Resultado actual:** la aplicación muestra Selecciona un mueble y escribe un precio válido mayor que cero, con hasta dos decimales. El formulario permanece abierto; el servidor conserva precio 100 y existencia 0.

**Resultado esperado:** aceptar .50 como el importe positivo de cincuenta centavos, guardando precio 0.50 mediante la misma función segura y sin modificar existencias. Este valor tiene dos decimales y cumple el mínimo 0.01 del formulario.

**Causa identificada:** importeEnCentavos exige uno o más dígitos antes del punto. La entrada .50 permitida por el campo numérico se rechaza en JavaScript antes de llamar al servidor.

**Evidencias:** image(20261028-214918).png (rechazo con .50) e image(20261028-214939).png (precio 100 y existencia 0 sin cambios).

Estructura de cada bug:

```text
ID: BUG correspondiente
Origen: caso del plan o auditoría del reto
Caso de prueba relacionado:
Fecha de detección:
Precondiciones y datos utilizados:
Pasos para reproducir:
Resultado actual:
Resultado esperado:
Severidad: Crítica / Alta / Media / Baja
Justificación de severidad:
Estado: Abierto / En corrección / Pendiente de regresión / Cerrado
Evidencia:
```

## 6. Actividad C — Correcciones y regresiones

### Corrección de BUG-01

- Archivo: js/app.js. Función compartida: importeEnCentavos.
- Cambio preparado: normalizar un punto inicial a 0. antes de aplicar la validación existente. Así .50 pasa a 0.50, conservando el límite de dos decimales, el rechazo de negativos y el control de centavos enteros seguros.
- El usuario aplicó la sustitución de la función en su proyecto y repitió la prueba después de recargar. No se sustituyó el app.js completo, para preservar sus otros cambios.
- Verificación local realizada: 20 comprobaciones satisfactorias sobre la función corregida, incluyendo .50, .5, importes habituales, entradas vacías, negativas, más de dos decimales, texto y valores fuera del rango entero seguro. node --check de la copia de revisión también pasó.
- Regresión original en Mueblex, 28/10/2026: se repitió la edición del producto 8 con .50 después de aplicar el cambio. La interfaz mostró Precio actualizado correctamente, precio 0.5 y existencia 0. Supabase confirmó precio 0.5000000000000000 y existencia 0. Son representaciones del mismo importe de cincuenta centavos.
- Evidencias de regresión: image(20261028-215518).png e image(20261028-215545).png.
- Comprobaciones relacionadas realizadas el 28/10/2026: se restauró el precio del producto 8 a 100 desde Editar precio y la interfaz confirmó el cambio; se intentó guardar precio 0 y el navegador mantuvo el rechazo El valor debe ser superior o igual a 0,01; la consulta final confirmó precio 100 y existencia 0. Evidencias: image(20261028-215738).png, image(20261028-215756).png e image(20261028-215827).png.
- Alcance de la regresión: mismo caso original en la interfaz y el servidor, edición válida de un importe entero, conservación del mínimo y 20 comprobaciones locales del conversor compartido. No se repitieron todas las operaciones completas de venta, pedido y cobro después del cambio; no se presentan las ejecuciones anteriores como posteriores a la corrección.
- **Cierre:** BUG-01 cerrado el 28/10/2026. El intento original ahora guarda cincuenta centavos, la edición normal funciona, los datos inválidos siguen rechazándose y el producto de prueba quedó con precio 100 y stock 0.

## 7. Reto 3.5 — Auditoría de una mejora anterior

### Auditoría del reto de la Guía 17 — Validación al editar productos

- Estado: **Completada con un bug detectado, corregido y cerrado**, fuera del recuento de los catorce casos del plan.
- Adaptación actual de Mueblex: Editar precio modifica solo el precio; la existencia actual es de lectura. El ingreso de unidades se realiza mediante Reponer existencias y registra movimientos. Por ello, la validación de unidades se audita en ese formulario, sin habilitar edición directa del stock.

**AUD-01 — Precio cero al editar un producto existente (28/10/2026): Pasó.**

1. Con elmer, Administrador, se abrió Editar precio del producto 8, Mueble última unidad CP14 20261028. La referencia anterior era precio Bs 100 y existencia 0.
2. Se ingresó precio 0 y se intentó Guardar cambios.
3. El navegador mostró El valor debe ser superior o igual a 0,01 y mantuvo el formulario, sin confirmar una actualización.
4. La lectura posterior de public.productos para id_producto 8 confirmó precio 100 y existencia 0.

Evidencias: image(20261028-214159).png e image(20261028-214228).png.

Este resultado verifica la validación del formulario de edición, distinta del registro de producto de CP-11. No demuestra por sí solo la validación al eludir atributos HTML. No se detectó un bug en este intento.

**AUD-02 — Reposición con cantidad negativa (28/10/2026): Pasó.**

1. Con elmer, Administrador, se canceló la edición y se seleccionó el mismo producto 8 en Reponer existencias.
2. Se ingresó cantidad -5 y motivo Auditoria negativa G19 20261028; se intentó Registrar ingreso de stock.
3. El navegador mostró El valor debe ser superior o igual a 1, sin confirmar una reposición.
4. Una consulta independiente confirmó precio 100, existencia 0 y cero registros de movimientos_stock para ese producto y motivo exacto.

Evidencias: image(20261028-214500).png e image(20261028-214523).png. La validación HTML rechazó el intento; esta ejecución no elude sus atributos para probar la función SQL directamente. No se detectó un bug.

**AUD-03 — Precio .50 al editar (28/10/2026): Falló.** Se reprodujo el rechazo de una entrada de cincuenta centavos; ver BUG-01. La auditoría detectó un fallo real fuera del plan original; la corrección se aplicó, el mismo intento pasó en la aplicación del usuario y las comprobaciones relacionadas permitieron cerrar BUG-01. Se conserva este primer resultado Falló y se registra su regresión, sin sustituir la falla original por un pase inicial.

## 8. Reflexión 3.7

**Pasos para reproducir, copiados del BUG-01:**

1. Abrir Inventario y pulsar Editar precio del Mueble última unidad CP14 20261028.
2. Escribir .50 en Precio, con punto y sin cero inicial.
3. Pulsar Guardar cambios.
4. Consultar precio y existencia del producto 8 en Supabase.

**Por qué permiten reproducirlo:**

El BUG-01 muestra por qué los pasos para reproducir deben incluir el dato exacto que se escribió. Decir “no guarda el precio” no bastaba: era necesario indicar que se abrió Editar precio del producto 8, se escribió .50 sin cero inicial y se pulsó Guardar cambios. La aplicación rechazaba esa entrada y Supabase conservaba precio 100 y existencia 0. Si se hubiera probado únicamente 0.50, el fallo no se habría reproducido.

Esos mismos pasos permitieron comprobar la corrección: después de normalizar el punto inicial en importeEnCentavos, se repitió .50 y se confirmó en Supabase el precio 0.50, sin cambio de stock. Además, se verificó que precio 0 siguiera rechazándose y se restauró el precio de prueba a 100. Documentar entrada, estado inicial, acción, aviso y resultado del servidor permitió identificar la causa y demostrar el arreglo, en lugar de suponer que bastaba con cambiar el código.

## 9. Resumen de avance

- Casos del plan: 14.
- Ejecutados formalmente: 14.
- Pendientes: 0.
- En curso: 0.
- Pasaron al primer intento: 14.
- Fallaron al primer intento: 0.
- Bloqueados: 0.
- Bugs documentados: 1.
- Bugs cerrados mediante regresión: 1.
- Comprobaciones adicionales de auditoría: 3; dos pasaron inicialmente y una falló (AUD-03 / BUG-01).
- Resultado final de la auditoría: el caso que falló pasó al repetirlo después de la corrección.
- Comprobaciones locales del conversor corregido: 20 satisfactorias; no se suman a los catorce casos funcionales del plan.
- Segundo bug opcional: no se ha identificado otro bug confirmado; no se inventa uno para ampliar el recuento.

Actualizar estos recuentos a partir de las evidencias de ejecución y conservar la distinción entre casos que pasaron al primer intento y casos que pasaron después de corregir un error.

## 10. Actividad D — Commit y push

Pendiente hasta completar la ejecución, la documentación de errores y sus regresiones, la auditoría y la reflexión. Verificar después que este archivo y los cambios de código correspondientes aparecen en el repositorio.
