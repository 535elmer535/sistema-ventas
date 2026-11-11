# Guía 7 — Diseño de interfaz actual de Melanova

Actualización: 11/11/2026. Referencia: index.html y estilos/módulos del ZIP. Los wireframes y capturas antiguos son antecedentes, no una descripción exacta de la versión actual.

## Acceso

La versión recibida utiliza el diseño B: panel de marca y formulario sobre una imagen de interior. ¿Olvidaste tu contraseña? o Recuperar mi cuenta cambia a la vista de ayuda con correo y administrador. El botón del ojo permite mostrar u ocultar lo escrito; Recordarme comienza desactivado. La autorización se mantiene en Auth y en las funciones del servidor, independientemente del diseño.

## Navegación y disposición

Las vistas son Inicio, Inventario, Ventas, Pedidos, Clientes, Reportes y Administración. En pantallas pequeñas el menú se despliega mediante su botón. La distribución cambia con el ancho disponible; no se bloquea el desplazamiento para forzar todo dentro de una pantalla.

- **Inicio:** bienvenida, cuatro indicadores y cuatro bloques de acciones, gráfico semanal, últimas ventas y próximas entregas. Los pedidos por entregar excluyen los completamente entregados. El indicador de existencias de 0 a 3 incluye agotados.
- **Inventario:** registro de muebles y reposición para administradores; tabla de existencias, edición de precio e historial de reposiciones. La búsqueda local filtra las filas y hay páginas de ocho registros. El selector de categoría pertenece al registro de un mueble: no es un filtro por categoría del listado.
- **Ventas:** en escritorio, Registrar venta a la izquierda e Historial de ventas a la derecha; en pantallas estrechas se apilan. La lista temporal muestra cantidades, precio unitario, subtotal y acción Quitar. Confirmar venta registra la operación sin cobrar automáticamente; los cobros se registran en el detalle.
- **Pedidos:** formulario propio con cliente, medidas, color, cantidad, precio, fecha estimada y lista de muebles. Permite anticipo o pago inicial. El historial abre detalle, cobros, taller y datos de entrega.
- **Clientes:** registro y listado en columnas cuando hay espacio; en móvil se apilan. Búsqueda local, actualización y páginas de ocho filas. La eliminación requiere administrador y puede ser impedida por relaciones históricas.
- **Reportes:** consulta por período; bloques separados para valor vendido, cobros, devoluciones y neto; consulta complementaria de muebles más vendidos. El neto no equivale a ganancia.
- **Administración:** categorías, creación de cuentas, acceso de usuarios e historial para administradores; cambio de contraseña propia disponible también al vendedor.

## Criterios de presentación

Se conservan la paleta verde, crema y dorado, encabezados legibles, etiquetas de campos, avisos de estado y botones de acción. Las tablas pueden convertirse en tarjetas o permitir desplazamiento horizontal según su sección. El detalle de una operación conserva sus datos aunque cambie la distribución visual.

## Diferencia con el planteamiento inicial

El diseño inicial proponía un formulario combinado de venta y pedido con pestañas o selector. La implementación actual separa Ventas y Pedidos en vistas distintas. No se debe afirmar que existen esas pestañas o un filtro por categoría que la página no incluye.

## Verificación pendiente de esta versión

Las capturas anteriores demuestran pantallas de su fecha. Después de sustituir archivos, comprobar acceso, recuperación, navegación, los dos roles y la presentación en escritorio y móvil. No se han generado capturas nuevas ni se ha realizado una prueba visual en el navegador durante esta corrección documental.
