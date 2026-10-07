# Guía 10 — Primera conexión a Supabase

## Conexión y consulta de productos

Se cargaron los scripts en este orden:

1. La librería supabase-js.
2. js/supabase-client.js.
3. js/app.js.

El cliente se llama clientesupabase. La consulta final es:

```js
async function iniciar() {
  const { data, error } = await clientesupabase.from("productos").select();

  if (error) {
    console.error("Error al leer productos:", error);
    return;
  }

  console.log("Productos encontrados:", data);
}

iniciar();
```

## Prueba con autenticación

Al principio, la consulta devolvió una lista vacía.
La tabla tenía un producto, pero el navegador no tenía sesión
y la política solo permitía acceso a usuarios autenticados.

Se creó una cuenta de prueba y se inició sesión mediante
un formulario temporal ejecutado desde la consola.
Esta adaptación permitió comprobar la lectura sin desactivar RLS.

La consulta devolvió un producto: ropero de melamina.

## Error provocado y corregido

Se cambió temporalmente productos por productoss.
Supabase devolvió el error PGRST205 y una respuesta HTTP 404:
no encontró public.productoss y sugirió public.productos.

Después de restaurar productos, la consulta volvió
a mostrar el registro correctamente.

## Reto — Consulta de clientes

Creé la función probarClientes() para consultar la tabla clientes.
La función revisa error antes de mostrar los datos y su cantidad.

Resultado comprobado:

- Clientes encontrados: []
- Cantidad de clientes: 0

El resultado coincide con lo esperado, porque no registré clientes.
La consulta de productos sigue mostrando el ropero de prueba.
