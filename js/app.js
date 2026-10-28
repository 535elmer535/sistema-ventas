

// Ventas y pedidos registrados mediante funciones SQL atómicas.
// Las ventas descuentan stock; los pedidos a medida no.
// Las solicitudes inciertas se conservan para su recuperación.
let productosCache = [];
let mueblesSeleccionados = [];
let guardandoVenta = false;
let ventaPorRevisar = false;
let solicitudVentaPendiente = null;
let claveVentaPendiente = null;
let guardandoCliente = false;
let clientePorRevisar = false;
let clientesCache = [];
let mueblesPedido = [];
let siguienteLineaPedido = 1;
let guardandoPedido = false;
let pedidoPorRevisar = false;
let solicitudPedidoPendiente = null;
let clavePedidoPendiente = null;
let solicitudCobroPendiente = null;
let claveCobroPendiente = null;
let recuperandoCobroPendiente = false;

// Los nombres y contactos se muestran como texto, no como código HTML.
function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[caracter]);
}

function actualizarBotonesVenta() {
  const bloqueada = guardandoVenta || ventaPorRevisar;
  document.querySelector("#agregar-mueble").disabled = bloqueada;
  document.querySelector("#confirmar-venta").disabled =
    bloqueada || mueblesSeleccionados.length === 0;
  document.querySelector("#campo-producto").disabled = bloqueada;
  document.querySelector("#campo-cantidad").disabled = bloqueada;
  document.querySelectorAll("[data-quitar-producto]").forEach((boton) => {
    boton.disabled = bloqueada;
  });
}
function actualizarBotonRecuperacionVenta() {
  let boton = document.querySelector("#recuperar-venta-pendiente");

  if (!boton) {
    boton = document.createElement("button");
    boton.id = "recuperar-venta-pendiente";
    boton.type = "button";
    boton.textContent = "Confirmar venta pendiente";

    boton.addEventListener("click", recuperarVentaPendiente);

    document.querySelector("#mensaje-venta")
      .insertAdjacentElement("afterend", boton);
  }

  boton.hidden = solicitudVentaPendiente === null;
  boton.disabled = guardandoVenta;
}

async function recuperarVentaPendiente() {
  if (guardandoVenta || !solicitudVentaPendiente) return;

  const solicitud = solicitudVentaPendiente;
  const clave = claveVentaPendiente;
  const mensaje = document.querySelector("#mensaje-venta");

  guardandoVenta = true;
  actualizarBotonesVenta();
  actualizarBotonRecuperacionVenta();

  mensaje.textContent = "Confirmando la misma solicitud de venta...";

  let confirmada = false;

  try {
    const { data: { session }, error: errorSesion } =
      await clientesupabase.auth.getSession();

    if (errorSesion) throw errorSesion;

    if (
      !session ||
      clave !== `mueblex-venta-pendiente-${session.user.id}`
    ) {
      throw new Error("La sesión cambió. Actualiza la página.");
    }

    const guardado = localStorage.getItem(clave);

    if (
      guardado === null ||
      JSON.stringify(JSON.parse(guardado)) !==
        JSON.stringify(solicitud)
    ) {
      throw new Error(
        "La solicitud guardada cambió. Actualiza la página."
      );
    }

    const { data: resultado, error } = await clientesupabase.rpc(
      "registrar_venta_stock",
      solicitud
    );

    if (error) throw error;

    if (!resultado || !resultado.id_venta) {
      throw new Error("No se recibió la confirmación de la venta.");
    }

    localStorage.removeItem(clave);
    solicitudVentaPendiente = null;
    ventaPorRevisar = false;
    confirmada = true;

    mueblesSeleccionados = [];
    document.querySelector("#form-venta").reset();
    renderizarMueblesSeleccionados();

    mensaje.textContent =
      `Venta ${resultado.id_venta} confirmada. ` +
      `Total: Bs ${Number(resultado.total).toFixed(2)}. ` +
      "La solicitud quedó resuelta.";
  } catch (error) {
    ventaPorRevisar = true;

    if (error.code === "P0001") {
      try {
        localStorage.removeItem(clave);
        solicitudVentaPendiente = null;
        ventaPorRevisar = false;

        mensaje.textContent =
          `Supabase rechazó la solicitud: ${error.message} ` +
          "Puedes corregir los datos y registrar la venta.";
      } catch {
        mensaje.textContent =
          "La solicitud fue rechazada, pero no se pudo " +
          "liberar del navegador. Actualiza la página.";
      }
    } else {
      mensaje.textContent =
        "No se pudo confirmar el resultado. " +
        "La solicitud sigue guardada. Cuando vuelva la conexión, " +
        "pulsa Confirmar venta pendiente.";
    }

    console.error("Error al recuperar la venta:", error);
  } finally {
    guardandoVenta = false;
    actualizarBotonesVenta();
    actualizarBotonRecuperacionVenta();
  }

  if (confirmada) {
    await Promise.allSettled([
      cargarProductos(),
      cargarResumenVentas(),
      cargarProductosVendidos(),
      cargarHistorialVentas()
    ]);
  }
}
async function prepararRecuperacionVenta() {
  solicitudVentaPendiente = null;
  claveVentaPendiente = null;
  ventaPorRevisar = true;
  actualizarBotonesVenta();

  const mensaje = document.querySelector("#mensaje-venta");

  try {
    const { data: { session }, error } =
      await clientesupabase.auth.getSession();

    if (error) throw error;
    if (!session) {
      throw new Error("Debes iniciar sesión.");
    }

    claveVentaPendiente =
      `mueblex-venta-pendiente-${session.user.id}`;

    const guardado = localStorage.getItem(claveVentaPendiente);

    if (guardado !== null) {
      const solicitud = JSON.parse(guardado);

      const uuidValido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          .test(solicitud?.p_solicitud_id);

      const detalles = solicitud?.p_detalles;

      if (
        !uuidValido ||
        !Array.isArray(detalles) ||
        detalles.length === 0 ||
        detalles.length > 100 ||
        detalles.some((detalle) =>
          !detalle ||
          !Number.isSafeInteger(detalle.id_producto) ||
          detalle.id_producto <= 0 ||
          !Number.isSafeInteger(detalle.cantidad) ||
          detalle.cantidad <= 0 ||
          detalle.cantidad > 2147483647 ||
          !Number.isSafeInteger(detalle.precio_centavos) ||
          detalle.precio_centavos <= 0
        )
      ) {
        throw new Error("La solicitud guardada necesita revisión.");
      }

      solicitudVentaPendiente = solicitud;

      mensaje.textContent =
        "Hay una venta pendiente de confirmar. " +
        "No registres otra venta hasta comprobar su resultado.";
    } else {
      ventaPorRevisar = false;
    }
  } catch (error) {
    mensaje.textContent =
      "No se pudo comprobar si hay una venta pendiente. " +
      "El registro queda bloqueado para evitar duplicados.";

    console.error("Error al recuperar la venta pendiente:", error);
  } finally {
    actualizarBotonesVenta();
    actualizarBotonRecuperacionVenta();
  }
}
function llenarSelectProductos(productos) {
  const select = document.querySelector("#campo-producto");
  select.innerHTML = productos.length === 0
    ? '<option value="">No hay productos disponibles</option>'
    : productos.map((producto) => `
      <option value="${escaparHTML(producto.id_producto)}">${escaparHTML(producto.nombre)}</option>
    `).join("");
}

function renderizarMueblesSeleccionados() {
  const cuerpo = document.querySelector("#cuerpo-detalle-stock");
  cuerpo.innerHTML = mueblesSeleccionados.length === 0
    ? '<tr><td colspan="5">Todavía no agregaste muebles.</td></tr>'
    : mueblesSeleccionados.map((mueble) => `
      <tr>
        <td>${escaparHTML(mueble.nombre)}</td>
        <td>${mueble.cantidad}</td>
        <td>${(mueble.precioCentavos / 100).toFixed(2)}</td>
        <td>${(mueble.precioCentavos * mueble.cantidad / 100).toFixed(2)}</td>
        <td><button type="button" data-quitar-producto="${mueble.id_producto}">Quitar</button></td>
      </tr>
    `).join("");
  const totalCentavos = mueblesSeleccionados.reduce(
    (suma, mueble) => suma + mueble.precioCentavos * mueble.cantidad, 0
  );
  document.querySelector("#total-venta").textContent = (totalCentavos / 100).toFixed(2);
  actualizarBotonesVenta();
}

let usuarioEsAdministrador = false;
async function cargarProductos() {
  const cuerpoTabla = document.querySelector("#cuerpo-productos");
  cuerpoTabla.innerHTML = '<tr><td colspan="5">Cargando productos...</td></tr>';
  productosCache = [];
  llenarSelectProductos([]);
  try {
    const { data, error } = await clientesupabase.from("productos").select();
    if (error) throw error;
    productosCache = data;
    await prepararReposicionStock(data);
    llenarSelectProductos(data);
    cuerpoTabla.innerHTML = data.length === 0
      ? '<tr><td colspan="5">Todavía no hay productos registrados.</td></tr>'
      : data.map((producto) => `
               <tr>
          <td>${escaparHTML(producto.nombre)}</td>
          <td>${escaparHTML(producto.precio)}</td>
          <td>${escaparHTML(producto.existencia)}</td>
          <td>${escaparHTML(estadoStockMueble(producto.existencia))}</td>
          <td>
            ${usuarioEsAdministrador ? `
  <button type="button" class="btn-editar"
          data-id="${escaparHTML(producto.id_producto)}">
    Editar precio
  </button>
` : ""}
            ${usuarioEsAdministrador ? `
  <button type="button" class="btn-eliminar"
    data-id="${escaparHTML(producto.id_producto)}">
    Eliminar
  </button>
` : ""}
          </td>
        </tr>
      `).join("");
  } catch (error) {
    console.error("Error al leer productos:", error);
    cuerpoTabla.innerHTML = '<tr><td colspan="5">No se pudo cargar el listado.</td></tr>';
  }
}

async function probarClientes() {
  const cuerpo = document.querySelector("#cuerpo-clientes");
  cuerpo.innerHTML = '<tr><td colspan="4">Cargando clientes...</td></tr>';
  const clienteAnterior = document.querySelector("#campo-cliente-pedido").value;
  clientesCache = [];
  llenarSelectClientes([]);
  try {
    const { data, error } = await clientesupabase.from("clientes").select();
    if (error) throw error;
    clientesCache = data;
    llenarSelectClientes(data);
    if (!guardandoPedido && data.some((cliente) => String(cliente.id_cliente) === clienteAnterior)) {
      document.querySelector("#campo-cliente-pedido").value = clienteAnterior;
    }
    cuerpo.innerHTML = data.length === 0
      ? '<tr><td colspan="4">Todavía no hay clientes registrados.</td></tr>'
      : data.map((cliente) => `
       <tr>
  <td>${escaparHTML(cliente.nombre)}</td>
  <td>${escaparHTML(cliente.contacto)}</td>
  <td>${escaparHTML(cliente.direccion || "No registrada")}</td>
  <td>
    <button type="button" class="btn-editar-cliente"
            data-id="${escaparHTML(cliente.id_cliente)}">
      Editar
    </button>
    ${usuarioEsAdministrador ? `
  <button type="button" class="btn-eliminar-cliente"
    data-id="${escaparHTML(cliente.id_cliente)}">
    Eliminar
  </button>
` : ""}
  </td>
</tr>

      `).join("");
  } catch (error) {
    console.error("Error al leer clientes:", error);
    cuerpo.innerHTML = '<tr><td colspan="4">No se pudo cargar el listado de clientes.</td></tr>';
  }
}
function manejarError(
  error,
  selector = "#mensaje-venta",
  texto = "Ocurrió un problema al guardar. Intenta de nuevo."
) {
  console.error("Error en la operación:", error);
  document.querySelector(selector).textContent = texto;
}
function validarVenta({ idProducto, cantidad }) {
  const errores = [];

  if (
    !Number.isSafeInteger(idProducto) ||
    idProducto <= 0 ||
    !productosCache.some(
      (producto) => Number(producto.id_producto) === idProducto
    )
  ) {
    errores.push("Selecciona un producto válido.");
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    errores.push("La cantidad debe ser mayor a cero.");
  } else if (!Number.isSafeInteger(cantidad)) {
    errores.push("La cantidad debe ser un número entero dentro del rango permitido.");
  }

  return errores;
}

document.querySelector("#agregar-mueble").addEventListener("click", () => {
  if (guardandoVenta || ventaPorRevisar) return;
  const mensaje = document.querySelector("#mensaje-venta");
  const idProducto = Number(document.querySelector("#campo-producto").value);
  const cantidad = Number(document.querySelector("#campo-cantidad").value);
  
  mensaje.textContent = "";


  const errores = validarVenta({ idProducto, cantidad });

  if (errores.length > 0) {
    mensaje.textContent = errores.join(" ");
    return;
  }

  const producto = productosCache.find(
    (p) => Number(p.id_producto) === idProducto
  );

  const precio = Number(producto.precio);
  const precioCentavos = Math.round(precio * 100);
  const existente = mueblesSeleccionados.find((m) => m.id_producto === idProducto);
  const nuevaCantidad = (existente?.cantidad ?? 0) + cantidad;
  const totalActual = mueblesSeleccionados.reduce((s, m) => s + m.precioCentavos * m.cantidad, 0);
  if (!Number.isFinite(precio) || precio <= 0 || !Number.isSafeInteger(precioCentavos) ||
    precioCentavos <= 0 || !Number.isSafeInteger(nuevaCantidad) ||
    !Number.isSafeInteger(precioCentavos * nuevaCantidad) ||
    !Number.isSafeInteger(totalActual + precioCentavos * cantidad)) {
    mensaje.textContent = "El precio o la cantidad exceden los valores admitidos.";
    return;
  }
  // Comprobación orientativa: usa la existencia consultada; no reserva stock.
  if (nuevaCantidad > Number(producto.existencia)) {
    mensaje.textContent = "La cantidad supera la existencia mostrada. Actualiza el listado antes de continuar.";
    return;
  }
  if (existente) existente.cantidad = nuevaCantidad;
  else mueblesSeleccionados.push({ id_producto: idProducto, nombre: producto.nombre, cantidad, precioCentavos });
  document.querySelector("#campo-cantidad").value = "1";
    
  mensaje.textContent = "Mueble agregado a la lista. Todavía no se guardó la venta.";
  renderizarMueblesSeleccionados();
});

document.querySelector("#cuerpo-detalle-stock").addEventListener("click", (event) => {
  if (guardandoVenta || ventaPorRevisar) return;
  const boton = event.target.closest("[data-quitar-producto]");
  if (!boton) return;
  const id = Number(boton.dataset.quitarProducto);
  mueblesSeleccionados = mueblesSeleccionados.filter((m) => m.id_producto !== id);
  document.querySelector("#mensaje-venta").textContent = "Mueble quitado de la lista temporal.";
  renderizarMueblesSeleccionados();
});

document.querySelector("#form-venta").addEventListener("submit", async (event) => {
   event.preventDefault();

  if (guardandoVenta || ventaPorRevisar) return;

  const formulario = event.currentTarget;
  const mensaje = document.querySelector("#mensaje-venta");
  const lineas = mueblesSeleccionados.map((m) => ({ ...m }));
  const errores = [];

  if (lineas.length === 0) {
    errores.push("Agrega al menos un mueble antes de registrar la venta.");
  }

  for (const [indice, mueble] of lineas.entries()) {
    const erroresMueble = validarVenta({
      idProducto: mueble.id_producto,
      cantidad: mueble.cantidad
    });

    errores.push(
      ...erroresMueble.map(
        (error) => `Mueble ${indice + 1}: ${error}`
      )
    );

    if (
      !Number.isSafeInteger(mueble.precioCentavos) ||
      mueble.precioCentavos <= 0
    ) {
      errores.push(`Mueble ${indice + 1}: el precio no es válido.`);
    }
  }

  const totalCentavos = lineas.reduce(
    (suma, mueble) => suma + mueble.precioCentavos * mueble.cantidad,
    0
  );

  if (
    lineas.length > 0 &&
    (!Number.isSafeInteger(totalCentavos) || totalCentavos <= 0)
  ) {
    errores.push("El total de la venta no es válido.");
  }

  if (errores.length > 0) {
    mensaje.textContent = errores.join(" ");
    
    return;
  }

  guardandoVenta = true;
  actualizarBotonesVenta();
  mensaje.textContent = "Guardando venta...";

  let ventaConfirmada = false;

  try {
    const { data: { session }, error: errorSesion } =
  await clientesupabase.auth.getSession();

if (errorSesion) throw errorSesion;

if (
  !session ||
  claveVentaPendiente !==
    `mueblex-venta-pendiente-${session.user.id}`
) {
  throw new Error("La sesión cambió. Actualiza la página.");
}

if (localStorage.getItem(claveVentaPendiente) !== null) {
  throw new Error(
    "Hay una venta pendiente. Actualiza la página para recuperarla."
  );
}

const solicitud = {
  p_solicitud_id: crypto.randomUUID(),
  p_detalles: lineas.map((mueble) => ({
    id_producto: mueble.id_producto,
    cantidad: mueble.cantidad,
    precio_centavos: mueble.precioCentavos
  }))
};

// Conservar la solicitud antes de enviarla.
localStorage.setItem(
  claveVentaPendiente,
  JSON.stringify(solicitud)
);

solicitudVentaPendiente = solicitud;

const { data: resultado, error } = await clientesupabase.rpc(
  "registrar_venta_stock",
  solicitudVentaPendiente
);

    if (error) throw error;

    if (!resultado || !resultado.id_venta) {
      throw new Error("No se recibió la confirmación de la venta.");
    }

    // Liberar la solicitud solamente después de recibir confirmación.
localStorage.removeItem(claveVentaPendiente);
solicitudVentaPendiente = null;
ventaPorRevisar = false;

ventaConfirmada = true;
mueblesSeleccionados = [];
    formulario.reset();
    renderizarMueblesSeleccionados();

    mensaje.textContent =
      `Venta ${resultado.id_venta} registrada correctamente. ` +
      `Total: Bs ${Number(resultado.total).toFixed(2)}. ` +
      "Las existencias se actualizaron.";
  } catch (error) {
    if (error.code === "P0001") {
  // Supabase rechazó la operación sin guardar cambios.
  try {
    localStorage.removeItem(claveVentaPendiente);
    solicitudVentaPendiente = null;
    ventaPorRevisar = false;

    manejarError(error, "#mensaje-venta", error.message);
  } catch (errorAlLimpiar) {
    ventaPorRevisar = true;

    manejarError(
      errorAlLimpiar,
      "#mensaje-venta",
      "La venta fue rechazada, pero no se pudo liberar " +
      "la solicitud guardada. Actualiza la página para revisarla."
    );
  }
}
    else {
      // Una pérdida de respuesta no permite saber si se confirmó.
      ventaPorRevisar = true;

      manejarError(
        error,
        "#mensaje-venta",
        "No se pudo confirmar el resultado. No repitas la venta. " +
        "Revisa el historial en Supabase antes de continuar."
      );
    }
    } finally {
    guardandoVenta = false;
    actualizarBotonesVenta();
    actualizarBotonRecuperacionVenta();
  }

  if (ventaConfirmada) {
  await Promise.allSettled([
    cargarProductos(),
    cargarResumenVentas(),
    cargarProductosVendidos(),
    cargarHistorialVentas()
  ]);
}
});

document.querySelector("#form-cliente").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (guardandoCliente || clientePorRevisar) return;
  const formulario = event.currentTarget;
  const boton = formulario.querySelector('button[type="submit"]');
  const mensaje = document.querySelector("#mensaje-cliente");
  const nombre = document.querySelector("#campo-nombre-cliente").value.trim();
  const contacto = document.querySelector("#campo-contacto-cliente").value.trim();
  const direccion = document.querySelector("#campo-direccion-cliente").value.trim();
  if (!nombre || !contacto) {
    mensaje.textContent = "Completa el nombre y el teléfono.";
    return;
  }
  guardandoCliente = true;
  boton.disabled = true;
  mensaje.textContent = "Guardando cliente...";
  try {
    const { error } = await clientesupabase.from("clientes").insert({ nombre, contacto, direccion: direccion || null });
    if (error) throw error;
    mensaje.textContent = "Cliente registrado correctamente.";
    formulario.reset();
    await probarClientes();
  } catch (error) {
    console.error("Error durante el guardado del cliente:", error);
    clientePorRevisar = true;
    mensaje.textContent = "No se confirmó el resultado. Revisa clientes antes de reintentar. El envío quedó bloqueado en esta página.";
  } finally {
    guardandoCliente = false;
    boton.disabled = clientePorRevisar;
  }
});

// PEDIDOS A MEDIDA: cada fila conserva cantidad, precio y especificaciones.
function llenarSelectClientes(clientes) {
  const select = document.querySelector("#campo-cliente-pedido");
  if (guardandoPedido) return;
  const anterior = select.value;
  select.innerHTML = '<option value="">Selecciona un cliente</option>' +
    clientes.map((cliente) => `
      <option value="${escaparHTML(cliente.id_cliente)}">${escaparHTML(cliente.nombre)} — ${escaparHTML(cliente.contacto)}</option>
    `).join("");
  if (clientes.some((cliente) => String(cliente.id_cliente) === anterior)) select.value = anterior;
}

// Convierte un importe con hasta dos decimales en centavos enteros.
// Vacío y más de dos decimales se rechazan, en lugar de redondearlos en silencio.
function importeEnCentavos(texto) {
  const valor = String(texto).trim().replace(/^\./, "0.");

  if (!/^\d+(?:\.\d{1,2})?$/.test(valor)) return null;

  const [entero, decimal = ""] = valor.split(".");
  const centavos =
    Number(entero) * 100 + Number(decimal.padEnd(2, "0"));

  return Number.isSafeInteger(centavos) ? centavos : null;
}

function hoyEnBolivia() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const instante = new Date(`${fecha}T00:00:00Z`);
  return Number.isFinite(instante.getTime()) && instante.toISOString().slice(0, 10) === fecha;
}

function totalPedidoCentavos() {
  return mueblesPedido.reduce((suma, mueble) => suma + mueble.precioCentavos * mueble.cantidad, 0);
}

function actualizarControlesPedido() {
  const bloqueado = guardandoPedido || pedidoPorRevisar;
  document.querySelectorAll("#form-pedido input, #form-pedido select, #form-pedido button")
    .forEach((campo) => { campo.disabled = bloqueado; });
  document.querySelector("#confirmar-pedido").disabled = bloqueado || mueblesPedido.length === 0;
}
function actualizarBotonRecuperacionPedido() {
  let boton = document.querySelector("#recuperar-pedido-pendiente");

  if (!boton) {
    boton = document.createElement("button");
    boton.id = "recuperar-pedido-pendiente";
    boton.type = "button";
    boton.textContent = "Confirmar pedido pendiente";

    boton.addEventListener("click", recuperarPedidoPendiente);

    document.querySelector("#mensaje-pedido")
      .insertAdjacentElement("afterend", boton);
  }

  boton.hidden = solicitudPedidoPendiente === null;
  boton.disabled = guardandoPedido;
}

async function recuperarPedidoPendiente() {
  if (guardandoPedido || !solicitudPedidoPendiente) return;

  const solicitud = solicitudPedidoPendiente;
  const clave = clavePedidoPendiente;
  const mensaje = document.querySelector("#mensaje-pedido");

  guardandoPedido = true;
  actualizarControlesPedido();
  actualizarBotonRecuperacionPedido();

  mensaje.textContent = "Confirmando la misma solicitud de pedido...";

  let confirmado = false;

  try {
    const { data: { session }, error: errorSesion } =
      await clientesupabase.auth.getSession();

    if (errorSesion) throw errorSesion;

    if (
      !session ||
      clave !== `mueblex-pedido-pendiente-${session.user.id}`
    ) {
      throw new Error("La sesión cambió. Actualiza la página.");
    }

    const guardado = localStorage.getItem(clave);

    if (
      guardado === null ||
      JSON.stringify(JSON.parse(guardado)) !==
        JSON.stringify(solicitud)
    ) {
      throw new Error(
        "La solicitud guardada cambió. Actualiza la página."
      );
    }

    const { data: resultado, error } = await clientesupabase.rpc(
      "registrar_pedido_seguro",
      solicitud
    );

    if (error) throw error;

    if (!resultado || !resultado.id_venta) {
      throw new Error("No se recibió la confirmación del pedido.");
    }

    localStorage.removeItem(clave);
    solicitudPedidoPendiente = null;
    pedidoPorRevisar = false;
    confirmado = true;

    mueblesPedido = [];
    document.querySelector("#form-pedido").reset();
    renderizarPedido();

    mensaje.textContent =
      `Pedido confirmado en la venta ${resultado.id_venta}. ` +
      `Total: Bs ${Number(resultado.total).toFixed(2)}. ` +
      `Recibido: Bs ${Number(resultado.recibido).toFixed(2)}. ` +
      `Saldo: Bs ${Number(resultado.saldo).toFixed(2)}. ` +
      "La solicitud quedó resuelta.";
  } catch (error) {
    pedidoPorRevisar = true;

    if (error.code === "P0001") {
      try {
        localStorage.removeItem(clave);
        solicitudPedidoPendiente = null;
        pedidoPorRevisar = false;

        mensaje.textContent =
          `Supabase rechazó la solicitud: ${error.message} ` +
          "Puedes corregir los datos y registrar el pedido.";
      } catch {
        mensaje.textContent =
          "La solicitud fue rechazada, pero no se pudo " +
          "liberar del navegador. Actualiza la página.";
      }
    } else {
      mensaje.textContent =
        "No se pudo confirmar el resultado. " +
        "La solicitud sigue guardada. No vuelvas a cobrar el anticipo. " +
        "Cuando vuelva la conexión, pulsa Confirmar pedido pendiente.";
    }

    console.error("Error al recuperar el pedido:", error);
  } finally {
    guardandoPedido = false;
    actualizarControlesPedido();
    actualizarBotonRecuperacionPedido();
  }

  if (confirmado) {
    await Promise.allSettled([
      cargarResumenVentas(),
      cargarProductosVendidos(),
      cargarHistorialPedidos()
    ]);
  }
}
function actualizarPanelRecuperacionCobro(aviso = "") {
  for (const vista of ["ventas", "pedidos"]) {
    const idPanel = `recuperacion-cobro-${vista}`;
    let panel = document.getElementById(idPanel);

    if (!panel) {
      panel = document.createElement("section");
      panel.id = idPanel;

      const titulo = document.createElement("h3");
      titulo.textContent = "Recuperación de cobro";

      const mensaje = document.createElement("p");
      mensaje.dataset.mensajeRecuperacion = "";
      mensaje.setAttribute("role", "status");

      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = "Confirmar cobro pendiente";
      boton.addEventListener("click", recuperarCobroPendiente);

      panel.append(titulo, mensaje, boton);
      document.getElementById(`vista-${vista}`).prepend(panel);
    }

    const pendiente = solicitudCobroPendiente;
    const bloqueado =
      cobroVentaPorRevisar || cobroPedidoPorRevisar;

    panel.hidden = !pendiente && !bloqueado && !aviso;

    const mensaje = panel.querySelector(
      "[data-mensaje-recuperacion]"
    );
    const boton = panel.querySelector("button");

    const detalle = pendiente
      ? `Venta o pedido ${pendiente.p_id_venta}. ` +
        `Importe: Bs ${(pendiente.p_monto_centavos / 100).toFixed(2)}. ` +
        `Método: ${pendiente.p_metodo_pago}. ` +
        "No vuelvas a cobrar ese dinero."
      : bloqueado
        ? "No se pudo comprobar el cobro pendiente. " +
          "Actualiza la página antes de registrar nuevos pagos."
        : "";

    mensaje.textContent = [aviso, detalle].filter(Boolean).join(" ");

    boton.hidden = !pendiente;
    boton.disabled =
      recuperandoCobroPendiente ||
      guardandoCobroVenta ||
      guardandoCobroPedido;
  }
}

async function recuperarCobroPendiente() {
  if (
    recuperandoCobroPendiente ||
    guardandoCobroVenta ||
    guardandoCobroPedido ||
    !solicitudCobroPendiente
  ) return;

  const solicitud = solicitudCobroPendiente;
  const clave = claveCobroPendiente;
  let aviso = "";
  let confirmado = null;

  recuperandoCobroPendiente = true;
  actualizarPanelRecuperacionCobro("Confirmando el mismo cobro...");

  try {
    const { data: { session }, error: errorSesion } =
      await clientesupabase.auth.getSession();

    if (errorSesion) throw errorSesion;

    if (
      !session ||
      clave !== `mueblex-cobro-pendiente-${session.user.id}`
    ) {
      throw new Error("La sesión cambió. Actualiza la página.");
    }

    const guardado = localStorage.getItem(clave);

    if (
      guardado === null ||
      JSON.stringify(JSON.parse(guardado)) !==
        JSON.stringify(solicitud)
    ) {
      throw new Error("La solicitud guardada cambió.");
    }

    const { data, error } = await clientesupabase.rpc(
      "registrar_cobro_seguro",
      solicitud
    );

    if (error) throw error;

    if (!data || !data.id_pago) {
      throw new Error("No se recibió la confirmación del cobro.");
    }

    confirmado = data;
    localStorage.removeItem(clave);

    aviso =
      `Pago ${data.id_pago} confirmado para la venta o pedido ` +
      `${solicitud.p_id_venta}. ` +
      `Importe: Bs ${Number(data.monto).toFixed(2)}. ` +
      "Vuelve a abrir Ver detalle para consultar el saldo actualizado.";
  } catch (error) {
    if (confirmado) {
      aviso =
        `El pago ${confirmado.id_pago} fue confirmado, pero no se ` +
        "pudo liberar su referencia local. No vuelvas a cobrarlo.";
    } else if (error.code === "P0001") {
      try {
        localStorage.removeItem(clave);
        aviso =
          `Supabase rechazó el cobro: ${error.message} ` +
          "La solicitud quedó liberada sin registrar un nuevo pago.";
      } catch {
        aviso =
          "El cobro fue rechazado, pero su referencia local " +
          "no pudo liberarse. Actualiza la página.";
      }
    } else {
      aviso =
        "No se pudo confirmar el resultado. " +
        "Cuando vuelva la conexión, reintenta con este mismo botón.";
    }

    console.error("Error al confirmar el cobro pendiente:", error);
  } finally {
    recuperandoCobroPendiente = false;
    await prepararRecuperacionCobro();
  }

  if (confirmado) {
    await Promise.allSettled([
      cargarHistorialVentas(),
      cargarHistorialPedidos(),
      cargarResumenVentas()
    ]);
  }

  actualizarPanelRecuperacionCobro(aviso);
}
async function prepararRecuperacionCobro() {
  solicitudCobroPendiente = null;
  claveCobroPendiente = null;
  cobroVentaPorRevisar = true;
  cobroPedidoPorRevisar = true;

  const mensajes = [
    document.querySelector("#mensaje-cobro-venta"),
    document.querySelector("#mensaje-cobro-pedido")
  ];

  try {
    const { data: { session }, error } =
      await clientesupabase.auth.getSession();

    if (error) throw error;
    if (!session) {
      throw new Error("Debes iniciar sesión.");
    }

    claveCobroPendiente =
      `mueblex-cobro-pendiente-${session.user.id}`;

    const guardado = localStorage.getItem(claveCobroPendiente);

    if (guardado !== null) {
      const solicitud = JSON.parse(guardado);

      const uuidValido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          .test(solicitud?.p_solicitud_id);

      if (
        !uuidValido ||
        !Number.isSafeInteger(solicitud?.p_id_venta) ||
        solicitud.p_id_venta <= 0 ||
        !Number.isSafeInteger(solicitud?.p_monto_centavos) ||
        solicitud.p_monto_centavos <= 0 ||
        !["efectivo", "QR", "transferencia"]
          .includes(solicitud?.p_metodo_pago)
      ) {
        throw new Error("El cobro guardado necesita revisión.");
      }

      solicitudCobroPendiente = solicitud;

      mensajes.forEach((mensaje) => {
        mensaje.textContent =
          `Hay un cobro pendiente de confirmar para la venta ` +
          `${solicitud.p_id_venta}, por Bs ` +
          `${(solicitud.p_monto_centavos / 100).toFixed(2)}. ` +
          "No vuelvas a cobrar ese dinero.";
      });
    } else {
      cobroVentaPorRevisar = false;
      cobroPedidoPorRevisar = false;
    }
  } catch (error) {
    mensajes.forEach((mensaje) => {
      mensaje.textContent =
        "No se pudo comprobar si hay un cobro pendiente. " +
        "Los nuevos cobros quedan bloqueados para evitar duplicados.";
    });

    console.error("Error al recuperar el cobro pendiente:", error);
  } finally {
    document.querySelectorAll(
      "#form-cobro-venta input, " +
      "#form-cobro-venta select, " +
      "#form-cobro-venta button"
    ).forEach((control) => {
      control.disabled =
        cobroVentaPorRevisar ||
        guardandoCobroVenta ||
        recuperandoCobroPendiente;
    });

    document.querySelectorAll(
      "#form-cobro-pedido input, " +
      "#form-cobro-pedido select, " +
      "#form-cobro-pedido button"
    ).forEach((control) => {
      control.disabled =
        cobroPedidoPorRevisar ||
        guardandoCobroPedido ||
        recuperandoCobroPendiente;
    });
    actualizarPanelRecuperacionCobro();
  }
}
async function prepararRecuperacionPedido() {
  solicitudPedidoPendiente = null;
  clavePedidoPendiente = null;
  pedidoPorRevisar = true;
  actualizarControlesPedido();

  const mensaje = document.querySelector("#mensaje-pedido");

  try {
    const { data: { session }, error } =
      await clientesupabase.auth.getSession();

    if (error) throw error;
    if (!session) {
      throw new Error("Debes iniciar sesión.");
    }

    clavePedidoPendiente =
      `mueblex-pedido-pendiente-${session.user.id}`;

    const guardado = localStorage.getItem(clavePedidoPendiente);

    if (guardado !== null) {
      const solicitud = JSON.parse(guardado);

      const uuidValido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          .test(solicitud?.p_solicitud_id);

      const detalles = solicitud?.p_detalles;

      if (
        !uuidValido ||
        !Number.isSafeInteger(solicitud?.p_id_cliente) ||
        solicitud.p_id_cliente <= 0 ||
        !Number.isSafeInteger(solicitud?.p_recibido_centavos) ||
        solicitud.p_recibido_centavos < 0 ||
        (
          solicitud.p_recibido_centavos > 0 &&
          !["efectivo", "QR", "transferencia"]
            .includes(solicitud.p_metodo_pago)
        ) ||
        !Array.isArray(detalles) ||
        detalles.length === 0 ||
        detalles.length > 100 ||
        detalles.some((detalle) =>
          !detalle ||
          typeof detalle.descripcion !== "string" ||
          typeof detalle.medidas !== "string" ||
          typeof detalle.color !== "string" ||
          !Number.isSafeInteger(detalle.cantidad) ||
          detalle.cantidad <= 0 ||
          detalle.cantidad > 2147483647 ||
          !Number.isSafeInteger(detalle.precio_centavos) ||
          detalle.precio_centavos <= 0 ||
          !fechaValida(detalle.fecha_entrega)
        )
      ) {
        throw new Error("El pedido guardado necesita revisión.");
      }

      solicitudPedidoPendiente = solicitud;

      mensaje.textContent =
        "Hay un pedido pendiente de confirmar. " +
        "No registres otro pedido ni vuelvas a cobrar su anticipo " +
        "hasta comprobar el resultado.";
    } else {
      pedidoPorRevisar = false;
    }
  } catch (error) {
    mensaje.textContent =
      "No se pudo comprobar si hay un pedido pendiente. " +
      "El registro queda bloqueado para evitar duplicados.";

    console.error("Error al recuperar el pedido pendiente:", error);
  } finally {
    actualizarControlesPedido();
    actualizarBotonRecuperacionPedido();
  }
}
function actualizarSaldoPedido() {
  const total = totalPedidoCentavos();
  const campo = document.querySelector("#campo-anticipo-pedido");
  const recibido = importeEnCentavos(campo.value);
  campo.max = (total / 100).toFixed(2);
  document.querySelector("#total-pedido").textContent = (total / 100).toFixed(2);
  document.querySelector("#saldo-pedido").textContent =
    recibido === null || recibido > total
      ? "Monto recibido no válido"
      : ((total - recibido) / 100).toFixed(2);
}

function renderizarPedido() {
  const cuerpo = document.querySelector("#cuerpo-detalle-pedido");
  cuerpo.innerHTML = mueblesPedido.length === 0
    ? '<tr><td colspan="8">Todavía no agregaste muebles a medida.</td></tr>'
    : mueblesPedido.map((mueble) => `
      <tr>
        <td>${escaparHTML(mueble.descripcion)}</td>
        <td>${escaparHTML(mueble.medidas)}</td>
        <td>${escaparHTML(mueble.color)}</td>
        <td>${mueble.cantidad}</td>
        <td>${(mueble.precioCentavos / 100).toFixed(2)}</td>
        <td>${(mueble.precioCentavos * mueble.cantidad / 100).toFixed(2)}</td>
        <td>${escaparHTML(mueble.fechaEntrega)}</td>
        <td><button type="button" data-quitar-pedido="${mueble.linea}">Quitar</button></td>
      </tr>
    `).join("");
  actualizarSaldoPedido();
  actualizarControlesPedido();
}

document.querySelector("#agregar-mueble-pedido").addEventListener("click", () => {
  if (guardandoPedido || pedidoPorRevisar) return;
  const mensaje = document.querySelector("#mensaje-pedido");
  const descripcion = document.querySelector("#campo-descripcion-pedido").value.trim();
  const color = document.querySelector("#campo-color-pedido").value.trim();
  const alto = Number(document.querySelector("#campo-alto-pedido").value);
  const ancho = Number(document.querySelector("#campo-ancho-pedido").value);
  const profundidad = Number(document.querySelector("#campo-profundidad-pedido").value);
  const cantidad = Number(document.querySelector("#campo-cantidad-pedido").value);
  const precioCentavos = importeEnCentavos(document.querySelector("#campo-precio-pedido").value);
  const fechaEntrega = document.querySelector("#campo-fecha-pedido").value;
  if (!descripcion || !color) {
    mensaje.textContent = "Escribe la descripción y el color del mueble.";
    return;
  }
  if (![alto, ancho, profundidad].every((medida) => Number.isFinite(medida) && medida > 0)) {
    mensaje.textContent = "Alto, ancho y profundidad deben ser números positivos en centímetros.";
    return;
  }
  if (!Number.isSafeInteger(cantidad) || cantidad <= 0 || precioCentavos === null || precioCentavos <= 0) {
    mensaje.textContent = "La cantidad debe ser entera y positiva; el precio debe ser positivo con hasta dos decimales.";
    return;
  }
  if (!fechaValida(fechaEntrega) || fechaEntrega < hoyEnBolivia()) {
    mensaje.textContent = "Elige una fecha de entrega válida que no sea anterior a hoy.";
    return;
  }
  const subtotal = precioCentavos * cantidad;
  if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(totalPedidoCentavos() + subtotal)) {
    mensaje.textContent = "El importe excede los valores admitidos.";
    return;
  }
  mueblesPedido.push({
    linea: siguienteLineaPedido++, descripcion, color, cantidad, precioCentavos,
    medidas: `${alto} x ${ancho} x ${profundidad} cm`, fechaEntrega
  });
  // Cada clic agrega una especificación independiente; no se mezclan colores ni medidas.
  ["#campo-descripcion-pedido", "#campo-color-pedido", "#campo-alto-pedido",
    "#campo-ancho-pedido", "#campo-profundidad-pedido", "#campo-precio-pedido",
    "#campo-fecha-pedido"].forEach((selector) => { document.querySelector(selector).value = ""; });
  document.querySelector("#campo-cantidad-pedido").value = "1";
  mensaje.textContent = "Mueble a medida agregado. Todavía no se guardó el pedido.";
  renderizarPedido();
});

document.querySelector("#cuerpo-detalle-pedido").addEventListener("click", (event) => {
  if (guardandoPedido || pedidoPorRevisar) return;
  const boton = event.target.closest("[data-quitar-pedido]");
  if (!boton) return;
  const linea = Number(boton.dataset.quitarPedido);
  mueblesPedido = mueblesPedido.filter((mueble) => mueble.linea !== linea);
  document.querySelector("#mensaje-pedido").textContent = "Mueble quitado de la lista temporal.";
  renderizarPedido();
});

document.querySelector("#campo-anticipo-pedido").addEventListener("input", actualizarSaldoPedido);

document.querySelector("#form-pedido").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (guardandoPedido || pedidoPorRevisar) return;
  const formulario = event.currentTarget;
  const mensaje = document.querySelector("#mensaje-pedido");
  const idCliente = Number(document.querySelector("#campo-cliente-pedido").value);
  const cliente = clientesCache.find((fila) => Number(fila.id_cliente) === idCliente);
  const total = totalPedidoCentavos();
  const recibido = importeEnCentavos(document.querySelector("#campo-anticipo-pedido").value);
  const metodo = document.querySelector("#campo-metodo-pedido").value;
  if (!Number.isSafeInteger(idCliente) || idCliente <= 0 || !cliente || !String(cliente.contacto ?? "").trim()) {
    mensaje.textContent = "Selecciona un cliente registrado que tenga contacto.";
    return;
  }
  if (mueblesPedido.length === 0 || !Number.isSafeInteger(total) || total <= 0) {
    mensaje.textContent = "Agrega al menos un mueble a medida.";
    return;
  }
  if (recibido === null || recibido < 0 || recibido > total) {
    mensaje.textContent = "El monto recibido debe estar entre cero y el total, con hasta dos decimales.";
    return;
  }
  if (recibido > 0 && !["efectivo", "QR", "transferencia"].includes(metodo)) {
    mensaje.textContent = "Selecciona el método del cobro.";
    return;
  }
  const lineas = mueblesPedido.map((mueble) => ({ ...mueble }));
  if (lineas.some((mueble) => mueble.fechaEntrega < hoyEnBolivia())) {
    mensaje.textContent = "Hay una fecha de entrega anterior a hoy. Quita ese mueble y vuelve a agregarlo con una fecha válida.";
    return;
  }
    guardandoPedido = true;
  actualizarControlesPedido();
  mensaje.textContent = "Guardando pedido...";

  let pedidoConfirmado = false;

  try {
    const detalles = lineas.map((mueble) => ({
      descripcion: mueble.descripcion,
      medidas: mueble.medidas,
      color: mueble.color,
      cantidad: mueble.cantidad,
      precio_centavos: mueble.precioCentavos,
      fecha_entrega: mueble.fechaEntrega
    }));

    const { data: { session }, error: errorSesion } =
  await clientesupabase.auth.getSession();

if (errorSesion) throw errorSesion;

if (
  !session ||
  clavePedidoPendiente !==
    `mueblex-pedido-pendiente-${session.user.id}`
) {
  throw new Error("La sesión cambió. Actualiza la página.");
}

if (localStorage.getItem(clavePedidoPendiente) !== null) {
  throw new Error(
    "Hay un pedido pendiente. Actualiza la página para recuperarlo."
  );
}

const solicitud = {
  p_solicitud_id: crypto.randomUUID(),
  p_id_cliente: idCliente,
  p_detalles: detalles,
  p_recibido_centavos: recibido,
  p_metodo_pago: recibido > 0 ? metodo : null
};

// Conservar el pedido y su anticipo antes de enviarlos.
localStorage.setItem(
  clavePedidoPendiente,
  JSON.stringify(solicitud)
);

solicitudPedidoPendiente = solicitud;

const { data: resultado, error } = await clientesupabase.rpc(
  "registrar_pedido_seguro",
  solicitudPedidoPendiente
);

    if (error) throw error;

    if (!resultado || !resultado.id_venta) {
      throw new Error("No se recibió la confirmación del pedido.");
    }

    // Liberar la solicitud después de recibir la confirmación.
localStorage.removeItem(clavePedidoPendiente);
solicitudPedidoPendiente = null;
pedidoPorRevisar = false;

pedidoConfirmado = true;
mueblesPedido = [];
    formulario.reset();
    renderizarPedido();

    mensaje.textContent =
      `Pedido registrado en la venta ${resultado.id_venta}. ` +
      `Total: Bs ${Number(resultado.total).toFixed(2)}. ` +
      `Recibido: Bs ${Number(resultado.recibido).toFixed(2)}. ` +
      `Saldo: Bs ${Number(resultado.saldo).toFixed(2)}.`;
  } catch (error) {
     if (error.code === "P0001") {
  // Supabase rechazó el pedido sin guardar cambios.
  try {
    localStorage.removeItem(clavePedidoPendiente);
    solicitudPedidoPendiente = null;
    pedidoPorRevisar = false;

    manejarError(error, "#mensaje-pedido", error.message);
  } catch (errorAlLimpiar) {
    pedidoPorRevisar = true;

    manejarError(
      errorAlLimpiar,
      "#mensaje-pedido",
      "El pedido fue rechazado, pero no se pudo liberar " +
      "la solicitud guardada. Actualiza la página para revisarla."
    );
  }
}
    else {
      pedidoPorRevisar = true;

      manejarError(
        error,
        "#mensaje-pedido",
        "No se pudo confirmar el resultado. No repitas el pedido. " +
        "Revisa ventas, pedidos_personalizados y pagos en Supabase antes de continuar."
      );
    }
    } finally {
    guardandoPedido = false;
    actualizarControlesPedido();
    actualizarBotonRecuperacionPedido();
  }

  if (pedidoConfirmado) {
  await Promise.allSettled([
    cargarResumenVentas(),
    cargarProductosVendidos(),
    cargarHistorialPedidos()
  ]);
}
});

document.querySelector("#campo-fecha-pedido").min = hoyEnBolivia();
renderizarMueblesSeleccionados();
renderizarPedido();


// Guía 13: mostrar los datos del producto para editar.
document.querySelector("#cuerpo-productos")
  .addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-editar");
    if (!boton) return;
if (
  !usuarioEsAdministrador ||
  document.querySelector(
    '#form-editar-producto button[type="submit"]'
  ).disabled
) return;
    const id = Number(boton.dataset.id);
    const producto = productosCache.find(
      (p) => Number(p.id_producto) === id
    );

    if (!producto) {
      document.querySelector("#mensaje-producto").textContent =
        "No se encontró el producto. Actualiza la página.";
      return;
    }

    document.querySelector("#editar-id").value =
      producto.id_producto;
    document.querySelector("#editar-precio").value =
      producto.precio;
    document.querySelector("#editar-precio-anterior-centavos").value =
  importeEnCentavos(String(producto.precio)) ?? "";  
    document.querySelector("#editar-existencia").value =
      producto.existencia;

    document.querySelector("#panel-edicion").style.display =
      "block";
    document.querySelector("#mensaje-producto").textContent =
      `Editando: ${producto.nombre}`;
  });

function validarEdicionProducto({ precio, existencia }) {
  const errores = [];

  if (!Number.isFinite(precio) || precio <= 0) {
    errores.push("El precio debe ser mayor a cero.");
  }

  if (!Number.isSafeInteger(existencia) || existencia < 0) {
    errores.push("La existencia debe ser un número entero de cero o más.");
  }

  return errores;
}

// Guardar únicamente el precio mediante la función de Supabase.
document.querySelector("#form-editar-producto")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje = document.querySelector("#mensaje-producto");

    if (boton.disabled) return;

    if (!usuarioEsAdministrador) {
      mensaje.textContent =
        "Solo el administrador puede modificar el precio.";
      return;
    }

    const id = Number(document.querySelector("#editar-id").value);

    const precioCentavos = importeEnCentavos(
      document.querySelector("#editar-precio").value
    );

    const anteriorTexto =
      document.querySelector("#editar-precio-anterior-centavos").value;

    const precioAnterior = anteriorTexto === ""
      ? NaN
      : Number(anteriorTexto);

    if (
      !Number.isSafeInteger(id) || id <= 0 ||
      precioCentavos === null || precioCentavos <= 0 ||
      !Number.isSafeInteger(precioAnterior) || precioAnterior <= 0
    ) {
      mensaje.textContent =
        "Selecciona un mueble y escribe un precio válido " +
        "mayor que cero, con hasta dos decimales.";
      return;
    }

    boton.disabled = true;
    mensaje.textContent = "Guardando precio...";

    try {
      const { data, error } = await clientesupabase.rpc(
        "actualizar_precio_mueble",
        {
          p_id_producto: id,
          p_precio_centavos: precioCentavos,
          p_precio_anterior_centavos: precioAnterior
        }
      );

      if (error) throw error;

      if (!data || Number(data.id_producto) !== id) {
        throw new Error("No se recibió la confirmación.");
      }

      document.querySelector("#panel-edicion").style.display = "none";
      formulario.reset();

      await cargarProductos();
      resaltarFilaEditada("#cuerpo-productos", id);

      mensaje.textContent = "Precio actualizado correctamente.";
    } catch (error) {
      console.error("Error al actualizar precio:", error);

      mensaje.textContent = error.code === "P0001"
        ? error.message
        : "No se pudo confirmar el cambio. Recarga el inventario " +
          "y consulta el precio antes de reintentar.";
    } finally {
      boton.disabled = false;
    }
  });


// Guía 13: eliminar producto con confirmación.
document.querySelector("#cuerpo-productos")
  .addEventListener("click", async (event) => {
    const boton = event.target.closest(".btn-eliminar");
    if (!boton || boton.disabled) return;

    const id = Number(boton.dataset.id);
    const producto = productosCache.find(
      (p) => Number(p.id_producto) === id
    );
    const mensaje = document.querySelector("#mensaje-producto");

    if (!producto) {
      mensaje.textContent = "No se encontró el producto.";
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    boton.disabled = true;
    mensaje.textContent = "Eliminando producto...";

    try {
      const { error } = await clientesupabase
        .from("productos")
        .delete()
        .eq("id_producto", id)
        .select("id_producto")
        .single();

      if (error) throw error;

      if (Number(document.querySelector("#editar-id").value) === id) {
        document.querySelector("#panel-edicion").style.display =
          "none";
        document.querySelector("#form-editar-producto").reset();
      }

      await cargarProductos();
      mensaje.textContent =
        `Producto "${producto.nombre}" eliminado correctamente.`;
        
    } catch (error) {
      const texto = error.code === "23503"
        ? "No se puede eliminar: el producto tiene registros relacionados."
        : "No se pudo confirmar la eliminación. Revisa el producto en Supabase antes de reintentar.";

      manejarError(error, "#mensaje-producto", texto);

    } finally {
      boton.disabled = false;
    }
  });

// Guía 13: mostrar los datos del cliente para editar.
document.querySelector("#cuerpo-clientes")
  .addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-editar-cliente");
    if (!boton) return;

    const id = Number(boton.dataset.id);
    const cliente = clientesCache.find(
      (c) => Number(c.id_cliente) === id
    );

    const mensaje =
      document.querySelector("#mensaje-edicion-cliente");

    if (!cliente) {
      mensaje.textContent =
        "No se encontró el cliente. Actualiza la página.";
      return;
    }

    document.querySelector("#editar-id-cliente").value =
      cliente.id_cliente;
    document.querySelector("#editar-nombre-cliente").value =
      cliente.nombre;
    document.querySelector("#editar-contacto-cliente").value =
      cliente.contacto;
    document.querySelector("#editar-direccion-cliente").value =
  cliente.direccion ?? "";  
    document.querySelector("#panel-edicion-cliente")
      .style.display = "block";

    mensaje.textContent = `Editando: ${cliente.nombre}`;
  });

// Guía 13: guardar los cambios del cliente.
document.querySelector("#form-editar-cliente")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje =
      document.querySelector("#mensaje-edicion-cliente");

    if (boton.disabled) return;

    const id = Number(
      document.querySelector("#editar-id-cliente").value
    );
    const nombre =
      document.querySelector("#editar-nombre-cliente").value.trim();
    const contacto =
      document.querySelector("#editar-contacto-cliente").value.trim();
const direccion =
  document.querySelector("#editar-direccion-cliente").value.trim();
    if (!Number.isSafeInteger(id) || id <= 0 ||
      !nombre || !contacto) {
      mensaje.textContent = "Completa el nombre y el teléfono.";
      return;
    }

    boton.disabled = true;
    mensaje.textContent = "Guardando cambios...";

    try {
      const { error } = await clientesupabase
        .from("clientes")
        .update({ nombre, contacto, direccion: direccion || null })
        .eq("id_cliente", id)
        .select("id_cliente")
        .single();

      if (error) throw error;

      document.querySelector("#panel-edicion-cliente")
        .style.display = "none";
      formulario.reset();
      await probarClientes();
      resaltarFilaEditada("#cuerpo-clientes", id);
      mensaje.textContent = "Cliente actualizado correctamente.";
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      mensaje.textContent =
        "No se pudo confirmar el cambio. Revisa Supabase. " +
        error.message;
    } finally {
      boton.disabled = false;
    }
  });

// Guía 13: eliminar cliente con confirmación.
document.querySelector("#cuerpo-clientes")
  .addEventListener("click", async (event) => {
    const boton = event.target.closest(".btn-eliminar-cliente");
    if (!boton || boton.disabled) return;

    const id = Number(boton.dataset.id);
    const cliente = clientesCache.find(
      (c) => Number(c.id_cliente) === id
    );
    const mensaje =
      document.querySelector("#mensaje-edicion-cliente");

    if (!Number.isSafeInteger(id) || id <= 0 || !cliente) {
      mensaje.textContent = "No se encontró el cliente.";
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar al cliente "${cliente.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    boton.disabled = true;
    mensaje.textContent = "Eliminando cliente...";

    try {
      const { error } = await clientesupabase
        .from("clientes")
        .delete()
        .eq("id_cliente", id)
        .select("id_cliente")
        .single();

      if (error) throw error;

      if (
        Number(document.querySelector("#editar-id-cliente").value)
        === id
      ) {
        document.querySelector("#panel-edicion-cliente")
          .style.display = "none";
        document.querySelector("#form-editar-cliente").reset();
      }

      await probarClientes();
      mensaje.textContent =
        `Cliente "${cliente.nombre}" eliminado correctamente.`;
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      mensaje.textContent = error.code === "23503"
        ? "No se puede eliminar: el cliente tiene registros relacionados."
        : "No se pudo confirmar la eliminación. Revisa Supabase. " +
        error.message;
    } finally {
      boton.disabled = false;
    }
  });

// Guía 13, punto 3.8: cancelar edición de producto.
document.querySelector("#cancelar-edicion-producto")
  .addEventListener("click", () => {
    const formulario = document.querySelector("#form-editar-producto");

    if (formulario.querySelector('button[type="submit"]').disabled) {
      return;
    }

    formulario.reset();
    document.querySelector("#editar-id").value = "";
    document.querySelector("#panel-edicion").style.display = "none";
    document.querySelector("#mensaje-producto").textContent =
      "Edición cancelada. No se guardaron cambios.";
  });

// Cancelar edición de cliente.
document.querySelector("#cancelar-edicion-cliente")
  .addEventListener("click", () => {
    const formulario = document.querySelector("#form-editar-cliente");

    if (formulario.querySelector('button[type="submit"]').disabled) {
      return;
    }

    formulario.reset();
    document.querySelector("#editar-id-cliente").value = "";
    document.querySelector("#panel-edicion-cliente").style.display =
      "none";
    document.querySelector("#mensaje-edicion-cliente").textContent =
      "Edición cancelada. No se guardaron cambios.";
  });

// Guía 13, punto 3.8: resaltar la fila actualizada.
function resaltarFilaEditada(selectorTabla, id) {
  const boton = document.querySelector(
    `${selectorTabla} button[data-id="${id}"]`
  );
  const fila = boton?.closest("tr");
  if (!fila) return;

  fila.animate(
    [
      { backgroundColor: "#c8f7c5" },
      { backgroundColor: "#c8f7c5" }
    ],
    { duration: 1000 }
  );
}

// Guía 14: mostrar el sistema y cargar sus datos.
async function mostrarApp() {

  document.querySelector("#seccion-login").style.display = "none";
  document.querySelector("#seccion-app").style.display = "block";

  await mostrarSaludoUsuario();
  await prepararRecuperacionVenta();
  await prepararRecuperacionPedido();
  await prepararRecuperacionCobro();
  await prepararRegistroMueble();
  await cargarProductos();
  await cargarHistorialReposiciones();
  await cargarHistorialVentas();
  await cargarHistorialPedidos();
  await probarClientes();
  await cargarResumenVentas();
await cargarProductosVendidos();
}

// Mostrar el formulario de inicio de sesión.
function mostrarLogin() {
  document.querySelector("#seccion-app").style.display = "none";
  document.querySelector("#seccion-login").style.display = "block";
}

// Guía 14: comprobar la sesión al abrir la página.
async function iniciar() {
  try {
    const {
      data: { session },
      error
    } = await clientesupabase.auth.getSession();

    if (error) throw error;

    if (session) {
      await mostrarApp();
    } else {
      mostrarLogin();
    }
  } catch (error) {
    console.error("Error al comprobar la sesión:", error);
    mostrarLogin();
    document.querySelector("#mensaje-login").textContent =
      "No se pudo comprobar la sesión. Actualiza la página.";
  }
}

iniciar();

// Guía 14: cerrar la sesión en este navegador.
document.querySelector("#btn-logout")
  .addEventListener("click", async () => {
    const boton = document.querySelector("#btn-logout");
    if (boton.disabled) return;

    boton.disabled = true;

    try {
      const { error } = await clientesupabase.auth.signOut({
        scope: "local"
      });

      if (error) throw error;

      // Recargar también limpia los formularios y listas temporales.
      location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      window.alert(
        "No se pudo cerrar la sesión. Inténtalo nuevamente."
      );
      boton.disabled = false;
    }
  });

// Guía 14: iniciar sesión.
document.querySelector("#form-login")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje = document.querySelector("#mensaje-login");

    if (boton.disabled) return;

    const email =
      document.querySelector("#login-email").value.trim();
    const password =
      document.querySelector("#login-password").value;

    if (!email || !password) {
      mensaje.textContent = "Completa el correo y la contraseña.";
      return;
    }

    boton.disabled = true;
    mensaje.textContent = "Iniciando sesión...";
    recordarSesion = selectorRecordarme.checked;
    localStorage.setItem(PREFERENCIA_RECORDAR, String(recordarSesion));

    try {
      const { error } =
        await clientesupabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        mensaje.textContent =
          "No se pudo iniciar sesión. Revisa el correo y la contraseña.";
        return;
      }

      formulario.reset();
      mensaje.textContent = "";
      await mostrarApp();
    } catch (error) {
      console.error("Error durante el inicio de sesión:", error);
      mensaje.textContent =
        "Ocurrió un problema de conexión. Inténtalo nuevamente.";
    } finally {
      boton.disabled = false;
    }
  });


  // Guía 14: cambiar la contraseña del usuario actual.
document.querySelector("#form-cambiar-password")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje = document.querySelector("#mensaje-password");

    if (boton.disabled) return;

    const nueva =
      document.querySelector("#nueva-password").value;
    const confirmacion =
      document.querySelector("#confirmar-password").value;

    if (nueva.length < 12) {
      mensaje.textContent =
        "La contraseña debe tener al menos 12 caracteres.";
      return;
    }

    if (nueva !== confirmacion) {
      mensaje.textContent = "Las contraseñas no coinciden.";
      return;
    }

    boton.disabled = true;
    mensaje.textContent = "Cambiando contraseña...";

    try {
      const { error } = await clientesupabase.auth.updateUser({
        password: nueva
      });

      if (error) {
        mensaje.textContent =
          "No se pudo cambiar la contraseña: " + error.message;
        return;
      }

      formulario.reset();
      mensaje.textContent =
        "Contraseña actualizada correctamente. Ya puedes probar el ingreso con la nueva.";
    } catch {
      mensaje.textContent =
        "No se pudo confirmar el cambio. Comprueba tu conexión.";
    } finally {
      boton.disabled = false;
    }
  });

async function mostrarSaludoUsuario() {
  const saludo = document.querySelector("#saludo-usuario");
  saludo.textContent = "Bienvenido";
usuarioEsAdministrador = false;
  try {
    const { data: { session }, error: errorSesion } =
      await clientesupabase.auth.getSession();

    if (errorSesion) throw errorSesion;
    if (!session) return;

    const { data: usuario, error } = await clientesupabase
      .from("usuarios")
      .select("nombre, rol")
      .eq("id_auth", session.user.id)
      .maybeSingle();

    if (error) throw error;
     usuarioEsAdministrador = usuario?.rol === "administrador";
    document.querySelector("#panel-usuarios-admin").hidden = !usuarioEsAdministrador;
    saludo.textContent =
      `Bienvenido, ${usuario?.nombre || session.user.email}`;
  } catch (error) {
    console.error("No se pudo cargar el saludo:", error);
  }
}

let consultaResumenNegocio = 0;

function formatearImporteReporte(valor) {
  const texto = String(valor);

  if (!/^\d+(?:\.\d+)?$/.test(texto)) {
    throw new Error("El reporte contiene un importe inválido.");
  }

  const [entero, decimales = ""] = texto.split(".");

  if (/[1-9]/.test(decimales.slice(2))) {
    throw new Error("El reporte contiene importes con más de dos decimales.");
  }

  return `${entero}.${decimales.slice(0, 2).padEnd(2, "0")}`;
}

async function cargarResumenVentas() {
  const consultaActual = ++consultaResumenNegocio;
  const contenedor = document.querySelector("#resumen-ventas");
  const desde = document.querySelector("#ventas-desde").value;
  const hasta = document.querySelector("#ventas-hasta").value;

  if (desde && hasta && desde > hasta) {
    contenedor.textContent =
      "La fecha Desde no puede ser posterior a Hasta.";
    return;
  }

  contenedor.textContent = "Consultando ventas y cobros...";

  try {
    let consultaListado = clientesupabase
      .from("ventas")
      .select("id_venta, fecha_venta, total")
      .in("tipo_venta", ["directa_stock", "pedido_medida"])
      .eq("estado_operacion", "activa")
      .order("fecha_venta", { ascending: false })
      .order("id_venta", { ascending: false })
      .range(0, 49);

    if (desde) {
      consultaListado = consultaListado.gte(
        "fecha_venta",
        `${desde}T00:00:00-04:00`
      );
    }

    if (hasta) {
      const diaSiguiente = new Date(`${hasta}T00:00:00-04:00`);
      diaSiguiente.setUTCDate(diaSiguiente.getUTCDate() + 1);

      consultaListado = consultaListado.lt(
        "fecha_venta",
        diaSiguiente.toISOString()
      );
    }

    const [respuestaResumen, respuestaListado] = await Promise.all([
      clientesupabase.rpc("consultar_resumen_negocio", {
        p_desde: desde || null,
        p_hasta: hasta || null
      }),
      consultaListado
    ]);

    if (consultaActual !== consultaResumenNegocio) return;

    if (respuestaResumen.error) throw respuestaResumen.error;
    if (respuestaListado.error) throw respuestaListado.error;

    const resumen = respuestaResumen.data;
    const ventas = respuestaListado.data;

    if (!resumen || !Array.isArray(ventas)) {
      throw new Error("No se recibió el reporte completo.");
    }

    const listado = ventas.map((venta) => `
      <li>
        Venta ${escaparHTML(venta.id_venta)} —
        ${escaparHTML(fechaHistorialMueblex(venta.fecha_venta))} —
        Bs ${formatearImporteReporte(venta.total)}
      </li>
    `).join("");

    contenedor.innerHTML = `
      <h3>Ventas y pedidos registrados</h3>

      <p>
        Cantidad de operaciones:
        ${escaparHTML(resumen.cantidad_ventas)}
      </p>

      <p>
        <strong>
          Total vendido:
          Bs ${formatearImporteReporte(resumen.total_vendido)}
        </strong>
      </p>

      <p>
        Corresponde a las ventas y pedidos registrados
        dentro de las fechas seleccionadas.
      </p>

      <h3>Dinero cobrado</h3>

      <p>
        Cantidad de cobros:
        ${escaparHTML(resumen.cantidad_cobros)}
      </p>

      <p>
        <strong>
          Total cobrado:
          Bs ${formatearImporteReporte(resumen.total_cobrado)}
        </strong>
      </p>

      <p>
        Incluye anticipos, abonos y pagos completos recibidos
        dentro de estas fechas, aunque la venta sea anterior.
      </p>

      <table>
        <thead>
          <tr>
            <th>Método del cobro</th>
            <th>Importe (Bs)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Efectivo</td>
            <td>${formatearImporteReporte(resumen.cobrado_efectivo)}</td>
          </tr>
          <tr>
            <td>QR</td>
            <td>${formatearImporteReporte(resumen.cobrado_qr)}</td>
          </tr>
          <tr>
            <td>Transferencia</td>
            <td>${formatearImporteReporte(resumen.cobrado_transferencia)}</td>
          </tr>
          <tr>
            <td>Otros métodos o sin especificar</td>
            <td>${formatearImporteReporte(resumen.cobrado_otros)}</td>
          </tr>
        </tbody>
      </table>
<h3>Dinero devuelto</h3>

<p>
  Cantidad de devoluciones:
  ${escaparHTML(resumen.cantidad_devoluciones)}
</p>

<p>
  <strong>
    Total devuelto:
    Bs ${formatearImporteReporte(resumen.total_devuelto)}
  </strong>
</p>

<p>
  Corresponde a las devoluciones realizadas dentro de las
  fechas seleccionadas, aunque el cobro original sea anterior.
</p>

<table>
  <thead>
    <tr>
      <th>Método de devolución</th>
      <th>Importe (Bs)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Efectivo</td>
      <td>${formatearImporteReporte(resumen.devuelto_efectivo)}</td>
    </tr>
    <tr>
      <td>QR</td>
      <td>${formatearImporteReporte(resumen.devuelto_qr)}</td>
    </tr>
    <tr>
      <td>Transferencia</td>
      <td>${formatearImporteReporte(resumen.devuelto_transferencia)}</td>
    </tr>
  </tbody>
</table>

<h3>Neto cobrado del período</h3>

<p>
  <strong>
    Bs ${formatearNetoReporte(resumen.neto_cobrado)}
  </strong>
</p>

<p>Dinero cobrado menos dinero devuelto durante el período.</p>
      <p>
        Estos totales no representan la ganancia:
        todavía no se descuentan costos ni gastos.
      </p>

      <h3>Ventas y pedidos del período</h3>

      <p>
        Se muestran hasta 50 operaciones recientes.
        Los totales anteriores incluyen todas las operaciones del período.
      </p>

      ${ventas.length
        ? `<ul>${listado}</ul>`
        : "<p>No hay ventas para estas fechas.</p>"}
    `;
  } catch (error) {
    if (consultaActual !== consultaResumenNegocio) return;

    console.error("Error al consultar ventas y cobros:", error);

    contenedor.textContent = error.code === "P0001"
      ? error.message
      : "No se pudo cargar el reporte de ventas y cobros.";
  }
}

document.querySelector("#btn-filtrar-ventas")
  .addEventListener("click", cargarResumenVentas);

  async function cargarProductosVendidos() {
  const contenedor = document.querySelector("#productos-vendidos");
  contenedor.textContent = "Consultando muebles vendidos...";

  try {
    const { data: detalles, error } = await clientesupabase
  .from("detalle_ventas")
  .select(`
    id_producto,
    cantidad,
    productos(nombre),
    operacion:ventas!inner(estado_operacion)
  `)
  .eq("operacion.estado_operacion", "activa");

    if (error) throw error;

    const agrupados = new Map();

    for (const detalle of detalles) {
      const id = detalle.id_producto;

      if (!agrupados.has(id)) {
        agrupados.set(id, {
          nombre: detalle.productos?.nombre || "Producto sin nombre",
          cantidad: 0
        });
      }

      agrupados.get(id).cantidad += Number(detalle.cantidad);
    }

    const productos = [...agrupados.values()].sort(
      (a, b) => b.cantidad - a.cantidad ||
        a.nombre.localeCompare(b.nombre, "es")
    );

    if (productos.length === 0) {
      contenedor.textContent = "Todavía no hay muebles de catálogo vendidos.";
      return;
    }

    const mayorCantidad = productos[0].cantidad;

    const masVendidos = productos
      .filter((producto) => producto.cantidad === mayorCantidad)
      .map((producto) => escaparHTML(producto.nombre))
      .join(", ");

    contenedor.innerHTML = `
      <p>
        <strong>Mayor cantidad vendida:</strong>
        ${masVendidos} — ${mayorCantidad} unidades por mueble.
      </p>

      <ul>
        ${productos.map((producto) => `
          <li>
            ${escaparHTML(producto.nombre)}:
            ${producto.cantidad} unidades
          </li>
        `).join("")}
      </ul>
    `;
  } catch (error) {
    console.error("Error al consultar los muebles vendidos:", error);
    contenedor.textContent = "No se pudo cargar el reporte de muebles.";
  }
}

document.querySelector("#btn-productos-vendidos")
  .addEventListener("click", cargarProductosVendidos);


// Recordarme usa el almacenamiento definido en supabase-client.js.
const selectorRecordarme = document.querySelector("#recordarme");
selectorRecordarme.checked = recordarSesion;
selectorRecordarme.nextElementSibling.classList.toggle("on", recordarSesion);
selectorRecordarme.addEventListener("change", () => {
  selectorRecordarme.nextElementSibling.classList.toggle("on", selectorRecordarme.checked);
});

// Alta de usuarios: la función Edge valida nuevamente el rol del solicitante
// en Supabase antes de crear cualquier cuenta (no basta con ocultar el panel).
document.querySelector("#form-nuevo-usuario").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formulario = event.currentTarget;
  const mensaje = document.querySelector("#mensaje-nuevo-usuario");
  if (!usuarioEsAdministrador) {
    mensaje.textContent = "Solo el administrador puede registrar usuarios.";
    return;
  }
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  mensaje.textContent = "Registrando usuario...";
  try {
    const { data, error } = await clientesupabase.functions.invoke("registrar-usuario", {
      body: {
        nombre: document.querySelector("#nuevo-usuario-nombre").value.trim(),
        correo: document.querySelector("#nuevo-usuario-correo").value.trim(),

contacto: document.querySelector("#nuevo-usuario-contacto").value.trim(),

        password: document.querySelector("#nuevo-usuario-password").value,
        rol: document.querySelector("#nuevo-usuario-rol").value
      }
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || "No se pudo registrar.");
    formulario.reset();
    mensaje.textContent = "Usuario registrado correctamente.";
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    mensaje.textContent = "No se pudo registrar. Verifica que la función segura esté desplegada en Supabase y que tengas permisos de administrador.";
  } finally {
    boton.disabled = false;
  }
});

document.querySelector("#enlace-recuperar")?.addEventListener("click", async (event) => {
  event.preventDefault();
  const mensaje = document.querySelector("#mensaje-login");
  const email = document.querySelector("#login-email").value.trim();
  if (!email) {
    mensaje.textContent = "Escribe primero tu correo electrónico para recuperar la contraseña.";
    document.querySelector("#login-email").focus();
    return;
  }
  try {
    const { error } = await clientesupabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    mensaje.textContent = "Si el correo está registrado y la recuperación está configurada, recibirás instrucciones por email.";
  } catch (error) {
    console.error("Error al solicitar recuperación:", error);
    mensaje.textContent = "No se pudo solicitar la recuperación. Consulta al administrador.";
  }
});

// Registro de muebles: solo administrador.
let guardandoMueble = false;
let mueblePorRevisar = false;

async function prepararRegistroMueble() {
  const panel = document.querySelector("#panel-registrar-mueble");
  const select = document.querySelector("#nuevo-mueble-categoria");
  const boton = document.querySelector(
    '#form-registrar-mueble button[type="submit"]'
  );
  const mensaje = document.querySelector("#mensaje-registrar-mueble");

  panel.hidden = !usuarioEsAdministrador;
  boton.disabled = true;

  if (!usuarioEsAdministrador) return;

  select.innerHTML = '<option value="">Cargando categorías...</option>';
  mensaje.textContent = "";

  try {
    const { data, error } = await clientesupabase
      .from("categorias")
      .select("id_categoria, nombre")
      .order("nombre");

    if (error) throw error;

    select.innerHTML =
      '<option value="">Selecciona una categoría</option>' +
      data.map((categoria) => `
        <option value="${escaparHTML(categoria.id_categoria)}">
          ${escaparHTML(categoria.nombre)}
        </option>
      `).join("");

    if (data.length === 0) {
      mensaje.textContent = "Primero necesitas una categoría registrada.";
      return;
    }

    boton.disabled = guardandoMueble || mueblePorRevisar;
  } catch (error) {
    select.innerHTML =
      '<option value="">No se pudieron cargar las categorías</option>';

    manejarError(
      error,
      "#mensaje-registrar-mueble",
      "No se pudieron cargar las categorías. Actualiza la página."
    );
  }
}

document.querySelector("#form-registrar-mueble")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    if (guardandoMueble || mueblePorRevisar) return;

    const formulario = event.currentTarget;
    const mensaje = document.querySelector("#mensaje-registrar-mueble");
    const controles = formulario.querySelectorAll("input, select, button");

    if (!usuarioEsAdministrador) {
      mensaje.textContent =
        "Solo el administrador puede registrar muebles.";
      return;
    }

    const nombre = document.querySelector("#nuevo-mueble-nombre")
      .value.trim();
    const idCategoria = Number(
      document.querySelector("#nuevo-mueble-categoria").value
    );
    const precioCentavos = importeEnCentavos(
      document.querySelector("#nuevo-mueble-precio").value
    );
    const existenciaTexto = document.querySelector(
      "#nuevo-mueble-existencia"
    ).value.trim();
    const existencia = Number(existenciaTexto);

    if (!nombre || nombre.length > 200) {
      mensaje.textContent = "Escribe un nombre de hasta 200 caracteres.";
      return;
    }

    if (!Number.isSafeInteger(idCategoria) || idCategoria <= 0) {
      mensaje.textContent = "Selecciona una categoría.";
      return;
    }

    if (!Number.isSafeInteger(precioCentavos) || precioCentavos <= 0) {
      mensaje.textContent = "Escribe un precio válido mayor que cero.";
      return;
    }

    if (
      existenciaTexto === "" ||
      !Number.isInteger(existencia) ||
      existencia < 0 ||
      existencia > 2147483647
    ) {
      mensaje.textContent =
        "La existencia debe ser un número entero igual o mayor que cero.";
      return;
    }

    guardandoMueble = true;
    controles.forEach((control) => control.disabled = true);
    mensaje.textContent = "Guardando mueble...";

    let registrado = false;

    try {
      const { data, error } = await clientesupabase.rpc(
        "registrar_mueble_seguro",
        {
          p_nombre: nombre,
          p_id_categoria: idCategoria,
          p_precio_centavos: precioCentavos,
          p_existencia: existencia
        }
      );

      if (error) throw error;

      if (!data || !data.id_producto) {
        throw new Error("No se recibió la confirmación del registro.");
      }

      registrado = true;
      formulario.reset();
      mensaje.textContent =
        `Mueble "${data.nombre}" registrado correctamente. ` +
        `Código: ${data.id_producto}.`;
    } catch (error) {
      if (error.code === "P0001") {
        manejarError(error, "#mensaje-registrar-mueble", error.message);
      } else {
        mueblePorRevisar = true;
        manejarError(
          error,
          "#mensaje-registrar-mueble",
          "No se pudo confirmar el resultado. No repitas el registro. " +
          "Revisa la tabla productos en Supabase antes de continuar."
        );
      }
    } finally {
      guardandoMueble = false;
      controles.forEach((control) => {
        control.disabled = mueblePorRevisar || !usuarioEsAdministrador;
      });
    }

    if (registrado) {
      await cargarProductos();
    }
  });

  // Historial de ventas de stock: 10 registros por página.
let paginaHistorialVentas = 0;
let cargandoHistorialVentas = false;

function fechaHistorialMueblex(valor) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return "Fecha no disponible";

  return fecha.toLocaleString("es-BO", {
    timeZone: "America/La_Paz"
  });
}

async function cargarHistorialVentas(pagina = 0) {
  if (cargandoHistorialVentas) return;

  const cuerpo = document.querySelector("#cuerpo-historial-ventas");
  const mensaje = document.querySelector("#mensaje-historial-ventas");
  const actualizar = document.querySelector("#actualizar-historial-ventas");
  const anteriores = document.querySelector("#anteriores-historial-ventas");
  const siguientes = document.querySelector("#siguientes-historial-ventas");

  cargandoHistorialVentas = true;
  actualizar.disabled = true;
  anteriores.disabled = true;
  siguientes.disabled = true;

  document.querySelector("#detalle-venta-stock").hidden = true;
  cuerpo.innerHTML =
    '<tr><td colspan="6">Cargando historial...</td></tr>';
  mensaje.textContent = "";

  let cargaCorrecta = false;
  let hayMas = false;

  try {
    const desde = pagina * 10;

    const { data, error } = await clientesupabase
      .from("ventas")
      .select(`
        id_venta,
        fecha_venta,
        total,
        estado_pago,
        estado_operacion,
motivo_anulacion,
fecha_anulacion,
anulada_por:usuarios!ventas_id_usuario_anulacion_fkey(nombre),
        responsable:usuarios!ventas_id_usuario_fkey(nombre)
      `)
      .eq("tipo_venta", "directa_stock")
      .order("id_venta", { ascending: false })
      .range(desde, desde + 10);

    if (error) throw error;

    hayMas = data.length > 10;
    const ventas = data.slice(0, 10);

    cuerpo.innerHTML = ventas.length === 0
      ? '<tr><td colspan="6">No hay ventas en esta página.</td></tr>'
      : ventas.map((venta) => `
        <tr>
          <td>${escaparHTML(venta.id_venta)}</td>
          <td>${escaparHTML(fechaHistorialMueblex(venta.fecha_venta))}</td>
          <td>${escaparHTML(
            venta.responsable?.nombre ?? "Sin usuario asociado"
          )}</td>
          <td>${Number(venta.total).toFixed(2)}</td>
          <td>
  Pago: ${escaparHTML(venta.estado_pago)}
  <br>
  Operación: ${escaparHTML(nombreEstadoOperacion(venta.estado_operacion))}
</td>
          <td>
            <button
              type="button"
              data-ver-venta="${escaparHTML(venta.id_venta)}"
            >
              Ver detalle
            </button>
          </td>
        </tr>
      `).join("");

    paginaHistorialVentas = pagina;
    cargaCorrecta = true;

    mensaje.textContent = ventas.length === 0
      ? "No hay registros para mostrar."
      : `Página ${pagina + 1}. Ventas mostradas: ${ventas.length}.`;
  } catch (error) {
    cuerpo.innerHTML =
      '<tr><td colspan="6">No se pudo cargar el historial.</td></tr>';

    manejarError(
      error,
      "#mensaje-historial-ventas",
      "No se pudo consultar el historial. Pulsa Actualizar historial para reintentar."
    );
  } finally {
    cargandoHistorialVentas = false;
    actualizar.disabled = false;
    anteriores.disabled = !cargaCorrecta || paginaHistorialVentas === 0;
    siguientes.disabled = !cargaCorrecta || !hayMas;
  }
}

document.querySelector("#actualizar-historial-ventas")
  .addEventListener("click", () => cargarHistorialVentas(0));

document.querySelector("#anteriores-historial-ventas")
  .addEventListener("click", () => {
    if (paginaHistorialVentas > 0) {
      cargarHistorialVentas(paginaHistorialVentas - 1);
    }
  });

document.querySelector("#siguientes-historial-ventas")
  .addEventListener("click", () => {
    cargarHistorialVentas(paginaHistorialVentas + 1);
  });

document.querySelector("#cerrar-detalle-venta")
  .addEventListener("click", () => {
    document.querySelector("#detalle-venta-stock").hidden = true;
  });

  let consultaDetalleVenta = 0;

document.querySelector("#cuerpo-historial-ventas")
  .addEventListener("click", (event) => {
    const boton = event.target.closest("[data-ver-venta]");
    if (!boton) return;

    const idVenta = Number(boton.dataset.verVenta);

    if (Number.isSafeInteger(idVenta) && idVenta > 0) {
      mostrarDetalleVentaStock(idVenta);
    }
  });

async function mostrarDetalleVentaStock(idVenta) {
  const consultaActual = ++consultaDetalleVenta;
  const panel = document.querySelector("#detalle-venta-stock");
  const contenido = document.querySelector("#contenido-detalle-venta");

  panel.hidden = false;
  contenido.textContent = "Cargando detalle...";
  ventaParaImprimir = null;
document.querySelector("#imprimir-comprobante-venta").hidden = true;
document.querySelector("#panel-cobro-venta").hidden = true;
document.querySelector("#mensaje-cobro-venta").textContent = "";

  try {
    const { data: venta, error } = await clientesupabase
      .from("ventas")
      .select(`
        id_venta,
        fecha_venta,
        total,
        estado_pago,
        estado_operacion,
motivo_anulacion,
fecha_anulacion,
anulada_por:usuarios!ventas_id_usuario_anulacion_fkey(nombre),
        responsable:usuarios!ventas_id_usuario_fkey(nombre),
        cliente:clientes(nombre, contacto, direccion),
        lineas:detalle_ventas(
          id_detalle,
          cantidad,
          precio_unitario,
          subtotal,
          mueble:productos(nombre)
        ),
        cobros:pagos(
  id_pago,
  monto,
  metodo_pago,
  tipo_pago,
  fecha_pago,
  registrado_por:usuarios(nombre)
),
devoluciones:devoluciones(
  id_devolucion,
  monto,
  metodo_devolucion,
  motivo,
  fecha_devolucion,
  registrado_por:usuarios(nombre)
)
      `)
      .eq("id_venta", idVenta)
      .eq("tipo_venta", "directa_stock")
      .single();

    if (error) throw error;

    // Evitar mostrar una respuesta anterior si se abrió otra venta.
    if (consultaActual !== consultaDetalleVenta || panel.hidden) return;

    const lineas = [...(venta.lineas ?? [])]
      .sort((a, b) => Number(a.id_detalle) - Number(b.id_detalle));

    const cobros = [...(venta.cobros ?? [])]
      .sort((a, b) => Number(a.id_pago) - Number(b.id_pago));

    const totalCentavos = Math.round(Number(venta.total) * 100);
    const cobradoCentavos = cobros.reduce(
      (suma, cobro) => suma + Math.round(Number(cobro.monto) * 100),
      0
    );

    if (
      !Number.isSafeInteger(totalCentavos) ||
      !Number.isSafeInteger(cobradoCentavos)
    ) {
      throw new Error("Los importes de la venta no son válidos.");
    }

    const saldoCentavos = venta.estado_operacion === "anulada"
  ? 0
  : totalCentavos - cobradoCentavos;
prepararCobroVenta(
  venta.id_venta,
  saldoCentavos,
  venta.estado_pago
);

if (venta.estado_operacion !== "activa") {
  document.querySelector("#panel-cobro-venta").hidden = true;
}

ventaParaImprimir = {
  ...venta,
  lineas,
  cobros,
  totalCentavos,
  cobradoCentavos,
  saldoCentavos
};

document.querySelector("#imprimir-comprobante-venta").hidden = false;
    contenido.innerHTML = `
      <h4>Venta ${escaparHTML(venta.id_venta)}</h4>
      ${mostrarEstadoOperacion(venta)}
      ${mostrarDevolucionesOperacion(venta)}
      ${formularioAnulacion(venta, "venta")}
      ${formularioDevolucion(venta, "venta")}
      <p>
        Fecha:
        ${escaparHTML(fechaHistorialMueblex(venta.fecha_venta))}
      </p>

      <p>
        Responsable:
        ${escaparHTML(
          venta.responsable?.nombre ?? "Sin usuario asociado"
        )}
      </p>

      <p>
        Cliente:
        ${escaparHTML(
          venta.cliente?.nombre ?? "Sin cliente registrado"
        )}
      </p>

      <p>
        Contacto:
        ${escaparHTML(venta.cliente?.contacto ?? "No registrado")}
      </p>

      <p>
        Dirección:
        ${escaparHTML(venta.cliente?.direccion ?? "No registrada")}
      </p>

      <p>
        Estado del pago:
        ${escaparHTML(venta.estado_pago)}
      </p>

      <h4>Muebles vendidos</h4>

      <table>
        <thead>
          <tr>
            <th>Mueble</th>
            <th>Cantidad</th>
            <th>Precio unitario (Bs)</th>
            <th>Subtotal (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${lineas.length === 0
            ? '<tr><td colspan="4">No hay detalles registrados.</td></tr>'
            : lineas.map((linea) => `
              <tr>
                <td>${escaparHTML(
                  linea.mueble?.nombre ?? "Mueble no disponible"
                )}</td>
                <td>${escaparHTML(linea.cantidad)}</td>
                <td>${Number(linea.precio_unitario).toFixed(2)}</td>
                <td>${Number(linea.subtotal).toFixed(2)}</td>
              </tr>
            `).join("")}
        </tbody>
      </table>

      <p>Total vendido: Bs ${(totalCentavos / 100).toFixed(2)}</p>
      <p>Cobros registrados: Bs ${(cobradoCentavos / 100).toFixed(2)}</p>
      <p>Saldo por cobrar: Bs ${(saldoCentavos / 100).toFixed(2)}</p>

      <h4>Historial de cobros</h4>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Monto (Bs)</th>
            <th>Método</th>
            <th>Tipo</th>
            <th>Registrado por</th>
          </tr>
        </thead>
        <tbody>
          ${cobros.length === 0
            ? '<tr><td colspan="5">No hay cobros registrados.</td></tr>'
            : cobros.map((cobro) => `
              <tr>
                <td>${escaparHTML(
                  fechaHistorialMueblex(cobro.fecha_pago)
                )}</td>
                <td>${Number(cobro.monto).toFixed(2)}</td>
                <td>${escaparHTML(cobro.metodo_pago)}</td>
                <td>${escaparHTML(cobro.tipo_pago)}</td>
                <td>${escaparHTML(
                  cobro.registrado_por?.nombre ?? "No registrado"
                )}</td>
              </tr>
            `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    if (consultaActual !== consultaDetalleVenta || panel.hidden) return;

    console.error("No se pudo cargar el detalle de la venta:", error);
    contenido.textContent =
      "No se pudo cargar el detalle. Pulsa Ver detalle para reintentar.";
  }
}
// Historial de pedidos a medida: 10 registros por página.
let paginaHistorialPedidos = 0;
let cargandoHistorialPedidos = false;

async function cargarHistorialPedidos(pagina = 0) {
  if (cargandoHistorialPedidos) return;

  const cuerpo = document.querySelector("#cuerpo-historial-pedidos");
  const mensaje = document.querySelector("#mensaje-historial-pedidos");
  const actualizar = document.querySelector("#actualizar-historial-pedidos");
  const anteriores = document.querySelector("#anteriores-historial-pedidos");
  const siguientes = document.querySelector("#siguientes-historial-pedidos");

  cargandoHistorialPedidos = true;
  actualizar.disabled = true;
  anteriores.disabled = true;
  siguientes.disabled = true;

  document.querySelector("#detalle-pedido-medida").hidden = true;
  cuerpo.innerHTML =
    '<tr><td colspan="7">Cargando historial...</td></tr>';
  mensaje.textContent = "";

  let cargaCorrecta = false;
  let hayMas = false;

  try {
    const desde = pagina * 10;

    const { data, error } = await clientesupabase
      .from("ventas")
      .select(`
        id_venta,
        fecha_venta,
        total,
        estado_pago,
        estado_operacion,
motivo_anulacion,
fecha_anulacion,
anulada_por:usuarios!ventas_id_usuario_anulacion_fkey(nombre),
        cliente:clientes(nombre),
        responsable:usuarios!ventas_id_usuario_fkey(nombre)
      `)
      .eq("tipo_venta", "pedido_medida")
      .order("id_venta", { ascending: false })
      .range(desde, desde + 10);

    if (error) throw error;

    hayMas = data.length > 10;
    const pedidos = data.slice(0, 10);

    cuerpo.innerHTML = pedidos.length === 0
      ? '<tr><td colspan="7">No hay pedidos en esta página.</td></tr>'
      : pedidos.map((pedido) => `
        <tr>
          <td>${escaparHTML(pedido.id_venta)}</td>
          <td>${escaparHTML(
            fechaHistorialMueblex(pedido.fecha_venta)
          )}</td>
          <td>${escaparHTML(
            pedido.cliente?.nombre ?? "Sin cliente asociado"
          )}</td>
          <td>${escaparHTML(
            pedido.responsable?.nombre ?? "Sin usuario asociado"
          )}</td>
          <td>${Number(pedido.total).toFixed(2)}</td>
          <td>
  Pago: ${escaparHTML(pedido.estado_pago)}
  <br>
  Operación: ${escaparHTML(nombreEstadoOperacion(pedido.estado_operacion))}
</td>
          <td>
            <button
              type="button"
              data-ver-pedido="${escaparHTML(pedido.id_venta)}"
            >
              Ver detalle
            </button>
          </td>
        </tr>
      `).join("");

    paginaHistorialPedidos = pagina;
    cargaCorrecta = true;

    mensaje.textContent = pedidos.length === 0
      ? "No hay registros para mostrar."
      : `Página ${pagina + 1}. Pedidos mostrados: ${pedidos.length}.`;
  } catch (error) {
    cuerpo.innerHTML =
      '<tr><td colspan="7">No se pudo cargar el historial.</td></tr>';

    manejarError(
      error,
      "#mensaje-historial-pedidos",
      "No se pudo consultar el historial. Pulsa Actualizar historial para reintentar."
    );
  } finally {
    cargandoHistorialPedidos = false;
    actualizar.disabled = false;
    anteriores.disabled = !cargaCorrecta || paginaHistorialPedidos === 0;
    siguientes.disabled = !cargaCorrecta || !hayMas;
  }
}

document.querySelector("#actualizar-historial-pedidos")
  .addEventListener("click", () => cargarHistorialPedidos(0));

document.querySelector("#anteriores-historial-pedidos")
  .addEventListener("click", () => {
    if (paginaHistorialPedidos > 0) {
      cargarHistorialPedidos(paginaHistorialPedidos - 1);
    }
  });

document.querySelector("#siguientes-historial-pedidos")
  .addEventListener("click", () => {
    cargarHistorialPedidos(paginaHistorialPedidos + 1);
  });

document.querySelector("#cerrar-detalle-pedido")
  .addEventListener("click", () => {
    document.querySelector("#detalle-pedido-medida").hidden = true;
  });

  let consultaDetallePedido = 0;

document.querySelector("#cuerpo-historial-pedidos")
  .addEventListener("click", (event) => {
    const boton = event.target.closest("[data-ver-pedido]");
    if (!boton) return;

    const idVenta = Number(boton.dataset.verPedido);

    if (Number.isSafeInteger(idVenta) && idVenta > 0) {
      mostrarDetallePedidoMedida(idVenta);
    }
  });

async function mostrarDetallePedidoMedida(idVenta) {
  const consultaActual = ++consultaDetallePedido;
  const panel = document.querySelector("#detalle-pedido-medida");
  const contenido = document.querySelector("#contenido-detalle-pedido");

  panel.hidden = false;
  panel.dataset.idVenta = String(idVenta);
  contenido.textContent = "Cargando detalle...";
  pedidoParaImprimir = null;
document.querySelector("#imprimir-comprobante-pedido").hidden = true;
document.querySelector("#imprimir-nota-taller").hidden = true;
  document.querySelector("#panel-entrega-pedido").hidden = true;
document.querySelector("#panel-cobro-pedido").hidden = true;
document.querySelector("#mensaje-cobro-pedido").textContent = "";

  try {
    const { data: pedido, error } = await clientesupabase
      .from("ventas")
      .select(`
        id_venta,
        fecha_venta,
        total,
        estado_pago,
        estado_operacion,
motivo_anulacion,
fecha_anulacion,
anulada_por:usuarios!ventas_id_usuario_anulacion_fkey(nombre),
        responsable:usuarios!ventas_id_usuario_fkey(nombre),
        cliente:clientes(nombre, contacto, direccion),
        modalidad_entrega,
direccion_entrega,
referencia_entrega,
nombre_receptor,
contacto_receptor,
entrega_version,
        muebles:pedidos_personalizados(
          id_pedido,
          descripcion_mueble,
          medidas,
          color_melamina,
          cantidad,
          precio_unitario,
          subtotal,
                    estado_taller,
          fecha_entrega_estimada,
          historial:historial_estados_pedidos(
            id_historial,
            estado_anterior,
            estado_nuevo,
            fecha_cambio,
            responsable:usuarios(nombre)
          )
        ),
        cobros:pagos(
  id_pago,
  monto,
  metodo_pago,
  tipo_pago,
  fecha_pago,
  registrado_por:usuarios(nombre)
),
devoluciones:devoluciones(
  id_devolucion,
  monto,
  metodo_devolucion,
  motivo,
  fecha_devolucion,
  registrado_por:usuarios(nombre)
)
      `)
      .eq("id_venta", idVenta)
      .eq("tipo_venta", "pedido_medida")
      .single();

    if (error) throw error;

    if (consultaActual !== consultaDetallePedido || panel.hidden) return;
prepararEntregaPedido(pedido);
    const muebles = [...(pedido.muebles ?? [])]
      .sort((a, b) => Number(a.id_pedido) - Number(b.id_pedido));

    const cobros = [...(pedido.cobros ?? [])]
      .sort((a, b) => Number(a.id_pago) - Number(b.id_pago));

    const totalCentavos = Math.round(Number(pedido.total) * 100);
    const cobradoCentavos = cobros.reduce(
      (suma, cobro) => suma + Math.round(Number(cobro.monto) * 100),
      0
    );

    if (
      !Number.isSafeInteger(totalCentavos) ||
      !Number.isSafeInteger(cobradoCentavos)
    ) {
      throw new Error("Los importes del pedido no son válidos.");
    }

    const saldoCentavos = pedido.estado_operacion === "anulada"
  ? 0
  : totalCentavos - cobradoCentavos;
prepararCobroPedido(
  pedido.id_venta,
  saldoCentavos,
  pedido.estado_pago
);

if (pedido.estado_operacion !== "activa") {
  document.querySelector("#panel-cobro-pedido").hidden = true;
}

pedidoParaImprimir = {
  ...pedido,
  muebles,
  cobros,
  totalCentavos,
  cobradoCentavos,
  saldoCentavos
};

document.querySelector("#imprimir-comprobante-pedido").hidden = false;
document.querySelector("#imprimir-nota-taller").hidden = false;
    contenido.innerHTML = `
      <h4>Pedido asociado a la venta ${escaparHTML(pedido.id_venta)}</h4>
      ${mostrarEstadoOperacion(pedido)}
      ${mostrarDevolucionesOperacion(pedido)}
      ${formularioAnulacion(pedido, "pedido")}
      ${formularioDevolucion(pedido, "pedido")}
      <p>
        Fecha de registro:
        ${escaparHTML(fechaHistorialMueblex(pedido.fecha_venta))}
      </p>

      <p>
        Responsable:
        ${escaparHTML(
          pedido.responsable?.nombre ?? "Sin usuario asociado"
        )}
      </p>

      <p>
        Cliente:
        ${escaparHTML(
          pedido.cliente?.nombre ?? "Sin cliente asociado"
        )}
      </p>

      <p>
        Contacto:
        ${escaparHTML(pedido.cliente?.contacto ?? "No registrado")}
      </p>

      <p>
        Dirección:
        ${escaparHTML(pedido.cliente?.direccion ?? "No registrada")}
      </p>

      <p>
        Estado del pago:
        ${escaparHTML(pedido.estado_pago)}
      </p>

      <h4>Muebles a fabricar</h4>

      ${muebles.length === 0
        ? "<p>No hay muebles registrados en este pedido.</p>"
        : muebles.map((mueble) => `
          <article>
            <h4>${escaparHTML(mueble.descripcion_mueble)}</h4>

            <p>Medidas: ${escaparHTML(mueble.medidas)}</p>
            <p>Color: ${escaparHTML(mueble.color_melamina)}</p>
            <p>Cantidad: ${escaparHTML(mueble.cantidad)}</p>

            <p>
              Precio unitario:
              Bs ${Number(mueble.precio_unitario).toFixed(2)}
            </p>

            <p>
              Subtotal: Bs ${Number(mueble.subtotal).toFixed(2)}
            </p>

            <p>
  Estado del taller:
  ${escaparHTML(nombreEstadoTaller(mueble.estado_taller))}
</p>

${pedido.estado_operacion === "activa"
  ? botonEstadoTaller(mueble, pedido.id_venta)
  : ""}
${mostrarHistorialTaller(mueble)}
            <p>
              Entrega estimada:
              ${escaparHTML(mueble.fecha_entrega_estimada)}
            </p>
          </article>
        `).join("")}

      <p>Total acordado: Bs ${(totalCentavos / 100).toFixed(2)}</p>
      <p>Cobros registrados: Bs ${(cobradoCentavos / 100).toFixed(2)}</p>
      <p>Saldo por cobrar: Bs ${(saldoCentavos / 100).toFixed(2)}</p>

      <h4>Historial de cobros</h4>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Monto (Bs)</th>
            <th>Método</th>
            <th>Tipo</th>
            <th>Registrado por</th>
          </tr>
        </thead>
        <tbody>
          ${cobros.length === 0
            ? '<tr><td colspan="5">No hay cobros registrados.</td></tr>'
            : cobros.map((cobro) => `
              <tr>
                <td>${escaparHTML(
                  fechaHistorialMueblex(cobro.fecha_pago)
                )}</td>
                <td>${Number(cobro.monto).toFixed(2)}</td>
                <td>${escaparHTML(cobro.metodo_pago)}</td>
                <td>${escaparHTML(cobro.tipo_pago)}</td>
                <td>${escaparHTML(
                  cobro.registrado_por?.nombre ?? "No registrado"
                )}</td>
              </tr>
            `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    if (consultaActual !== consultaDetallePedido || panel.hidden) return;

    console.error("No se pudo cargar el detalle del pedido:", error);
    contenido.textContent =
      "No se pudo cargar el detalle. Pulsa Ver detalle para reintentar.";
  }
}

let guardandoCobroPedido = false;
let cobroPedidoPorRevisar = false;

function prepararCobroPedido(idVenta, saldoCentavos, estadoPago) {
  const panel = document.querySelector("#panel-cobro-pedido");
  const formulario = document.querySelector("#form-cobro-pedido");
  const monto = document.querySelector("#cobro-pedido-monto");
  const mensaje = document.querySelector("#mensaje-cobro-pedido");

  panel.hidden = true;
  formulario.reset();
  mensaje.textContent = "";

  document.querySelector("#cobro-pedido-id-venta").value = idVenta;
  document.querySelector("#saldo-disponible-cobro-pedido").textContent =
    (saldoCentavos / 100).toFixed(2);

  monto.max = (saldoCentavos / 100).toFixed(2);

  if (cobroPedidoPorRevisar) {
    mensaje.textContent =
      "Hay un cobro cuyo resultado necesita revisión. No registres otro todavía.";
    return;
  }

  // Un registro que figura pagado pero tiene saldo requiere revisión.
  if (estadoPago === "pagado" && saldoCentavos > 0) {
    mensaje.textContent =
      "El estado del pago no coincide con los cobros registrados. Requiere revisión.";
    return;
  }

  panel.hidden =
    saldoCentavos <= 0 ||
    !["pendiente", "anticipo_cobrado"].includes(estadoPago);
}

document.querySelector("#form-cobro-pedido")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    if (
  guardandoCobroPedido ||
  guardandoCobroVenta ||
  recuperandoCobroPendiente ||
  cobroPedidoPorRevisar ||
  cobroVentaPorRevisar
) return;

    const formulario = event.currentTarget;
    const mensaje = document.querySelector("#mensaje-cobro-pedido");
    const controles = formulario.querySelectorAll("input, select, button");

    const idVenta = Number(
      document.querySelector("#cobro-pedido-id-venta").value
    );
    const montoCentavos = importeEnCentavos(
      document.querySelector("#cobro-pedido-monto").value
    );
    const metodo = document.querySelector("#cobro-pedido-metodo").value;

    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      mensaje.textContent = "Abre nuevamente el detalle del pedido.";
      return;
    }

    if (!Number.isSafeInteger(montoCentavos) || montoCentavos <= 0) {
      mensaje.textContent = "Escribe un monto válido mayor que cero.";
      return;
    }

    if (!["efectivo", "QR", "transferencia"].includes(metodo)) {
      mensaje.textContent = "Selecciona un método de cobro.";
      return;
    }

    guardandoCobroPedido = true;
    controles.forEach((control) => control.disabled = true);
    mensaje.textContent = "Registrando pago...";

    let resultadoConfirmado = null;
    let clavePendiente = null;
    let envioIniciado = false;

    try {
      const { data: { session }, error: errorSesion } =
        await clientesupabase.auth.getSession();

      if (errorSesion) throw errorSesion;
      if (!session) {
        mensaje.textContent = "Debes iniciar sesión nuevamente.";
        return;
      }

      clavePendiente = `mueblex-cobro-pendiente-${session.user.id}`;

      const pendienteGuardado = localStorage.getItem(clavePendiente);

      if (pendienteGuardado) {
        cobroPedidoPorRevisar = true;
        mensaje.textContent =
          "Existe un cobro pendiente de confirmar. No repitas el pago. " +
          "Revisa los registros en Supabase antes de continuar.";
        return;
      }

      const solicitud = {
        p_solicitud_id: crypto.randomUUID(),
        p_id_venta: idVenta,
        p_monto_centavos: montoCentavos,
        p_metodo_pago: metodo
      };

      // Conservar la referencia si se pierde la respuesta.
      localStorage.setItem(clavePendiente, JSON.stringify(solicitud));

      envioIniciado = true;

      const { data, error } = await clientesupabase.rpc(
        "registrar_cobro_seguro",
        solicitud
      );

      if (error) throw error;

      if (!data || !data.id_pago) {
        throw new Error("No se recibió la confirmación del cobro.");
      }

      resultadoConfirmado = data;
      localStorage.removeItem(clavePendiente);
    } catch (error) {
      if (resultadoConfirmado) {
        cobroPedidoPorRevisar = true;
        mensaje.textContent =
          `El pago ${resultadoConfirmado.id_pago} fue confirmado, ` +
          "pero no se pudo limpiar su referencia local. Requiere revisión.";
      } else if (error.code === "P0001") {
        try {
          if (clavePendiente) localStorage.removeItem(clavePendiente);

          manejarError(error, "#mensaje-cobro-pedido", error.message);
        } catch {
          cobroPedidoPorRevisar = true;
          mensaje.textContent =
            "El cobro fue rechazado, pero su referencia local requiere revisión.";
        }
      } else if (envioIniciado) {
        cobroPedidoPorRevisar = true;

        manejarError(
          error,
          "#mensaje-cobro-pedido",
          "No se pudo confirmar el resultado. No repitas el pago. " +
          "Su referencia quedó guardada para revisar el cobro en Supabase."
        );
      } else {
        manejarError(
          error,
          "#mensaje-cobro-pedido",
          "No se envió el cobro. Comprueba la sesión y que el navegador permita guardar datos locales."
        );
      }
    } finally {
  guardandoCobroPedido = false;
  await prepararRecuperacionCobro();
}

    if (resultadoConfirmado && !cobroPedidoPorRevisar) {
      // Actualizar primero la lista y después volver a abrir el detalle.
      await cargarHistorialPedidos();
      await mostrarDetallePedidoMedida(idVenta);
      await cargarResumenVentas();
      mensaje.textContent =
        `Pago ${resultadoConfirmado.id_pago} registrado correctamente. ` +
        `Recibido: Bs ${Number(resultadoConfirmado.monto).toFixed(2)}. ` +
        `Saldo: Bs ${Number(resultadoConfirmado.saldo).toFixed(2)}.`;
    }
  });

  let guardandoCobroVenta = false;
let cobroVentaPorRevisar = false;

function prepararCobroVenta(idVenta, saldoCentavos, estadoPago) {
  const panel = document.querySelector("#panel-cobro-venta");
  const formulario = document.querySelector("#form-cobro-venta");
  const monto = document.querySelector("#cobro-venta-monto");
  const mensaje = document.querySelector("#mensaje-cobro-venta");

  panel.hidden = true;
  formulario.reset();
  mensaje.textContent = "";

  document.querySelector("#cobro-venta-id-venta").value = idVenta;
  document.querySelector("#saldo-disponible-cobro-venta").textContent =
    (saldoCentavos / 100).toFixed(2);

  monto.max = (saldoCentavos / 100).toFixed(2);

  if (cobroVentaPorRevisar) {
    mensaje.textContent =
      "Hay un cobro cuyo resultado necesita revisión. No registres otro todavía.";
    return;
  }

  if (estadoPago === "pagado" && saldoCentavos > 0) {
    mensaje.textContent =
      "El estado del pago no coincide con los cobros registrados. Requiere revisión.";
    return;
  }

  panel.hidden =
    saldoCentavos <= 0 ||
    !["pendiente", "anticipo_cobrado"].includes(estadoPago);
}

document.querySelector("#form-cobro-venta")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    if (
  guardandoCobroVenta ||
  guardandoCobroPedido ||
  recuperandoCobroPendiente ||
  cobroVentaPorRevisar ||
  cobroPedidoPorRevisar
) return;

    const formulario = event.currentTarget;
    const mensaje = document.querySelector("#mensaje-cobro-venta");
    const controles = formulario.querySelectorAll("input, select, button");

    const idVenta = Number(
      document.querySelector("#cobro-venta-id-venta").value
    );
    const montoCentavos = importeEnCentavos(
      document.querySelector("#cobro-venta-monto").value
    );
    const metodo = document.querySelector("#cobro-venta-metodo").value;

    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      mensaje.textContent = "Abre nuevamente el detalle de la venta.";
      return;
    }

    if (!Number.isSafeInteger(montoCentavos) || montoCentavos <= 0) {
      mensaje.textContent = "Escribe un monto válido mayor que cero.";
      return;
    }

    if (!["efectivo", "QR", "transferencia"].includes(metodo)) {
      mensaje.textContent = "Selecciona un método de cobro.";
      return;
    }

    guardandoCobroVenta = true;
    controles.forEach((control) => control.disabled = true);
    mensaje.textContent = "Registrando pago...";

    let resultadoConfirmado = null;
    let clavePendiente = null;
    let envioIniciado = false;

    try {
      const { data: { session }, error: errorSesion } =
        await clientesupabase.auth.getSession();

      if (errorSesion) throw errorSesion;

      if (!session) {
        mensaje.textContent = "Debes iniciar sesión nuevamente.";
        return;
      }

      // Misma referencia utilizada para los cobros de pedidos.
      clavePendiente = `mueblex-cobro-pendiente-${session.user.id}`;

      if (localStorage.getItem(clavePendiente)) {
        cobroVentaPorRevisar = true;
        mensaje.textContent =
          "Existe un cobro pendiente de confirmar. No repitas el pago. " +
          "Revisa los registros en Supabase antes de continuar.";
        return;
      }

      const solicitud = {
        p_solicitud_id: crypto.randomUUID(),
        p_id_venta: idVenta,
        p_monto_centavos: montoCentavos,
        p_metodo_pago: metodo
      };

      localStorage.setItem(clavePendiente, JSON.stringify(solicitud));
      envioIniciado = true;

      const { data, error } = await clientesupabase.rpc(
        "registrar_cobro_seguro",
        solicitud
      );

      if (error) throw error;

      if (!data || !data.id_pago) {
        throw new Error("No se recibió la confirmación del cobro.");
      }

      resultadoConfirmado = data;
      localStorage.removeItem(clavePendiente);
    } catch (error) {
      if (resultadoConfirmado) {
        cobroVentaPorRevisar = true;
        mensaje.textContent =
          `El pago ${resultadoConfirmado.id_pago} fue confirmado, ` +
          "pero no se pudo limpiar su referencia local. Requiere revisión.";
      } else if (error.code === "P0001") {
        try {
          if (clavePendiente) localStorage.removeItem(clavePendiente);

          manejarError(error, "#mensaje-cobro-venta", error.message);
        } catch {
          cobroVentaPorRevisar = true;
          mensaje.textContent =
            "El cobro fue rechazado, pero su referencia local requiere revisión.";
        }
      } else if (envioIniciado) {
        cobroVentaPorRevisar = true;

        manejarError(
          error,
          "#mensaje-cobro-venta",
          "No se pudo confirmar el resultado. No repitas el pago. " +
          "Su referencia quedó guardada para revisar el cobro en Supabase."
        );
      } else {
        manejarError(
          error,
          "#mensaje-cobro-venta",
          "No se envió el cobro. Comprueba la sesión y que el navegador permita guardar datos locales."
        );
      }
    } finally {
  guardandoCobroVenta = false;
  await prepararRecuperacionCobro();
}

    if (resultadoConfirmado && !cobroVentaPorRevisar) {
      await cargarHistorialVentas();
      await mostrarDetalleVentaStock(idVenta);
      await cargarResumenVentas();
      mensaje.textContent =
        `Pago ${resultadoConfirmado.id_pago} registrado correctamente. ` +
        `Recibido: Bs ${Number(resultadoConfirmado.monto).toFixed(2)}. ` +
        `Saldo: Bs ${Number(resultadoConfirmado.saldo).toFixed(2)}.`;
    }
  });
let actualizandoEstadoTaller = false;

function nombreEstadoTaller(estado) {
  const nombres = {
    pendiente: "Pendiente",
    en_fabricacion: "En fabricación",
    listo: "Listo",
    entregado: "Entregado"
  };

  return nombres[estado] ?? estado;
}

function botonEstadoTaller(mueble, idVenta) {
  const acciones = {
    pendiente: "Iniciar fabricación",
    en_fabricacion: "Marcar como listo",
    listo: "Marcar como entregado"
  };

  const texto = acciones[mueble.estado_taller];

  return `
    ${texto ? `
      <button
        type="button"
        data-avanzar-pedido="${escaparHTML(mueble.id_pedido)}"
        data-estado-actual="${escaparHTML(mueble.estado_taller)}"
        data-venta-taller="${escaparHTML(idVenta)}"
      >
        ${texto}
      </button>
    ` : ""}

    <p
      data-mensaje-estado="${escaparHTML(mueble.id_pedido)}"
      role="status"
    ></p>
  `;
}

document.querySelector("#contenido-detalle-pedido")
  .addEventListener("click", async (event) => {
    const boton = event.target.closest("[data-avanzar-pedido]");
    if (!boton || actualizandoEstadoTaller) return;

    const idPedido = Number(boton.dataset.avanzarPedido);
    const idVenta = Number(boton.dataset.ventaTaller);
    const estadoActual = boton.dataset.estadoActual;
    const panel = document.querySelector("#detalle-pedido-medida");
    const mensaje = boton.closest("article")
      .querySelector("[data-mensaje-estado]");

    if (
      !Number.isSafeInteger(idPedido) ||
      idPedido <= 0 ||
      !Number.isSafeInteger(idVenta) ||
      idVenta <= 0
    ) {
      mensaje.textContent = "Abre nuevamente el detalle del pedido.";
      return;
    }

    actualizandoEstadoTaller = true;
    boton.disabled = true;
    mensaje.textContent = "Actualizando estado...";

    let resultado = null;

    try {
      const { data, error } = await clientesupabase.rpc(
        "avanzar_estado_pedido",
        {
          p_id_pedido: idPedido,
          p_estado_actual: estadoActual
        }
      );

      if (error) throw error;

      if (!data || !data.estado_nuevo) {
        throw new Error("No se recibió la confirmación del cambio.");
      }

      resultado = data;
    } catch (error) {
      console.error("No se pudo confirmar el cambio de estado:", error);

      mensaje.textContent = error.code === "P0001"
        ? error.message
        : "No se pudo confirmar el resultado. Cierra y vuelve a abrir " +
          "el detalle para consultar el estado antes de repetir.";

      // Consultar de nuevo el detalle antes de volver a intentar.
      boton.disabled = true;
    } finally {
      actualizandoEstadoTaller = false;
    }

    if (
      resultado &&
      !panel.hidden &&
      panel.dataset.idVenta === String(idVenta)
    ) {
      await mostrarDetallePedidoMedida(idVenta);

      const nuevoMensaje = document.querySelector(
        `[data-mensaje-estado="${idPedido}"]`
      );

      if (nuevoMensaje) {
        nuevoMensaje.textContent =
          `Estado actualizado: ${nombreEstadoTaller(resultado.estado_nuevo)}.`;
      }
    }
  });

  function mostrarHistorialTaller(mueble) {
  const cambios = [...(mueble.historial ?? [])].sort(
    (a, b) => Number(a.id_historial) - Number(b.id_historial)
  );

  return `
    <h4>Historial del taller</h4>

    ${cambios.length === 0
      ? "<p>No hay cambios de estado registrados.</p>"
      : `
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estado anterior</th>
              <th>Estado nuevo</th>
              <th>Realizado por</th>
            </tr>
          </thead>
          <tbody>
            ${cambios.map((cambio) => `
              <tr>
                <td>${escaparHTML(
                  fechaHistorialMueblex(cambio.fecha_cambio)
                )}</td>
                <td>${escaparHTML(
                  nombreEstadoTaller(cambio.estado_anterior)
                )}</td>
                <td>${escaparHTML(
                  nombreEstadoTaller(cambio.estado_nuevo)
                )}</td>
                <td>${escaparHTML(
                  cambio.responsable?.nombre ?? "No registrado"
                )}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
  `;
}

let guardandoEntregaPedido = false;

function actualizarCamposEntrega() {
  const domicilio =
    document.querySelector("#entrega-modalidad").value === "domicilio";

  document.querySelector("#campos-entrega-domicilio").hidden =
    !domicilio;

  document.querySelector("#entrega-direccion").required = domicilio;
  document.querySelector("#entrega-direccion").disabled = !domicilio;
  document.querySelector("#entrega-referencia").disabled = !domicilio;
}

function prepararEntregaPedido(pedido) {
  const panel = document.querySelector("#panel-entrega-pedido");
  const formulario = document.querySelector("#form-entrega-pedido");

  formulario.reset();

  for (const campo of formulario.elements) {
    campo.disabled = false;
  }

  document.querySelector("#mensaje-entrega-pedido").textContent = "";

  document.querySelector("#entrega-id-venta").value = pedido.id_venta;
  document.querySelector("#entrega-version").value = pedido.entrega_version;

  document.querySelector("#entrega-modalidad").value =
    pedido.modalidad_entrega ?? "";

  document.querySelector("#entrega-direccion").value =
    pedido.direccion_entrega ?? "";

  document.querySelector("#entrega-referencia").value =
    pedido.referencia_entrega ?? "";

  document.querySelector("#entrega-nombre").value =
    pedido.nombre_receptor ?? pedido.cliente?.nombre ?? "";

  document.querySelector("#entrega-contacto").value =
    pedido.contacto_receptor ?? pedido.cliente?.contacto ?? "";

  actualizarCamposEntrega();
  mostrarResumenEntrega(pedido);
  panel.hidden = ![
    "pendiente",
    "anticipo_cobrado",
    "pagado"
  ].includes(pedido.estado_pago);
}

document.querySelector("#entrega-modalidad")
  .addEventListener("change", actualizarCamposEntrega);

document.querySelector("#form-entrega-pedido")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const mensaje = document.querySelector("#mensaje-entrega-pedido");

    if (guardandoEntregaPedido) {
      mensaje.textContent = "Espera a que termine el guardado actual.";
      return;
    }

    const idVenta = Number(
      document.querySelector("#entrega-id-venta").value
    );

    const versionTexto =
      document.querySelector("#entrega-version").value;

    const version = Number(versionTexto);
    const modalidad =
      document.querySelector("#entrega-modalidad").value;
    const direccion =
      document.querySelector("#entrega-direccion").value.trim();
    const referencia =
      document.querySelector("#entrega-referencia").value.trim();
    const nombre =
      document.querySelector("#entrega-nombre").value.trim();
    const contacto =
      document.querySelector("#entrega-contacto").value.trim();

    if (
      !Number.isSafeInteger(idVenta) || idVenta <= 0 ||
      versionTexto === "" ||
      !Number.isSafeInteger(version) || version < 0
    ) {
      mensaje.textContent =
        "Cierra y vuelve a abrir el detalle del pedido.";
      return;
    }

    if (
      !["retiro_tienda", "domicilio"].includes(modalidad) ||
      !nombre || !contacto ||
      (modalidad === "domicilio" && !direccion)
    ) {
      mensaje.textContent =
        "Completa la modalidad, los datos de quien recibe y, " +
        "si corresponde, la dirección de entrega.";
      return;
    }

    const consultaAlGuardar = consultaDetallePedido;

    const sigueEnEsteDetalle = () =>
      consultaAlGuardar === consultaDetallePedido &&
      !document.querySelector("#detalle-pedido-medida").hidden &&
      Number(document.querySelector("#entrega-id-venta").value)
        === idVenta;

    guardandoEntregaPedido = true;

    for (const campo of formulario.elements) {
      campo.disabled = true;
    }

    mensaje.textContent = "Guardando datos de entrega...";

    let confirmado = false;

    try {
      const { data, error } = await clientesupabase.rpc(
        "guardar_entrega_pedido",
        {
          p_id_venta: idVenta,
          p_version: version,
          p_modalidad: modalidad,
          p_direccion: modalidad === "domicilio" ? direccion : null,
          p_referencia: modalidad === "domicilio" ? referencia : null,
          p_nombre: nombre,
          p_contacto: contacto
        }
      );

      if (error) throw error;

      if (!data || Number(data.id_venta) !== idVenta) {
        throw new Error("No se recibió la confirmación.");
      }

      confirmado = true;
    } catch (error) {
      console.error("Error al guardar entrega:", error);

      if (sigueEnEsteDetalle()) {
        mensaje.textContent = error.code === "P0001"
          ? error.message +
            " Cierra y vuelve a abrir el detalle para reintentar."
          : "No se pudo confirmar el resultado. Cierra y vuelve " +
            "a abrir el detalle para consultar lo guardado antes de repetir.";
      }
    } finally {
      guardandoEntregaPedido = false;
    }

    if (confirmado && sigueEnEsteDetalle()) {
      await mostrarDetallePedidoMedida(idVenta);

      if (
        !document.querySelector("#detalle-pedido-medida").hidden &&
        Number(document.querySelector("#entrega-id-venta").value)
          === idVenta &&
        !document.querySelector("#panel-entrega-pedido").hidden
      ) {
        document.querySelector("#mensaje-entrega-pedido").textContent =
          "Datos de entrega guardados correctamente.";
      }
    }
  });

function mostrarResumenEntrega(pedido) {
  const resumen = document.querySelector("#resumen-entrega-pedido");
  const formulario = document.querySelector("#form-entrega-pedido");
  const boton = document.querySelector("#editar-entrega-pedido");

  const registrada = [
    "retiro_tienda",
    "domicilio"
  ].includes(pedido.modalidad_entrega);

  formulario.hidden = registrada;
  boton.hidden = !registrada;
if (pedido.estado_operacion !== "activa") {
  formulario.hidden = true;
  boton.hidden = true;
}
  if (!registrada) {
    resumen.textContent =
      "Este pedido todavía no tiene datos de entrega guardados.";
    return;
  }

  const domicilio = pedido.modalidad_entrega === "domicilio";

  resumen.innerHTML = `
    <p>
      Modalidad:
      ${domicilio ? "Entrega a domicilio" : "Retiro en tienda"}
    </p>

    ${domicilio ? `
      <p>
        Dirección de entrega:
        ${escaparHTML(pedido.direccion_entrega ?? "No registrada")}
      </p>
      <p>
        Referencia:
        ${escaparHTML(pedido.referencia_entrega || "Sin referencia")}
      </p>
    ` : ""}

    <p>
      ${domicilio ? "Recibe" : "Retira"}:
      ${escaparHTML(pedido.nombre_receptor ?? "No registrado")}
    </p>

    <p>
      Teléfono:
      ${escaparHTML(pedido.contacto_receptor ?? "No registrado")}
    </p>
  `;
}

document.querySelector("#editar-entrega-pedido")
  .addEventListener("click", () => {
    if (guardandoEntregaPedido) return;

    document.querySelector("#form-entrega-pedido").hidden = false;
    document.querySelector("#editar-entrega-pedido").hidden = true;
    document.querySelector("#mensaje-entrega-pedido").textContent = "";

    document.querySelector("#entrega-modalidad").focus();
  });

let ventaParaImprimir = null;

function abrirDocumentoImprimible(titulo, contenido) {
  const ventana = window.open("", "_blank");

  if (!ventana) {
    window.alert(
      "El navegador bloqueó la ventana. Permite las ventanas " +
      "emergentes de Mueblex y vuelve a pulsar el botón."
    );
    return;
  }

  ventana.opener = null;

  ventana.document.open();
  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escaparHTML(titulo)}</title>
      </head>
      <body>
        <button type="button" id="imprimir-documento">
          Imprimir / Guardar como PDF
        </button>

        <main>
          <h1>MUEBLEX</h1>
          <p>Muebles de melamina</p>
          ${contenido}
        </main>
      </body>
    </html>
  `);
  ventana.document.close();

  const boton = ventana.document.querySelector("#imprimir-documento");

  ventana.addEventListener("afterprint", () => {
    boton.hidden = false;
  });

  boton.addEventListener("click", () => {
    boton.hidden = true;

    try {
      ventana.focus();
      ventana.print();
    } finally {
      boton.hidden = false;
    }
  });
}

function tablaCobrosComprobante(cobros) {
  return `
    <h3>Cobros registrados</h3>

    ${cobros.length === 0
      ? "<p>No hay cobros registrados.</p>"
      : `
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto (Bs)</th>
              <th>Método</th>
              <th>Tipo</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            ${cobros.map((cobro) => `
              <tr>
                <td>${escaparHTML(
                  fechaHistorialMueblex(cobro.fecha_pago)
                )}</td>
                <td>${Number(cobro.monto).toFixed(2)}</td>
                <td>${escaparHTML(cobro.metodo_pago)}</td>
                <td>${escaparHTML(cobro.tipo_pago)}</td>
                <td>${escaparHTML(
                  cobro.registrado_por?.nombre ?? "No registrado"
                )}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
  `;
}

document.querySelector("#imprimir-comprobante-venta")
  .addEventListener("click", () => {
    const venta = ventaParaImprimir;

    if (
      !venta ||
      document.querySelector("#detalle-venta-stock").hidden
    ) {
      window.alert("Abre nuevamente el detalle de la venta.");
      return;
    }

    const contenido = `
      <h2>Comprobante de venta ${escaparHTML(venta.id_venta)}</h2>
${mostrarEstadoOperacion(venta)}
      <p>
        Fecha:
        ${escaparHTML(fechaHistorialMueblex(venta.fecha_venta))}
      </p>

      <p>
        Registrada por:
        ${escaparHTML(venta.responsable?.nombre ?? "No registrado")}
      </p>

      <p>
        Cliente:
        ${escaparHTML(venta.cliente?.nombre ?? "Sin cliente registrado")}
      </p>

      <p>
        Estado del pago: ${escaparHTML(venta.estado_pago)}
      </p>

      <table>
        <thead>
          <tr>
            <th>Mueble</th>
            <th>Cantidad</th>
            <th>Precio unitario (Bs)</th>
            <th>Subtotal (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${venta.lineas.map((linea) => `
            <tr>
              <td>${escaparHTML(
                linea.mueble?.nombre ?? "Mueble no disponible"
              )}</td>
              <td>${escaparHTML(linea.cantidad)}</td>
              <td>${Number(linea.precio_unitario).toFixed(2)}</td>
              <td>${Number(linea.subtotal).toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <p>Total de la venta: Bs ${
        (venta.totalCentavos / 100).toFixed(2)
      }</p>

      <p>Total cobrado: Bs ${
        (venta.cobradoCentavos / 100).toFixed(2)
      }</p>

      <p>Saldo por cobrar: Bs ${
        (venta.saldoCentavos / 100).toFixed(2)
      }</p>

      ${tablaCobrosComprobante(venta.cobros)}
${mostrarDevolucionesOperacion(venta)}
      <p>Comprobante interno de Mueblex.</p>
    `;

    abrirDocumentoImprimible(
      `Mueblex - Venta ${venta.id_venta}`,
      contenido
    );
  });


  let pedidoParaImprimir = null;

function entregaParaDocumento(pedido) {
  const modalidad = pedido.modalidad_entrega;

  if (!["retiro_tienda", "domicilio"].includes(modalidad)) {
    return `
      <h3>Entrega</h3>
      <p>Datos de entrega pendientes de registrar.</p>
    `;
  }

  const domicilio = modalidad === "domicilio";

  return `
    <h3>Entrega</h3>

    <p>
      Modalidad:
      ${domicilio ? "Entrega a domicilio" : "Retiro en tienda"}
    </p>

    ${domicilio ? `
      <p>
        Dirección de entrega:
        ${escaparHTML(pedido.direccion_entrega ?? "No registrada")}
      </p>
      <p>
        Referencia:
        ${escaparHTML(pedido.referencia_entrega || "Sin referencia")}
      </p>
    ` : ""}

    <p>
      ${domicilio ? "Recibe" : "Retira"}:
      ${escaparHTML(pedido.nombre_receptor ?? "No registrado")}
    </p>

    <p>
      Teléfono:
      ${escaparHTML(pedido.contacto_receptor ?? "No registrado")}
    </p>
  `;
}

function mueblesParaDocumento(pedido, incluirPrecios) {
  return pedido.muebles.map((mueble) => `
    <article>
      <h3>${escaparHTML(mueble.descripcion_mueble)}</h3>

      <p>Referencia del mueble: ${escaparHTML(mueble.id_pedido)}</p>
      <p>Medidas: ${escaparHTML(mueble.medidas)}</p>
      <p>Color de melamina: ${escaparHTML(mueble.color_melamina)}</p>
      <p>Cantidad: ${escaparHTML(mueble.cantidad)}</p>

      <p>
        Estado del taller:
        ${escaparHTML(nombreEstadoTaller(mueble.estado_taller))}
      </p>

      <p>
        Entrega estimada:
        ${escaparHTML(mueble.fecha_entrega_estimada ?? "No registrada")}
      </p>

      ${incluirPrecios ? `
        <p>
          Precio unitario:
          Bs ${Number(mueble.precio_unitario).toFixed(2)}
        </p>
        <p>
          Subtotal: Bs ${Number(mueble.subtotal).toFixed(2)}
        </p>
      ` : ""}
    </article>
  `).join("");
}

function imprimirDocumentoPedido(esNotaTaller) {
  const pedido = pedidoParaImprimir;

  if (
    !pedido ||
    document.querySelector("#detalle-pedido-medida").hidden
  ) {
    window.alert("Abre nuevamente el detalle del pedido.");
    return;
  }

  const titulo = esNotaTaller
    ? `Nota para el taller — Venta ${pedido.id_venta}`
    : `Comprobante de pedido — Venta ${pedido.id_venta}`;

  const contenido = `
    <h2>${escaparHTML(titulo)}</h2>
${mostrarEstadoOperacion(pedido)}

${esNotaTaller && pedido.estado_operacion === "anulada"
  ? "<p><strong>PEDIDO ANULADO: no fabricar ni entregar.</strong></p>"
  : ""}
    <p>
      Fecha de registro:
      ${escaparHTML(fechaHistorialMueblex(pedido.fecha_venta))}
    </p>

    <p>
      Registrado por:
      ${escaparHTML(pedido.responsable?.nombre ?? "No registrado")}
    </p>

    <p>
      Cliente:
      ${escaparHTML(pedido.cliente?.nombre ?? "No registrado")}
    </p>

    <p>
      Contacto del cliente:
      ${escaparHTML(pedido.cliente?.contacto ?? "No registrado")}
    </p>

    <h3>Muebles del pedido</h3>

    ${mueblesParaDocumento(pedido, !esNotaTaller)}

    ${entregaParaDocumento(pedido)}

    ${!esNotaTaller ? `
      <h3>Importes del pedido</h3>

      <p>
        Estado del pago: ${escaparHTML(pedido.estado_pago)}
      </p>

      <p>
        Total acordado:
        Bs ${(pedido.totalCentavos / 100).toFixed(2)}
      </p>

      <p>
        Total cobrado:
        Bs ${(pedido.cobradoCentavos / 100).toFixed(2)}
      </p>

      <p>
        Saldo por cobrar:
        Bs ${(pedido.saldoCentavos / 100).toFixed(2)}
      </p>

      ${tablaCobrosComprobante(pedido.cobros)}
${mostrarDevolucionesOperacion(pedido)}
      <p>Comprobante interno de Mueblex.</p>
    ` : `
      <h3>Observaciones del taller</h3>
      <p>________________________________________________</p>
      <p>________________________________________________</p>
      <p>Responsable: _____________________________________</p>
    `}
  `;

  abrirDocumentoImprimible(`Mueblex - ${titulo}`, contenido);
}

document.querySelector("#imprimir-comprobante-pedido")
  .addEventListener("click", () => {
    imprimirDocumentoPedido(false);
  });

document.querySelector("#imprimir-nota-taller")
  .addEventListener("click", () => {
    imprimirDocumentoPedido(true);
  });
  
function estadoStockMueble(existencia) {
  if (
    existencia === null ||
    existencia === undefined ||
    String(existencia).trim() === ""
  ) {
    return "Revisar existencia";
  }

  const cantidad = Number(existencia);

  if (!Number.isSafeInteger(cantidad) || cantidad < 0) {
    return "Revisar existencia";
  }

  if (cantidad === 0) return "Agotado";
  if (cantidad <= 3) return "Stock bajo";

  return "Disponible";
}

let guardandoReposicionStock = false;
let reposicionPendiente = null;
let claveReposicionStock = null;

function actualizarExistenciaReposicion() {
  const id = document.querySelector("#reposicion-producto").value;

  const producto = productosCache.find(
    (mueble) => String(mueble.id_producto) === id
  );

  document.querySelector("#reposicion-existencia-actual").textContent =
    producto
      ? `Existencia consultada: ${producto.existencia} unidades.`
      : "";
}

function ajustarFormularioReposicion() {
  const formulario = document.querySelector("#form-reposicion-stock");
  const pendiente = reposicionPendiente !== null;

  for (const campo of formulario.querySelectorAll("input, select")) {
    campo.disabled = guardandoReposicionStock || pendiente;
  }

  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = guardandoReposicionStock || !claveReposicionStock;
  boton.textContent = pendiente
    ? "Confirmar resultado pendiente"
    : "Registrar ingreso de stock";
}

async function prepararReposicionStock(productos) {
  const panel = document.querySelector("#panel-reposicion-stock");
  const select = document.querySelector("#reposicion-producto");
  const mensaje = document.querySelector("#mensaje-reposicion-stock");

  panel.hidden = !usuarioEsAdministrador;
  if (!usuarioEsAdministrador || guardandoReposicionStock) return;

  const seleccionAnterior = select.value;

  select.innerHTML =
    '<option value="">Selecciona un mueble</option>' +
    productos.map((producto) => `
      <option value="${escaparHTML(producto.id_producto)}">
        ${escaparHTML(producto.nombre)}
      </option>
    `).join("");

  claveReposicionStock = null;
  reposicionPendiente = null;
  ajustarFormularioReposicion();

  try {
    const { data: { session }, error } =
      await clientesupabase.auth.getSession();

    if (error) throw error;
    if (!session) throw new Error("No hay sesión activa.");

    const clave = `mueblex-reposicion-pendiente-${session.user.id}`;
    const guardado = localStorage.getItem(clave);

    if (guardado) {
      const pendiente = JSON.parse(guardado);

      if (
        typeof pendiente.p_solicitud_id !== "string" ||
        !Number.isSafeInteger(pendiente.p_id_producto) ||
        pendiente.p_id_producto <= 0 ||
        !Number.isSafeInteger(pendiente.p_cantidad) ||
        pendiente.p_cantidad <= 0 ||
        typeof pendiente.p_motivo !== "string"
      ) {
        throw new Error("La solicitud pendiente necesita revisión.");
      }

      reposicionPendiente = pendiente;
      select.value = String(pendiente.p_id_producto);

      document.querySelector("#reposicion-cantidad").value =
        pendiente.p_cantidad;
      document.querySelector("#reposicion-motivo").value =
        pendiente.p_motivo;

      mensaje.textContent =
        "Hay un ingreso pendiente de confirmar. Pulsa " +
        "Confirmar resultado pendiente para resolver la misma solicitud.";
    } else {
      select.value = seleccionAnterior;
    }

    claveReposicionStock = clave;
  } catch (error) {
    console.error("No se pudo preparar la reposición:", error);

    mensaje.textContent =
      "No se pudo preparar el registro de stock. " +
      "Recarga la página. Si continúa, envíame este mensaje.";
  }

  actualizarExistenciaReposicion();
  ajustarFormularioReposicion();
}

document.querySelector("#reposicion-producto")
  .addEventListener("change", actualizarExistenciaReposicion);

document.querySelector("#form-reposicion-stock")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    if (guardandoReposicionStock || !claveReposicionStock) return;

    const formulario = event.currentTarget;
    const mensaje = document.querySelector("#mensaje-reposicion-stock");

    if (!usuarioEsAdministrador) {
      mensaje.textContent =
        "Solo el administrador puede registrar reposiciones.";
      return;
    }

    let parametros = reposicionPendiente;

    if (!parametros) {
      const idProducto = Number(
        document.querySelector("#reposicion-producto").value
      );

      const cantidad = Number(
        document.querySelector("#reposicion-cantidad").value
      );

      const motivo =
        document.querySelector("#reposicion-motivo").value.trim();

      if (
        !Number.isSafeInteger(idProducto) || idProducto <= 0 ||
        !productosCache.some(
          (producto) => Number(producto.id_producto) === idProducto
        ) ||
        !Number.isSafeInteger(cantidad) ||
        cantidad <= 0 || cantidad > 2147483647 ||
        !motivo || motivo.length > 500
      ) {
        mensaje.textContent =
          "Selecciona un mueble, una cantidad entera mayor que cero " +
          "y un motivo de hasta 500 caracteres.";
        return;
      }

      parametros = {
        p_solicitud_id: crypto.randomUUID(),
        p_id_producto: idProducto,
        p_cantidad: cantidad,
        p_motivo: motivo
      };
    }

    // Guardar la solicitud antes de enviarla permite repetir
    // exactamente el mismo identificador si se pierde la respuesta.
    try {
      localStorage.setItem(
        claveReposicionStock,
        JSON.stringify(parametros)
      );
    } catch (error) {
      mensaje.textContent =
        "No se pudo conservar la solicitud en este navegador. " +
        "No se envió el ingreso.";
      return;
    }

    reposicionPendiente = parametros;
    guardandoReposicionStock = true;
    ajustarFormularioReposicion();
    mensaje.textContent = "Confirmando ingreso de stock...";

    let resultado = null;

    try {
      const { data, error } = await clientesupabase.rpc(
        "reponer_stock_seguro",
        parametros
      );

      if (error) throw error;

      if (
        !data ||
        !data.id_movimiento ||
        Number(data.id_producto) !== parametros.p_id_producto
      ) {
        throw new Error("No se recibió la confirmación del ingreso.");
      }

      localStorage.removeItem(claveReposicionStock);
      reposicionPendiente = null;
      resultado = data;
      formulario.reset();
    } catch (error) {
      console.error("Error al registrar reposición:", error);

      mensaje.textContent =
        (error.code === "P0001" ? error.message + " " : "") +
        "La solicitud quedó conservada. No registres otro ingreso " +
        "por estas mismas unidades. Puedes volver a confirmar " +
        "la misma solicitud con el botón.";

      // Si es un rechazo de validación, la transacción no se guardó.
      if (error.code === "P0001") {
        try {
          localStorage.removeItem(claveReposicionStock);
          reposicionPendiente = null;
          mensaje.textContent = error.message;
        } catch {
          mensaje.textContent +=
            " No se pudo liberar la solicitud del navegador.";
        }
      }
    } finally {
      guardandoReposicionStock = false;
      ajustarFormularioReposicion();
    }

    if (resultado) {
      await cargarProductos();
      await cargarHistorialReposiciones();

      mensaje.textContent =
        `Ingreso confirmado. Movimiento ${resultado.id_movimiento}: ` +
        `${resultado.existencia_anterior} → ` +
        `${resultado.existencia_nueva} unidades.`;
    }
  });

let paginaReposiciones = 0;
let hayMasReposiciones = false;
let consultaReposiciones = 0;

async function cargarHistorialReposiciones(pagina = 0) {
  const consultaActual = ++consultaReposiciones;
  const cuerpo = document.querySelector("#cuerpo-historial-reposiciones");
  const mensaje = document.querySelector("#mensaje-historial-reposiciones");
  const actualizar = document.querySelector("#actualizar-historial-reposiciones");
  const anteriores = document.querySelector("#anteriores-reposiciones");
  const siguientes = document.querySelector("#siguientes-reposiciones");

  actualizar.disabled = true;
  anteriores.disabled = true;
  siguientes.disabled = true;

  mensaje.textContent = "Cargando historial...";
  cuerpo.innerHTML = "";

  try {
    const inicio = pagina * 10;

    const { data, error } = await clientesupabase
      .from("movimientos_stock")
      .select(`
        id_movimiento,
        cantidad,
        existencia_anterior,
        existencia_nueva,
        motivo,
        fecha_movimiento,
        mueble:productos(nombre),
        responsable:usuarios(nombre)
      `)
      .order("id_movimiento", { ascending: false })
      .range(inicio, inicio + 10);

    if (error) throw error;
    if (consultaActual !== consultaReposiciones) return;

    paginaReposiciones = pagina;
    hayMasReposiciones = data.length > 10;

    const movimientos = data.slice(0, 10);

    cuerpo.innerHTML = movimientos.length === 0
      ? '<tr><td colspan="7">No hay reposiciones registradas en esta página.</td></tr>'
      : movimientos.map((movimiento) => `
        <tr>
          <td>${escaparHTML(
            fechaHistorialMueblex(movimiento.fecha_movimiento)
          )}</td>
          <td>${escaparHTML(
            movimiento.mueble?.nombre ?? "No disponible"
          )}</td>
          <td>${escaparHTML(movimiento.cantidad)}</td>
          <td>${escaparHTML(movimiento.existencia_anterior)}</td>
          <td>${escaparHTML(movimiento.existencia_nueva)}</td>
          <td>${escaparHTML(movimiento.motivo)}</td>
          <td>${escaparHTML(
            movimiento.responsable?.nombre ?? "No registrado"
          )}</td>
        </tr>
      `).join("");

    mensaje.textContent =
      `Página ${pagina + 1}. ` +
      "Los ingresos más recientes aparecen primero.";

    anteriores.disabled = pagina === 0;
    siguientes.disabled = !hayMasReposiciones;
  } catch (error) {
    if (consultaActual !== consultaReposiciones) return;

    console.error("Error al consultar reposiciones:", error);

    mensaje.textContent =
      "No se pudo cargar el historial. Pulsa Actualizar historial.";

    cuerpo.innerHTML =
      '<tr><td colspan="7">Historial no disponible.</td></tr>';
  } finally {
    if (consultaActual === consultaReposiciones) {
      actualizar.disabled = false;
    }
  }
}

document.querySelector("#actualizar-historial-reposiciones")
  .addEventListener("click", () => {
    cargarHistorialReposiciones(0);
  });

document.querySelector("#anteriores-reposiciones")
  .addEventListener("click", () => {
    if (paginaReposiciones > 0) {
      cargarHistorialReposiciones(paginaReposiciones - 1);
    }
  });

document.querySelector("#siguientes-reposiciones")
  .addEventListener("click", () => {
    if (hayMasReposiciones) {
      cargarHistorialReposiciones(paginaReposiciones + 1);
    }
  });

function nombreEstadoOperacion(estado) {
  if (estado === "activa") return "Activa";
  if (estado === "anulada") return "Anulada";
  return "Estado por revisar";
}

function mostrarEstadoOperacion(operacion) {
  return `
    <p>
      Estado de la operación:
      <strong>${escaparHTML(
        nombreEstadoOperacion(operacion.estado_operacion)
      )}</strong>
    </p>

    ${operacion.estado_operacion === "anulada" ? `
      <p>
        Motivo de anulación:
        ${escaparHTML(operacion.motivo_anulacion ?? "No registrado")}
      </p>

      <p>
        Anulada por:
        ${escaparHTML(
          operacion.anulada_por?.nombre ?? "No registrado"
        )}
      </p>

      <p>
        Fecha de anulación:
        ${escaparHTML(
          fechaHistorialMueblex(operacion.fecha_anulacion)
        )}
      </p>
    ` : ""}
  `;
}

let guardandoAnulacion = false;

function formularioAnulacion(operacion, tipo) {
  if (
    !usuarioEsAdministrador ||
    operacion.estado_operacion !== "activa" ||
    operacion.estado_pago !== "pendiente" ||
    (operacion.cobros ?? []).length > 0
  ) {
    return "";
  }

  return `
    <form
      data-form-anulacion
      data-id-venta="${escaparHTML(operacion.id_venta)}"
      data-tipo="${escaparHTML(tipo)}"
    >
      <h4>Anular ${tipo === "venta" ? "venta" : "pedido"} sin cobros</h4>

      <label>
        Motivo de anulación:
        <input
          type="text"
          name="motivo"
          maxlength="500"
          required
        >
      </label>

      <button type="submit">Anular operación</button>

      <p data-mensaje-anulacion role="status"></p>
    </form>
  `;
}

async function procesarAnulacion(event) {
  const formulario = event.target.closest("[data-form-anulacion]");
  if (!formulario) return;

  event.preventDefault();

  const mensaje = formulario.querySelector("[data-mensaje-anulacion]");

  if (guardandoAnulacion) {
    mensaje.textContent = "Espera a que termine la anulación actual.";
    return;
  }

  if (!usuarioEsAdministrador) {
    mensaje.textContent =
      "Solo el administrador puede anular operaciones.";
    return;
  }

  const idVenta = Number(formulario.dataset.idVenta);
  const tipo = formulario.dataset.tipo;
  const motivo = formulario.elements.namedItem("motivo").value.trim();

  if (
    !Number.isSafeInteger(idVenta) || idVenta <= 0 ||
    !["venta", "pedido"].includes(tipo) ||
    !motivo || motivo.length > 500
  ) {
    mensaje.textContent =
      "Escribe un motivo válido de hasta 500 caracteres.";
    return;
  }

  const confirmado = window.confirm(
    `¿Anular la operación ${idVenta}?\n\n` +
    "Se conservará su historial. Si es una venta de stock, " +
    "se reintegrarán sus unidades al inventario.\n\n" +
    `Motivo: ${motivo}`
  );

  if (!confirmado) return;

  guardandoAnulacion = true;

  for (const campo of formulario.elements) {
    campo.disabled = true;
  }

  mensaje.textContent = "Anulando operación...";

  let anulada = false;

  try {
    const { data, error } = await clientesupabase.rpc(
      "anular_operacion_sin_cobros",
      {
        p_id_venta: idVenta,
        p_motivo: motivo
      }
    );

    if (error) throw error;

    if (!data || Number(data.id_venta) !== idVenta) {
      throw new Error("No se recibió la confirmación.");
    }

    anulada = true;
  } catch (error) {
    console.error("Error al anular operación:", error);

    if (error.code === "P0001") {
      mensaje.textContent = error.message;

      for (const campo of formulario.elements) {
        campo.disabled = false;
      }
    } else {
      mensaje.textContent =
        "No se pudo confirmar el resultado. Cierra y vuelve a abrir " +
        "el detalle para consultar el estado antes de repetir.";
    }
  } finally {
    guardandoAnulacion = false;
  }

  if (!anulada) return;

  await Promise.allSettled([
    cargarProductos(),
    cargarResumenVentas(),
    cargarProductosVendidos(),
    tipo === "venta"
      ? cargarHistorialVentas()
      : cargarHistorialPedidos()
  ]);

  const vista = document.querySelector(
    tipo === "venta" ? "#vista-ventas" : "#vista-pedidos"
  );

  if (!vista.hidden) {
    if (tipo === "venta") {
      await mostrarDetalleVentaStock(idVenta);
    } else {
      await mostrarDetallePedidoMedida(idVenta);
    }
  }
}

document.querySelector("#contenido-detalle-venta")
  .addEventListener("submit", procesarAnulacion);

document.querySelector("#contenido-detalle-pedido")
  .addEventListener("submit", procesarAnulacion);

function formatearNetoReporte(valor) {
  const texto = String(valor).trim();
  const negativo = texto.startsWith("-");
  const importe = formatearImporteReporte(
    negativo ? texto.slice(1) : texto
  );

  return negativo && importe !== "0.00"
    ? `-${importe}`
    : importe;
}

function mostrarDevolucionesOperacion(operacion) {
  const datos = operacion.devoluciones;

  const devoluciones = Array.isArray(datos)
    ? datos
    : datos ? [datos] : [];

  if (devoluciones.length === 0) return "";

  return `
    <h4>Devolución de dinero registrada</h4>

    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Monto (Bs)</th>
          <th>Método</th>
          <th>Motivo</th>
          <th>Registrada por</th>
        </tr>
      </thead>
      <tbody>
        ${devoluciones.map((devolucion) => `
          <tr>
            <td>${escaparHTML(
              fechaHistorialMueblex(devolucion.fecha_devolucion)
            )}</td>
            <td>${Number(devolucion.monto).toFixed(2)}</td>
            <td>${escaparHTML(devolucion.metodo_devolucion)}</td>
            <td>${escaparHTML(devolucion.motivo)}</td>
            <td>${escaparHTML(
              devolucion.registrado_por?.nombre ?? "No registrado"
            )}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

