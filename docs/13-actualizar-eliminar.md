
# Guía 13 — Actualizar y eliminar registros

## Editar producto

Agregué botones Editar y Eliminar a la tabla de productos.

Al pulsar Editar, el formulario muestra el precio y la
existencia actuales del producto seleccionado.

Prueba realizada:
- Producto: escritorio.
- id_producto: 2.
- Precio anterior: Bs 500.
- Precio actualizado: Bs 550.
- Existencia conservada: 5.

La página mostró “Producto actualizado correctamente”.
El listado se actualizó sin recargar manualmente la página.
Comprobé el precio 550 y la existencia 5 en Supabase.

## Eliminar producto

Creé un producto de prueba:
- id_producto: 3.
- Nombre: prueba.
- Precio: Bs 10.
- Existencia: 1.

Al pulsar Eliminar, apareció una confirmación con el
nombre del producto.

Después de aceptar, el producto desapareció del listado
y apareció el mensaje de eliminación correcta.
También comprobé que desapareció de la tabla productos
en Supabase.

## Adaptación a mi proyecto

Utilicé clientesupabase como cliente de conexión.
La clave primaria de productos es id_producto, por eso
las operaciones utilizan .eq("id_producto", id).

## Reflexión breve

El filtro .eq("id_producto", id) identifica exactamente
el producto que quiero modificar o eliminar.

Sin ese filtro, la operación podría afectar todas las
filas permitidas por las políticas de acceso.
No debo suponer que Supabase siempre bloqueará una
operación sin filtro.

## Pendientes

- Agregar las capturas de las pruebas.
- Hacer commit, push y verificar los cambios en GitHub.

## Capturas de las pruebas

### Edición en la página
![Producto actualizado](/diagramas/guia13-editar.png)

### Edición comprobada en Supabase
![Precio actualizado en Supabase](/diagramas/guia13-editar-supabase.png)

### Confirmación antes de eliminar
![Confirmación de eliminación](/diagramas/guia13-confirmar-eliminar.png)

### Eliminación en la página
![Producto eliminado](/diagramas/guia13-eliminar.png)

### Eliminación comprobada en Supabase
![Tabla sin el producto de prueba](/diagramas/guia13-eliminar-supabase.PNG)


## Reto 3.5 — Editar y eliminar clientes

### Prueba de edición

Edité el cliente con id_cliente 2:
- Nombre anterior: Cliente de prueba.
- Nombre nuevo: Cliente de prueba editado.
- Teléfono conservado: 00000000.

La página mostró “Cliente actualizado correctamente”.
Comprobé el cambio en la tabla clientes de Supabase.

### Prueba de eliminación

Registré un cliente llamado “eliminar” exclusivamente
para esta prueba, sin asociarlo a ventas ni pedidos.

Al pulsar Eliminar, se solicitó confirmación.
Después de aceptar, desapareció del listado y apareció
el mensaje de eliminación correcta.

Comprobé en Supabase que el cliente ya no estaba.
Los otros dos clientes se conservaron.

### Adaptación del patrón de productos

Utilicé el mismo patrón: botones, delegación de eventos,
formulario precargado, confirmación y actualización del listado.

Adapté:
- La tabla: clientes.
- La clave primaria: id_cliente.
- Los campos editables: nombre y contacto.
- Los identificadores del formulario y las clases de los botones.
- La función de recarga: probarClientes().

El campo contacto se conserva como texto para mantener
los ceros iniciales del teléfono.


## Capturas del reto de clientes

### Edición en la página
![Cliente actualizado](/diagramas/guia13-editar-cliente.PNG)

### Edición comprobada en Supabase
![Cliente actualizado en Supabase](/diagramas/guia13-editar-cliente-supabase.PNG)

### Eliminación en la página
![Cliente eliminado](/diagramas/guia13-eliminar-cliente.PNG)

### Eliminación comprobada en Supabase
![Tabla sin el cliente eliminado](/diagramas/guia13-eliminar-cliente-supabase.PNG)


## 3.8 — Desafíos opcionales

- Agregué Cancelar edición en productos y clientes.
  Cierra y limpia el formulario sin guardar cambios.
- Agregué un resaltado verde de un segundo en la fila
  después de guardar correctamente una edición.
- Comprobé ambas funciones en la página.

