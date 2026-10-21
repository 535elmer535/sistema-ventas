# Guía 17: Validaciones y manejo de errores

## Actividad A: Validación de ventas

Se creó la función validarVenta({ idProducto, cantidad }).

Comprueba que el producto exista en el listado cargado y que
la cantidad sea un número entero positivo dentro del rango permitido.

Se utiliza al agregar un mueble y al revisar la lista antes de
guardar la venta. Los errores se muestran en mensaje-venta
y detienen la operación antes de enviar los datos a Supabase.

También se comprueba que los precios y el total de la lista
sean válidos.

## Actividad B: Manejo de errores

El registro de venta ya utilizaba try/catch y comprobaba los
errores de los dos insert mediante throw.

Se agregó manejarError(error, selector, texto) para centralizar
el registro del error técnico en la consola y mostrar un mensaje
comprensible en el elemento indicado.

Se conserva el bloqueo del envío cuando no se puede confirmar
el resultado, para evitar repetir una venta que podría haberse guardado.

## Actividad C: Pruebas de validación

Las pruebas se realizaron en “Registrar venta de muebles en stock”,
con el producto ropero seleccionado.

| Caso           | Acción         | Mensaje observado                                                 | Resultado                |
| -------------- | -------------- | ----------------------------------------------------------------- | ------------------------ |
| Cantidad vacía | Agregar mueble | La cantidad debe ser mayor a cero.                                | No se agregó a la lista. |
| Cantidad 0     | Agregar mueble | La cantidad debe ser mayor a cero.                                | No se agregó a la lista. |
| Cantidad -1    | Agregar mueble | La cantidad debe ser mayor a cero.                                | No se agregó a la lista. |
| Cantidad 1.5   | Agregar mueble | La cantidad debe ser un número entero dentro del rango permitido. | No se agregó a la lista. |

En los intentos inválidos, la lista permaneció vacía y el total
se mantuvo en Bs 0.00.

Como “Agregar mueble” modifica únicamente la lista temporal
y la validación detuvo esa acción, esos intentos no enviaron
solicitudes para registrar ventas en Supabase.

### Prueba sin seleccionar producto

No aplica desde el desplegable actual, porque siempre mantiene
un producto seleccionado cuando hay productos disponibles.

### Prueba de venta válida

Después de los intentos inválidos:

1. Se seleccionó ropero y cantidad 1.
2. Se pulsó Agregar mueble.
3. La lista mostró un total de Bs 1200.00.
4. Se pulsó Registrar venta una sola vez.

Mensaje observado:

“Venta 6 registrada correctamente con 1 muebles diferentes.”

La lista temporal quedó vacía después del registro.

### Comprobación en Supabase

En ventas se confirmó:

- id_venta: 6.
- tipo_venta: directa_stock.
- total: 1200.
- estado_pago: pendiente.

En detalle_ventas se confirmó:

- id_detalle: 5.
- id_venta: 6.
- id_producto: 1.
- cantidad: 1.
- precio_unitario: 1200.
- subtotal: 1200.

### Evidencias

![Cantidad inválida](/diagramas/guia17-cantidad-invalida.png)

![Venta válida](/diagramas/guia17-venta-valida.png)

## Reto 3.5: Validar la edición de productos

Se creó validarEdicionProducto({ precio, existencia }) y se
utiliza antes de actualizar el producto en Supabase.

La función rechaza precios menores o iguales a cero y existencias
negativas, decimales o fuera del rango de enteros permitido.

Se conservaron también las validaciones del HTML. En las pruebas,
el navegador detectó los valores inválidos antes de ejecutar
el envío del formulario.

### Pruebas realizadas

| Caso          | Aviso observado del navegador             | Resultado                                      |
| ------------- | ----------------------------------------- | ---------------------------------------------- |
| Precio 0      | El valor debe ser superior o igual a 0,01 | Se rechazó. La tabla conservó el precio 1200.  |
| Existencia -5 | El valor debe ser superior o igual a 0    | Se rechazó. La tabla conservó la existencia 3. |

Estas pruebas comprueban el rechazo desde la interfaz mediante
la validación del navegador. No ejecutan por sí solas la función
de validación de JavaScript.

Después se pulsó Cancelar edición.

### Reutilización del manejo de errores

manejarError() recibe el error, el selector del elemento donde
se muestra el mensaje y un texto para el usuario.

En ventas se utiliza #mensaje-venta y en edición de productos
se utiliza #mensaje-producto.

El update está dentro de try/catch y sus errores se lanzan con
throw para que catch los gestione mediante manejarError().

### Evidencias

![Precio cero rechazado](/diagramas/guia17-precio-cero.png)

![Existencia negativa rechazada](/diagramas/guia17-existencia-negativa.png)

## Reflexión 3.7

La instrucción if (errorVenta) detecta que Supabase devolvió
un error. Usar throw errorVenta dentro de try interrumpe el
proceso y lleva ese error al catch.

Esto permite gestionar los errores de las consultas y otras
excepciones mediante manejarError(), evitando continuar con
el detalle cuando falló el registro de la venta.

## Opcionales 3.8

### Manejo de errores al eliminar productos

Se reutilizó manejarError() en el catch de eliminar producto.

Se conserva un mensaje específico cuando el producto tiene
registros relacionados. Para otros errores se muestra un
mensaje de resultado no confirmado y el detalle técnico
queda en la consola.

### Bloqueo durante el guardado

El proyecto ya utiliza guardandoVenta y actualizarBotonesVenta()
para bloquear los controles mientras se procesa la venta.

El bloque finally termina el estado de guardado y actualiza
los botones. Si el resultado no se pudo confirmar,
ventaPorRevisar conserva el bloqueo para evitar duplicados.

### Adaptación a la mueblería

La validación se aplica al agregar cada mueble y nuevamente
a la lista completa antes de registrar la venta, porque una
venta puede incluir varios muebles de melamina.
