
async function iniciar() {
  const { data, error } = await clientesupabase.from("productos").select();

  if (error) {
    console.error("Error al leer productos:", error);
    return;
  }

  console.log("Productos encontrados:", data);
}

iniciar();


async function probarClientes() {
const { data, error } = await clientesupabase.from("clientes").select();
if (error) {
  console.error("Error al leer clientes:", error);
  return;
}
console.log("Clientes encontrados:", data);
console.log("Cantidad de clientes:", data.length);
}
probarClientes();