
// Guía 12, desafío 3.8: varios muebles de stock en una venta.
// Ampliación propia: pedidos a medida y cobro inicial. No descuenta stock.
// Los guardados son separados: no constituyen una transacción atómica.
let productosCache = [];
let mueblesSeleccionados = [];
let guardandoVenta = false;
let ventaPorRevisar = false;
let guardandoCliente = false;
let clientePorRevisar = false;
let clientesCache = [];
let mueblesPedido = [];
let siguienteLineaPedido = 1;
let guardandoPedido = false;
let pedidoPorRevisar = false;

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

async function iniciar() {
  const cuerpoTabla = document.querySelector("#cuerpo-productos");
  cuerpoTabla.innerHTML = '<tr><td colspan="3">Cargando productos...</td></tr>';
  productosCache = [];
  llenarSelectProductos([]);
  try {
    const { data, error } = await clientesupabase.from("productos").select();
    if (error) throw error;
    productosCache = data;
    llenarSelectProductos(data);
    cuerpoTabla.innerHTML = data.length === 0
      ? '<tr><td colspan="3">Todavía no hay productos registrados.</td></tr>'
      : data.map((producto) => `
        <tr>
          <td>${escaparHTML(producto.nombre)}</td>
          <td>${escaparHTML(producto.precio)}</td>
          <td>${escaparHTML(producto.existencia)}</td>
        </tr>
      `).join("");
  } catch (error) {
    console.error("Error al leer productos:", error);
    cuerpoTabla.innerHTML = '<tr><td colspan="3">No se pudo cargar el listado.</td></tr>';
  }
}

async function probarClientes() {
  const cuerpo = document.querySelector("#cuerpo-clientes");
  cuerpo.innerHTML = '<tr><td colspan="2">Cargando clientes...</td></tr>';
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
      ? '<tr><td colspan="2">Todavía no hay clientes registrados.</td></tr>'
      : data.map((cliente) => `
        <tr><td>${escaparHTML(cliente.nombre)}</td><td>${escaparHTML(cliente.contacto)}</td></tr>
      `).join("");
  } catch (error) {
    console.error("Error al leer clientes:", error);
    cuerpo.innerHTML = '<tr><td colspan="2">No se pudo cargar el listado de clientes.</td></tr>';
  }
}

document.querySelector("#agregar-mueble").addEventListener("click", () => {
  if (guardandoVenta || ventaPorRevisar) return;
  const mensaje = document.querySelector("#mensaje-venta");
  const idProducto = Number(document.querySelector("#campo-producto").value);
  const cantidad = Number(document.querySelector("#campo-cantidad").value);
  const producto = productosCache.find((p) => Number(p.id_producto) === idProducto);
  if (!producto || !Number.isSafeInteger(idProducto) || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
    mensaje.textContent = "Selecciona un producto y escribe una cantidad entera mayor que cero.";
    return;
  }
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
  if (guardandoVenta || ventaPorRevisar || mueblesSeleccionados.length === 0) return;
  const formulario = event.currentTarget;
  const mensaje = document.querySelector("#mensaje-venta");
  const lineas = mueblesSeleccionados.map((m) => ({ ...m }));
  const totalCentavos = lineas.reduce((s, m) => s + m.precioCentavos * m.cantidad, 0);
  guardandoVenta = true;
  actualizarBotonesVenta();
  mensaje.textContent = "Guardando venta...";
  let idVenta = null;
  try {
    const { data: venta, error: errorVenta } = await clientesupabase.from("ventas")
      .insert({ id_usuario: 1, tipo_venta: "directa_stock", total: totalCentavos / 100, estado_pago: "pendiente" })
      .select().single();
    if (errorVenta) throw errorVenta;
    idVenta = venta.id_venta;
    const detalles = lineas.map((m) => ({
      id_venta: idVenta, id_producto: m.id_producto, cantidad: m.cantidad,
      precio_unitario: m.precioCentavos / 100,
      subtotal: m.precioCentavos * m.cantidad / 100
    }));
    // Un segundo insert envía todas las filas del detalle como un arreglo.
    const { error: errorDetalle } = await clientesupabase.from("detalle_ventas").insert(detalles);
    if (errorDetalle) throw errorDetalle;
    mueblesSeleccionados = [];
    formulario.reset();
    renderizarMueblesSeleccionados();
    mensaje.textContent = `Venta ${idVenta} registrada correctamente con ${lineas.length} muebles diferentes.`;
  } catch (error) {
    console.error("Error durante el guardado de la venta:", error);
    ventaPorRevisar = true;
    mensaje.textContent = idVenta === null
      ? "No se confirmó el resultado. Revisa ventas y detalle_ventas antes de reintentar. El envío quedó bloqueado en esta página."
      : `La venta ${idVenta} se guardó, pero no se confirmó su detalle. Revisa ambas tablas antes de reintentar. El envío quedó bloqueado en esta página.`;
  } finally {
    guardandoVenta = false;
    actualizarBotonesVenta();
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
  if (!nombre || !contacto) {
    mensaje.textContent = "Completa el nombre y el teléfono.";
    return;
  }
  guardandoCliente = true;
  boton.disabled = true;
  mensaje.textContent = "Guardando cliente...";
  try {
    const { error } = await clientesupabase.from("clientes").insert({ nombre, contacto });
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
  const valor = String(texto).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(valor)) return null;
  const [entero, decimal = ""] = valor.split(".");
  const centavos = Number(entero) * 100 + Number(decimal.padEnd(2, "0"));
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
  let idVenta = null;
  let etapa = "crear la venta del pedido";
  try {
    // Primero pendiente: el estado solo cambia cuando el pago se confirma.
    const { data: venta, error: errorVenta } = await clientesupabase.from("ventas")
      .insert({ id_usuario: 1, id_cliente: idCliente, tipo_venta: "pedido_medida",
        total: total / 100, estado_pago: "pendiente" })
      .select().single();
    if (errorVenta) throw errorVenta;
    idVenta = venta.id_venta;
    etapa = "guardar las especificaciones de los muebles";
    const especificaciones = lineas.map((mueble) => ({
      id_venta: idVenta,
      descripcion_mueble: mueble.descripcion,
      medidas: mueble.medidas,
      color_melamina: mueble.color,
      estado_taller: "pendiente",
      fecha_entrega_estimada: mueble.fechaEntrega,
      cantidad: mueble.cantidad,
      precio_unitario: mueble.precioCentavos / 100,
      subtotal: mueble.precioCentavos * mueble.cantidad / 100
    }));
    const { error: errorPedido } = await clientesupabase.from("pedidos_personalizados").insert(especificaciones);
    if (errorPedido) throw errorPedido;
    if (recibido > 0) {
      etapa = "guardar el cobro inicial";
      const { error: errorPago } = await clientesupabase.from("pagos").insert({
        id_venta: idVenta, monto: recibido / 100, metodo_pago: metodo,
        tipo_pago: recibido === total ? "pago_total" : "anticipo"
      });
      if (errorPago) throw errorPago;
      etapa = "actualizar el estado del pago";
      const estado = recibido === total ? "pagado" : "anticipo_cobrado";
      const { error: errorEstado } = await clientesupabase.from("ventas")
        .update({ estado_pago: estado }).eq("id_venta", idVenta).select("id_venta").single();
      if (errorEstado) throw errorEstado;
    }
    mueblesPedido = [];
    formulario.reset();
    renderizarPedido();
    mensaje.textContent = `Pedido registrado en la venta ${idVenta}. Total: Bs ${(total / 100).toFixed(2)}. Recibido: Bs ${(recibido / 100).toFixed(2)}. Saldo: Bs ${((total - recibido) / 100).toFixed(2)}.`;
  } catch (error) {
    console.error(`Error al ${etapa}:`, error);
    pedidoPorRevisar = true;
    const referencia = idVenta === null ? "No se confirmó el ID de la venta." : `Venta asociada: ${idVenta}.`;
    mensaje.textContent = `No se confirmó el resultado al ${etapa}. ${referencia} Revisa ventas, pedidos_personalizados y pagos antes de reintentar. El pedido quedó bloqueado en esta página.`;
  } finally {
    guardandoPedido = false;
    actualizarControlesPedido();
  }
});

document.querySelector("#campo-fecha-pedido").min = hoyEnBolivia();
renderizarMueblesSeleccionados();
renderizarPedido();
iniciar();
probarClientes();
