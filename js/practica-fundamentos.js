
// Actividad B: datos de ejemplo, sin conexión a Supabase.
const producto = {
  nombre: "Ropero de melamina",
  precio: 1200,
  existencia: 3
};

const { nombre, precio } = producto;

console.log(`${nombre} cuesta Bs ${precio}`);


// Actividad C: arreglo de productos.
const productos = [
  { nombre: "Ropero de melamina", precio: 1200, existencia: 3 },
  { nombre: "Escritorio", precio: 500, existencia: 12 },
  { nombre: "Centro de TV", precio: 800, existencia: 5 },
  { nombre: "Mesa de noche", precio: 250, existencia: 15 }
];

// map transforma cada producto en su nombre.
const nombres = productos.map((producto) => producto.nombre);

console.log("Nombres:", nombres);

// filter selecciona los productos con menos de 10 unidades.
const pocaExistencia = productos.filter(
  (producto) => producto.existencia < 10
);

console.log("Productos con menos de 10 unidades:", pocaExistencia);

// find busca un producto por su nombre exacto.
const productoEncontrado = productos.find(
  (producto) => producto.nombre === "Escritorio"
);

console.log("Producto encontrado:", productoEncontrado);

// reduce acumula la suma de los precios, empezando desde 0.
const sumaPrecios = productos.reduce(
  (suma, producto) => suma + producto.precio,
  0
);

console.log("Suma de precios: Bs", sumaPrecios);


// Actividad D: promesa simulada.
function esperar(ms) {
  return new Promise((resolve) =>
    setTimeout(() => resolve("Listo"), ms)
  );
}

async function probarEspera() {
  console.log("Antes de esperar");

  const resultado = await esperar(1000);

//   const resultado = esperar(1000);

  console.log("Después de esperar:", resultado);
}

probarEspera();