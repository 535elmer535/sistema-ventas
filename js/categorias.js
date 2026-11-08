// Administración de nombres de categorías mediante una función protegida en Supabase.
let categoriasAdminCache = [];
let categoriaEditadaId = null;
let categoriaNombreAnterior = null;
let cargandoCategoriasAdmin = false;
let guardandoCategoria = false;
let categoriasAdminCargadas = false;
let categoriaPorRevisar = false;

function actualizarControlesCategorias() {
  const bloqueado = !usuarioEsAdministrador || cargandoCategoriasAdmin || guardandoCategoria;
  const formulario = document.querySelector("#form-categoria");

  formulario.querySelectorAll("input, button").forEach((control) => {
    control.disabled = bloqueado || !categoriasAdminCargadas || categoriaPorRevisar;
  });

  document.querySelector("#guardar-categoria").textContent = categoriaEditadaId === null
    ? "Crear categoría"
    : "Guardar cambios";
  document.querySelector("#cancelar-categoria").hidden = categoriaEditadaId === null;
  document.querySelector("#actualizar-categorias").disabled = bloqueado;
  document.querySelectorAll("[data-editar-categoria]").forEach((boton) => {
    boton.disabled = bloqueado || !categoriasAdminCargadas || categoriaPorRevisar;
  });
  document.querySelector("#panel-categorias-admin").setAttribute(
    "aria-busy", String(cargandoCategoriasAdmin || guardandoCategoria)
  );
}

function limpiarEdicionCategoria() {
  document.querySelector("#form-categoria").reset();
  categoriaEditadaId = null;
  categoriaNombreAnterior = null;
  document.querySelector("#titulo-form-categoria").textContent = "Nueva categoría";
}

function mostrarCategoriasAdmin() {
  document.querySelector("#cuerpo-categorias").innerHTML = categoriasAdminCache.length === 0
    ? '<tr><td colspan="2">Todavía no hay categorías registradas.</td></tr>'
    : categoriasAdminCache.map((categoria) => `
      <tr>
        <td>${escaparHTML(categoria.nombre)}</td>
        <td><button type="button" data-editar-categoria="${escaparHTML(categoria.id_categoria)}">Editar</button></td>
      </tr>
    `).join("");
}

async function cargarCategoriasAdmin() {
  if (!usuarioEsAdministrador || cargandoCategoriasAdmin) return false;

  cargandoCategoriasAdmin = true;
  actualizarControlesCategorias();

  try {
    const { data, error } = await clientesupabase
      .from("categorias")
      .select("id_categoria, nombre")
      .order("nombre")
      .order("id_categoria");

    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("No se recibió la lista de categorías.");

    categoriasAdminCache = data;
    categoriasAdminCargadas = true;
    mostrarCategoriasAdmin();
    llenarSelectCategoriasMueble(data);
    return true;
  } catch (error) {
    console.error("Error al consultar categorías:", error);
    categoriasAdminCargadas = false;
    document.querySelector("#mensaje-categoria").textContent =
      "No se pudo cargar la lista. Pulsa Actualizar categorías para reintentar.";
    return false;
  } finally {
    cargandoCategoriasAdmin = false;
    actualizarControlesCategorias();
  }
}

async function prepararCategoriasAdmin() {
  const panel = document.querySelector("#panel-categorias-admin");
  panel.hidden = !usuarioEsAdministrador;
  categoriasAdminCache = [];
  categoriasAdminCargadas = false;
  categoriaPorRevisar = false;
  limpiarEdicionCategoria();
  document.querySelector("#cuerpo-categorias").replaceChildren();
  document.querySelector("#mensaje-categoria").textContent = "";
  actualizarControlesCategorias();

  if (usuarioEsAdministrador) await cargarCategoriasAdmin();
}

document.querySelector("#actualizar-categorias").addEventListener("click", async () => {
  if (guardandoCategoria || cargandoCategoriasAdmin || !usuarioEsAdministrador) return;

  if (await cargarCategoriasAdmin()) {
    limpiarEdicionCategoria();
    categoriaPorRevisar = false;
    actualizarControlesCategorias();
    document.querySelector("#mensaje-categoria").textContent =
      "Lista actualizada. Comprueba los nombres antes de realizar otro cambio.";
  }
});

document.querySelector("#cuerpo-categorias").addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-editar-categoria]");
  if (!boton || boton.disabled || !usuarioEsAdministrador) return;

  const categoria = categoriasAdminCache.find(
    (item) => String(item.id_categoria) === boton.dataset.editarCategoria
  );
  if (!categoria) return;

  categoriaEditadaId = categoria.id_categoria;
  categoriaNombreAnterior = categoria.nombre;
  document.querySelector("#categoria-nombre").value = categoria.nombre;
  document.querySelector("#titulo-form-categoria").textContent = "Editar categoría";
  document.querySelector("#mensaje-categoria").textContent = "";
  actualizarControlesCategorias();
  document.querySelector("#categoria-nombre").focus();
});

document.querySelector("#cancelar-categoria").addEventListener("click", () => {
  if (guardandoCategoria || cargandoCategoriasAdmin || categoriaPorRevisar) return;
  limpiarEdicionCategoria();
  actualizarControlesCategorias();
  document.querySelector("#mensaje-categoria").textContent = "Edición cancelada.";
});

document.querySelector("#form-categoria").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!usuarioEsAdministrador || guardandoCategoria || cargandoCategoriasAdmin ||
      !categoriasAdminCargadas || categoriaPorRevisar) return;

  const nombre = document.querySelector("#categoria-nombre").value.trim();
  const mensaje = document.querySelector("#mensaje-categoria");
  if (!nombre) {
    mensaje.textContent = "Escribe un nombre para la categoría.";
    document.querySelector("#categoria-nombre").focus();
    return;
  }

  guardandoCategoria = true;
  actualizarControlesCategorias();
  mensaje.textContent = "Guardando categoría...";

  try {
    const { data, error } = await clientesupabase.rpc("guardar_categoria_segura", {
      p_nombre: nombre,
      p_id_categoria: categoriaEditadaId,
      p_nombre_anterior: categoriaNombreAnterior
    });

    if (error) throw error;
    if (!data || data.id_categoria == null || typeof data.nombre !== "string") {
      throw new Error("No se recibió la confirmación de la categoría.");
    }

    limpiarEdicionCategoria();
    if (await cargarCategoriasAdmin()) {
      mensaje.textContent = data.accion === "existente"
        ? `La categoría "${data.nombre}" ya existe. Se conserva la categoría registrada.`
        : `Categoría "${data.nombre}" guardada correctamente.`;
    } else {
      mensaje.textContent =
        "Categoría guardada. Falta actualizar la lista y el selector de Inventario. Pulsa Actualizar categorías.";
    }
  } catch (error) {
    console.error("Error al guardar categoría:", error);
    categoriaPorRevisar = error.code !== "P0001";
    mensaje.textContent = categoriaPorRevisar
      ? "No se pudo confirmar el guardado. Pulsa Actualizar categorías y comprueba el resultado antes de continuar."
      : error.message;
  } finally {
    guardandoCategoria = false;
    actualizarControlesCategorias();
  }
});
