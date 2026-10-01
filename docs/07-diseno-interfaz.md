# Guía 7 — Diseño de interfaz (Mueblería de Melamina)

## Registrar venta o pedido a medida (CU-01)

- **Jerarquía:** El total a cobrar y el saldo pendiente destacan en tamaño y color llamativo en la parte inferior derecha, ya que es la información crítica que debe revisar el vendedor antes de confirmar la venta o el pedido a medida.
- **Agrupación:** La selección del tipo de venta (Stock / Pedido a medida), la búsqueda del mueble y el campo de anticipo están agrupados en la sección superior dentro del formulario de entrada.
- **Consistencia:** El botón principal de acción ("Confirmar venta / pedido") se ubica abajo a la derecha y mantiene un estilo visual destacado respecto al botón secundario ("Cancelar").

## Consultar existencia de mueble (CU-02)

- **Jerarquía:** La cantidad disponible en exhibición y el estado de stock (Disponible / Agotado) se destacan en tipografía grande dentro de la ficha de resultado del mueble.
- **Agrupación:** El cuadro de búsqueda por nombre o modelo de mueble y el filtro por categoría (Roperos, Escritorios, etc.) están agrupados en la barra superior.
- **Consistencia:** Utiliza la misma estructura de encabezado, tipografía y posición de botones ("Buscar" a la derecha) que la pantalla de Registrar Venta.

## Reflexión breve

Al diseñar el wireframe para CU-01 en el negocio real de muebles de melamina, se identificó que no bastaba con registrar productos de stock; era necesario un elemento de interfaz claro para elegir entre "Venta Directa" y "Pedido a Medida" con sus respectivos campos de anticipo y medidas en cm. Se resolvió incluyendo un control de selección (tabs/radio buttons) en la parte superior que conmuta dinámicamente los campos necesarios según la modalidad elegida.

## Desafíos opcionales

- **Control de interfaz para pedidos a medida:** Se añadió una sección dinámica en la pantalla de venta que habilita los campos de especificaciones técnicas (alto x ancho x profundidad), color de melamina elegida y monto de anticipo cuando se selecciona la opción de pedido a medida.
