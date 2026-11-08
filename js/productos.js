// Inventario, registro de muebles, precios y reposiciones de stock de Mueblex.

let productosCache = [];
// Registro de muebles: solo administrador.
let guardandoMueble = false;
let mueblePorRevisar = false;
let guardandoReposicionStock = false;
let reposicionPendiente = null;
let claveReposicionStock = null;
let paginaReposiciones = 0;
let hayMasReposiciones = false;
let consultaReposiciones = 0;

function llenarSelectProductos(productos) {
  const select = document.querySelector("#campo-producto");
  select.innerHTML = productos.length === 0
    ? '<option value="">No hay productos disponibles</option>'
    : productos.map((producto) => `
      <option value="${escaparHTML(producto.id_producto)}">${escaparHTML(producto.nombre)}</option>
    `).join("");
}

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

