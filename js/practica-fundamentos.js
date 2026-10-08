
// Actividad B: datos de ejemplo, sin conexión a Supabase.
// const producto = {
//   nombre: "Ropero de melamina",
//   precio: 1200,
//   existencia: 3
// };

// const { nombre, precio } = producto;

// console.log(`${nombre} cuesta Bs ${precio}`);


// Actividad C: arreglo de productos.
// const productos = [
//   { nombre: "Ropero de melamina", precio: 1200, existencia: 3 },
//   { nombre: "Escritorio", precio: 500, existencia: 12 },
//   { nombre: "Centro de TV", precio: 800, existencia: 5 },
//   { nombre: "Mesa de noche", precio: 250, existencia: 15 }
// ];

// map transforma cada producto en su nombre.
// const nombres = productos.map((producto) => producto.nombre);

// console.log("Nombres:", nombres);

// filter selecciona los productos con menos de 10 unidades.
// const pocaExistencia = productos.filter(
//   (producto) => producto.existencia < 10
// );

// console.log("Productos con menos de 10 unidades:", pocaExistencia);

// find busca un producto por su nombre exacto.
// const productoEncontrado = productos.find(
//   (producto) => producto.nombre === "Escritorio"
// );

// console.log("Producto encontrado:", productoEncontrado);

// reduce acumula la suma de los precios, empezando desde 0.
// const sumaPrecios = productos.reduce(
//   (suma, producto) => suma + producto.precio,
//   0
// );

// console.log("Suma de precios: Bs", sumaPrecios);


// Actividad D: promesa simulada.
// function esperar(ms) {
//   return new Promise((resolve) =>
//     setTimeout(() => resolve("Listo"), ms)
//   );
// }

// async function probarEspera() {
//   console.log("Antes de esperar");

//   const resultado = await esperar(1000);

//   const resultado = esperar(1000);

//   console.log("Después de esperar:", resultado);
// }

// probarEspera();



// let productosCache = [];

// function llenarSelectProductos(productos) {
//   const select = document.querySelector("#campo-producto");

//   select.innerHTML = productos.map((producto) => `
//     <option value="${producto.id_producto}">${producto.nombre}</option>
//   `).join("");
// }

// async function iniciar() {

//     const cuerpoTabla = document.querySelector("#cuerpo-productos");
//      cuerpoTabla.innerHTML = '<tr><td colspan="3">Cargando productos...</td></tr>';

//   const { data, error } = await clientesupabase.from("productos").select();


//   if (error) {
//     console.error("Error al leer productos:", error);
//     cuerpoTabla.innerHTML = '<tr><td colspan="3">No se pudo cargar el listado.</td></tr>';
//     return;
//   }

//   if (data.length === 0) {
//   cuerpoTabla.innerHTML = '<tr><td colspan="3">Todavía no hay productos registrados.</td></tr>';
//   return;
// }


// productosCache = data;
  
//   const filas = data.map((producto) => `
//   <tr>
//     <td>${producto.nombre}</td>
//     <td>${producto.precio}</td>
//     <td>${producto.existencia}</td>
//   </tr>
// `).join("");

// cuerpoTabla.innerHTML = filas;

// llenarSelectProductos(data);
// }
// iniciar();




// async function probarClientes() {

// const cuerpoClientes = document.querySelector("#cuerpo-clientes");
// cuerpoClientes.innerHTML = '<tr><td colspan="2">Cargando clientes...</td></tr>';

// const { data, error } = await clientesupabase.from("clientes").select();
// if (error) {
//   console.error("Error al leer clientes:", error);

//   cuerpoClientes.innerHTML = '<tr><td colspan="2">No se pudo cargar el listado de clientes.</td></tr>';
//   return;
// }

// if (data.length === 0) {
//   cuerpoClientes.innerHTML = '<tr><td colspan="2">Todavía no hay clientes registrados.</td></tr>';
//   return;
// }
// console.log("Clientes encontrados:", data);
// console.log("Cantidad de clientes:", data.length);

// const filasClientes = data.map((cliente) => `
//   <tr>
//     <td>${cliente.nombre}</td>
//     <td>${cliente.contacto ?? ""}</td>
//   </tr>
// `).join("");

// cuerpoClientes.innerHTML = filasClientes;
// }
// probarClientes();

// document.querySelector("#form-venta").addEventListener("submit", async (event) => {
//   event.preventDefault();
  
// const idProducto = Number(document.querySelector("#campo-producto").value);
// const cantidad = Number(document.querySelector("#campo-cantidad").value);

// const producto = productosCache.find(
//   (producto) => producto.id_producto === idProducto
// );

// if (!producto || !Number.isInteger(cantidad) || cantidad <= 0) {
//   document.querySelector("#mensaje-venta").textContent =
//     "Selecciona un producto y escribe una cantidad entera mayor que cero.";
//   return;
// }

// const precio = Number(producto.precio);
// const total = precio * cantidad;

// if (!Number.isFinite(precio) || precio <= 0 || !Number.isFinite(total)) {
//   document.querySelector("#mensaje-venta").textContent =
//     "El precio del producto no es válido.";
//   return;
// }

// console.log("Producto seleccionado:", producto);
// console.log("Cantidad:", cantidad);
// console.log("Total de la venta:", total);

// const formulario = event.currentTarget;
// const boton = formulario.querySelector('button[type="submit"]');
// const mensaje = document.querySelector("#mensaje-venta");

// boton.disabled = true;
// mensaje.textContent = "Guardando venta...";

// try {
//   const { data: venta, error: errorVenta } = await clientesupabase
//     .from("ventas")
//     .insert({
//       id_usuario: 1,
//       tipo_venta: "directa_stock",
//       total: total,
//       estado_pago: "pendiente"
//     })
//     .select()
//     .single();

//   if (errorVenta) {
//     console.error("Error al guardar venta:", errorVenta);
//     mensaje.textContent =
//       "No se confirmó el guardado. Revisa la consola y la tabla ventas antes de reintentar.";
//     return;
//   }

//   const { error: errorDetalle } = await clientesupabase
//     .from("detalle_ventas")
//     .insert({
//       id_venta: venta.id_venta,
//       id_producto: idProducto,
//       cantidad: cantidad,
//       precio_unitario: precio,
//       subtotal: total
//     });

//   if (errorDetalle) {
//     console.error("Error al guardar detalle:", errorDetalle);
//     mensaje.textContent =
//       `La venta ${venta.id_venta} se guardó, pero no se confirmó su detalle. No repitas el envío; revisa ambas tablas.`;
//     return;
//   }

//   mensaje.textContent =
//     `Venta ${venta.id_venta} registrada correctamente.`;
//   formulario.reset();
// } catch (error) {
//   console.error("Error durante el guardado:", error);
//   mensaje.textContent =
//     "El resultado del guardado es incierto. Revisa ambas tablas antes de reintentar.";
// } finally {
//   boton.disabled = false;
// }
// });

// document.querySelector("#form-cliente").addEventListener("submit", async (event) => {
//   event.preventDefault();

//   const nombre = document.querySelector("#campo-nombre-cliente").value.trim();
//   const contacto = document.querySelector("#campo-contacto-cliente").value.trim();

//   if (!nombre || !contacto) {
//     document.querySelector("#mensaje-cliente").textContent =
//       "Completa el nombre y el teléfono.";
//     return;
//   }

//   const formulario = event.currentTarget;
// const boton = formulario.querySelector('button[type="submit"]');
// const mensaje = document.querySelector("#mensaje-cliente");

// boton.disabled = true;
// mensaje.textContent = "Guardando cliente...";

// try {
//   const { error } = await clientesupabase
//     .from("clientes")
//     .insert({
//       nombre: nombre,
//       contacto: contacto
//     });

//   if (error) {
//     console.error("Error al guardar cliente:", error);
//     mensaje.textContent =
//       "No se confirmó el guardado. Revisa la consola y la tabla clientes antes de reintentar.";
//     return;
//   }

//   mensaje.textContent = "Cliente registrado correctamente.";
//   formulario.reset();
// } catch (error) {
//   console.error("Error durante el guardado:", error);
//   mensaje.textContent =
//     "No se pudo confirmar el resultado. Revisa la tabla clientes antes de reintentar.";
// } finally {
//   boton.disabled = false;
// }
// });
