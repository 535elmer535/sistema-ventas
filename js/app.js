
async function iniciar() {

    const cuerpoTabla = document.querySelector("#cuerpo-productos");
     cuerpoTabla.innerHTML = '<tr><td colspan="3">Cargando productos...</td></tr>';

  const { data, error } = await clientesupabase.from("productos").select();


  if (error) {
    console.error("Error al leer productos:", error);
    cuerpoTabla.innerHTML = '<tr><td colspan="3">No se pudo cargar el listado.</td></tr>';
    return;
  }

  if (data.length === 0) {
  cuerpoTabla.innerHTML = '<tr><td colspan="3">Todavía no hay productos registrados.</td></tr>';
  return;
}

//   console.log("Productos encontrados:", data);

  
  const filas = data.map((producto) => `
  <tr>
    <td>${producto.nombre}</td>
    <td>${producto.precio}</td>
    <td>${producto.existencia}</td>
  </tr>
`).join("");

cuerpoTabla.innerHTML = filas;
}
iniciar();


async function probarClientes() {

const cuerpoClientes = document.querySelector("#cuerpo-clientes");
cuerpoClientes.innerHTML = '<tr><td colspan="2">Cargando clientes...</td></tr>';

const { data, error } = await clientesupabase.from("clientes").select();
if (error) {
  console.error("Error al leer clientes:", error);

  cuerpoClientes.innerHTML = '<tr><td colspan="2">No se pudo cargar el listado de clientes.</td></tr>';
  return;
}

if (data.length === 0) {
  cuerpoClientes.innerHTML = '<tr><td colspan="2">Todavía no hay clientes registrados.</td></tr>';
  return;
}
console.log("Clientes encontrados:", data);
console.log("Cantidad de clientes:", data.length);

const filasClientes = data.map((cliente) => `
  <tr>
    <td>${cliente.nombre}</td>
    <td>${cliente.contacto ?? ""}</td>
  </tr>
`).join("");

cuerpoClientes.innerHTML = filasClientes;
}
probarClientes();