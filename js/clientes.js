// Consulta, registro, edición y eliminación de clientes de Mueblex.

let guardandoCliente = false;
let clientePorRevisar = false;
let clientesCache = [];

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

  