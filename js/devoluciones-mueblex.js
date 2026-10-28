// Cargar después de js/app.js. Solo registra devoluciones ya realizadas.
// Supabase verifica el rol, el importe completo y la recuperación del stock.
function formularioDevolucion(operacion, tipo) {
  if (!usuarioEsAdministrador || operacion.estado_operacion !== "activa") {
    return "";
  }

  const cobrado = (operacion.cobros ?? []).reduce(
    (suma, cobro) => suma + Math.round(Number(cobro.monto) * 100), 0
  );
  const total = Math.round(Number(operacion.total) * 100);
  if (!Number.isSafeInteger(cobrado) || cobrado <= 0 ||
      !Number.isSafeInteger(total) || cobrado > total) return "";

  const devoluciones = Array.isArray(operacion.devoluciones)
    ? operacion.devoluciones
    : operacion.devoluciones ? [operacion.devoluciones] : [];
  if (devoluciones.length) return "";

  if (tipo === "pedido" && (operacion.muebles ?? []).some(
    (mueble) => !["pendiente", "en_fabricacion", "listo"].includes(mueble.estado_taller)
  )) {
    return "<p>Este pedido requiere revisión antes de gestionar una devolución: ya fue entregado o su estado no permite esta anulación.</p>";
  }

  return `
    <form data-form-devolucion
      data-id-venta="${escaparHTML(operacion.id_venta)}"
      data-tipo="${escaparHTML(tipo)}"
      data-monto-centavos="${cobrado}">
      <h4>Anular y registrar devolución completa</h4>
      <p>Importe completo a devolver: <strong>Bs ${(cobrado / 100).toFixed(2)}</strong>.</p>
      <p>Registra aquí el dinero que ya devolviste al cliente.</p>
      <label>Método de devolución:
        <select name="metodo" required>
          <option value="">Selecciona un método</option>
          <option value="efectivo">Efectivo</option>
          <option value="QR">QR</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </label>
      <label>Motivo de anulación y devolución:
        <input type="text" name="motivo" maxlength="500" required>
      </label>
      <label>
        <input type="checkbox" name="dinero_devuelto" required>
        Confirmo que devolví al cliente el importe completo indicado.
      </label>
      ${tipo === "venta" ? `
        <label>
          <input type="checkbox" name="stock_recibido" required>
          Confirmo que recuperé los muebles de esta venta y pueden volver al inventario.
        </label>
      ` : ""}
      <button type="submit">Anular y registrar devolución</button>
      <p data-mensaje-devolucion role="status"></p>
    </form>
  `;
}

async function procesarDevolucionMueblex(event) {
  const formulario = event.target.closest("[data-form-devolucion]");
  if (!formulario) return;
  event.preventDefault();

  const mensaje = formulario.querySelector("[data-mensaje-devolucion]");
  if (guardandoAnulacion) {
    mensaje.textContent = "Espera a que termine la operación actual.";
    return;
  }
  if (!usuarioEsAdministrador) {
    mensaje.textContent = "Solo el administrador puede registrar devoluciones.";
    return;
  }

  const idVenta = Number(formulario.dataset.idVenta);
  const monto = Number(formulario.dataset.montoCentavos);
  const tipo = formulario.dataset.tipo;
  const metodo = formulario.elements.namedItem("metodo").value;
  const motivo = formulario.elements.namedItem("motivo").value.trim();
  const dineroDevuelto = formulario.elements.namedItem("dinero_devuelto").checked;
  const stockRecibido = tipo === "venta"
    ? formulario.elements.namedItem("stock_recibido").checked
    : false;

  if (!Number.isSafeInteger(idVenta) || idVenta <= 0 ||
      !Number.isSafeInteger(monto) || monto <= 0 ||
      !["venta", "pedido"].includes(tipo) ||
      !["efectivo", "QR", "transferencia"].includes(metodo) ||
      !motivo || motivo.length > 500 || !dineroDevuelto ||
      (tipo === "venta" && !stockRecibido)) {
    mensaje.textContent = "Completa el método, el motivo y las confirmaciones de la devolución.";
    return;
  }

  if (!window.confirm(
    `¿Anular la operación ${idVenta} y registrar la devolución de Bs ${(monto / 100).toFixed(2)} por ${metodo}?\n\n` +
    "Los cobros originales se conservarán. " +
    (tipo === "venta" ? "Los muebles recuperados volverán al inventario.\n\n" : "\n\n") +
    `Motivo: ${motivo}`
  )) return;

  const consultaOriginal = tipo === "venta" ? consultaDetalleVenta : consultaDetallePedido;
  const mismaConsulta = () => consultaOriginal === (
    tipo === "venta" ? consultaDetalleVenta : consultaDetallePedido
  );
  const panel = document.querySelector(tipo === "venta"
    ? "#detalle-venta-stock" : "#detalle-pedido-medida");

  guardandoAnulacion = true;
  for (const campo of formulario.elements) campo.disabled = true;
  mensaje.textContent = "Registrando devolución y anulación...";
  let confirmada = false;

  try {
    formulario.dataset.solicitudId ||= crypto.randomUUID();
    const { data, error } = await clientesupabase.rpc(
      "anular_operacion_con_devolucion", {
        p_solicitud_id: formulario.dataset.solicitudId,
        p_id_venta: idVenta,
        p_monto_centavos: monto,
        p_metodo: metodo,
        p_motivo: motivo,
        p_stock_recibido: stockRecibido
      }
    );
    if (error) throw error;
    if (!data || Number(data.id_venta) !== idVenta || !data.id_devolucion) {
      throw new Error("No se recibió la confirmación de la devolución.");
    }
    confirmada = true;
  } catch (error) {
    console.error("Error al registrar devolución:", error);
    if (error.code === "P0001") {
      mensaje.textContent = error.message;
      delete formulario.dataset.solicitudId;
      for (const campo of formulario.elements) campo.disabled = false;
    } else {
      mensaje.textContent = "No se pudo confirmar el resultado. No devuelvas dinero otra vez: cierra y vuelve a abrir el detalle para revisar si la devolución quedó registrada.";
    }
  } finally {
    guardandoAnulacion = false;
  }
  if (!confirmada) return;

  const reabrir = mismaConsulta() && !panel.hidden;
  await Promise.allSettled([
    cargarProductos(), cargarResumenVentas(), cargarProductosVendidos(),
    tipo === "venta" ? cargarHistorialVentas() : cargarHistorialPedidos()
  ]);
  const vista = document.querySelector(tipo === "venta" ? "#vista-ventas" : "#vista-pedidos");
  if (reabrir && mismaConsulta() && !vista.hidden) {
    if (tipo === "venta") await mostrarDetalleVentaStock(idVenta);
    else await mostrarDetallePedidoMedida(idVenta);
  }
}

document.querySelector("#contenido-detalle-venta")
  .addEventListener("submit", procesarDevolucionMueblex);
document.querySelector("#contenido-detalle-pedido")
  .addEventListener("submit", procesarDevolucionMueblex);
