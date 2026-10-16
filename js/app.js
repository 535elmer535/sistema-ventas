

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

async function cargarProductos() {
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
          <td>
            <button type="button" class="btn-editar"
                    data-id="${escaparHTML(producto.id_producto)}">
              Editar
            </button>
            <button type="button" class="btn-eliminar"
                    data-id="${escaparHTML(producto.id_producto)}">
              Eliminar
            </button>
          </td>
        </tr>
      `).join("");
  } catch (error) {
    console.error("Error al leer productos:", error);
    cuerpoTabla.innerHTML = '<tr><td colspan="3">No se pudo cargar el listado.</td></tr>';
  }
}

async function probarClientes() {
  const cuerpo = document.querySelector("#cuerpo-clientes");
  cuerpo.innerHTML = '<tr><td colspan="3">Cargando clientes...</td></tr>';
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
      ? '<tr><td colspan="3">Todavía no hay clientes registrados.</td></tr>'
      : data.map((cliente) => `
       <tr>
  <td>${escaparHTML(cliente.nombre)}</td>
  <td>${escaparHTML(cliente.contacto)}</td>
  <td>
    <button type="button" class="btn-editar-cliente"
            data-id="${escaparHTML(cliente.id_cliente)}">
      Editar
    </button>
    <button type="button" class="btn-eliminar-cliente"
            data-id="${escaparHTML(cliente.id_cliente)}">
      Eliminar
    </button>
  </td>
</tr>

      `).join("");
  } catch (error) {
    console.error("Error al leer clientes:", error);
    cuerpo.innerHTML = '<tr><td colspan="3">No se pudo cargar el listado de clientes.</td></tr>';
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
      .insert({
        id_usuario: 1, id_cliente: idCliente, tipo_venta: "pedido_medida",
        total: total / 100, estado_pago: "pendiente"
      })
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


// Guía 13: mostrar los datos del producto para editar.
document.querySelector("#cuerpo-productos")
  .addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-editar");
    if (!boton) return;

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
    document.querySelector("#editar-existencia").value =
      producto.existencia;

    document.querySelector("#panel-edicion").style.display =
      "block";
    document.querySelector("#mensaje-producto").textContent =
      `Editando: ${producto.nombre}`;
  });

// Guía 13: guardar los cambios del producto.
document.querySelector("#form-editar-producto")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formulario = event.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje = document.querySelector("#mensaje-producto");

    if (boton.disabled) return;

    const id = Number(document.querySelector("#editar-id").value);
    const precioCentavos = importeEnCentavos(
      document.querySelector("#editar-precio").value
    );
    const textoExistencia =
      document.querySelector("#editar-existencia").value.trim();
    const existencia = Number(textoExistencia);

    if (!Number.isSafeInteger(id) || id <= 0 ||
      precioCentavos === null || precioCentavos <= 0 ||
      textoExistencia === "" ||
      !Number.isSafeInteger(existencia) || existencia < 0) {
      mensaje.textContent =
        "Revisa el precio y la existencia: el precio debe ser positivo y la existencia un entero de cero o más.";
      return;
    }

    boton.disabled = true;
    mensaje.textContent = "Guardando cambios...";

    try {
      const precio = precioCentavos / 100;

      const { error } = await clientesupabase
        .from("productos")
        .update({ precio, existencia })
        .eq("id_producto", id)
        .select("id_producto")
        .single();

      if (error) throw error;

      document.querySelector("#panel-edicion").style.display =
        "none";
      formulario.reset();
      await cargarProductos();
      resaltarFilaEditada("#cuerpo-productos", id);
      mensaje.textContent = "Producto actualizado correctamente.";
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      mensaje.textContent =
        "No se pudo confirmar el cambio. Revisa el producto en Supabase. " +
        error.message;
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
      console.error("Error al eliminar producto:", error);
      mensaje.textContent = error.code === "23503"
        ? "No se puede eliminar: el producto tiene registros relacionados."
        : "No se pudo confirmar la eliminación. Revisa Supabase. " +
        error.message;
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
        .update({ nombre, contacto })
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
  await cargarProductos();
  await probarClientes();
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

  try {
    const { data: { session }, error: errorSesion } =
      await clientesupabase.auth.getSession();

    if (errorSesion) throw errorSesion;
    if (!session) return;

    const { data: usuario, error } = await clientesupabase
      .from("usuarios")
      .select("nombre")
      .eq("correo", session.user.email)
      .maybeSingle();

    if (error) throw error;

    saludo.textContent =
      `Bienvenido, ${usuario?.nombre || session.user.email}`;
  } catch (error) {
    console.error("No se pudo cargar el saludo:", error);
  }
}
