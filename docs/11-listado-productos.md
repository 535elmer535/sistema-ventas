# Guía 11 — Listado de muebles

## Estado cargando

Antes de consultar Supabase, la tabla muestra
“Cargando productos...”.

Para capturar este estado añadí una espera temporal
de cinco segundos. Después la retiré del código.

![Estado cargando](/diagramas/guia11-cargando.jpg)

## Estado vacío

Probé una consulta filtrada por id_producto = -1.
La tabla mostró “Todavía no hay productos registrados”.

No eliminé el ropero. Después retiré el filtro.

![Estado vacío](/diagramas/guia11-vacio.jpg)

## Estado con datos

La tabla muestra el ropero de melamina,
con precio 1200 y existencia 3.

La consulta se realizó con una sesión iniciada,
manteniendo RLS activo.

![Estado con datos](/diagramas/guia11-con-datos.jpg)

## Reto — Listado de clientes

Reutilicé la consulta a Supabase, la comprobación de errores,
los mensajes de carga y vacío, y map con join e innerHTML.

Adapté la tabla a dos columnas: Nombre y Teléfono.
Usé las propiedades nombre y contacto de la tabla clientes.

Comprobé el estado vacío antes de registrar clientes.
Después registré un cliente y comprobé que su nombre
y contacto aparecen en pantalla.

También comprobé visualmente “Cargando clientes...” mediante
una espera temporal de cinco segundos, que después retiré.
