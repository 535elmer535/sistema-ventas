// Presentación progresiva: conserva las tablas, los formularios y sus eventos originales.
(() => {
  "use strict";
  const raiz = document.querySelector("#seccion-app");
  if (!raiz) return;
  const normalizar = texto => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
  function boton(texto, accion) {
    const el = document.createElement("button"); el.type = "button"; el.textContent = texto;
    el.addEventListener("click", accion); return el;
  }
  function prepararListado(tabla, nombre, actualizar) {
    const cuerpo = tabla.tBodies[0]; if (!cuerpo) return;
    tabla.classList.add("tabla-tarjetas");
    const barra = document.createElement("div"); barra.className = "listado-herramientas";
    const etiqueta = document.createElement("label"); etiqueta.textContent = "Buscar en " + nombre;
    const entrada = document.createElement("input"); entrada.type = "search"; entrada.placeholder = "Escribe para filtrar…";
    entrada.id = tabla.id + "-buscar"; entrada.maxLength = 200; etiqueta.htmlFor = entrada.id; etiqueta.append(entrada);
    const contador = document.createElement("p"); contador.className = "listado-resultado"; contador.setAttribute("role", "status");
    const limpiar = boton("Limpiar", () => { entrada.value = ""; pagina = 0; pintar(); entrada.focus(); });
    const recargar = boton("Actualizar", async () => {
      recargar.disabled = true;
      try { await actualizar(); } finally { recargar.disabled = false; }
    });
    barra.append(etiqueta, limpiar, recargar);
    const pie = document.createElement("div"); pie.className = "listado-paginas";
    pie.setAttribute("role", "group"); pie.setAttribute("aria-label", "Páginas de " + nombre);
    const estado = document.createElement("span");
    let pagina = 0;
    const anterior = boton("Anteriores", () => { pagina--; pintar(); });
    const siguiente = boton("Siguientes", () => { pagina++; pintar(); });
    pie.append(anterior, estado, siguiente);
    const contenedor = tabla.parentElement;
    contenedor.before(barra); contenedor.after(contador, pie);
    function pintar() {
      const filas = [...cuerpo.rows];
      const datos = filas.filter(f => f.cells.length > 1 && !f.querySelector("td[colspan]"));
      const texto = normalizar(entrada.value);
      const encontradas = datos.filter(f => normalizar(f.textContent).includes(texto));
      const paginas = Math.max(1, Math.ceil(encontradas.length / 8));
      pagina = Math.max(0, Math.min(pagina, paginas - 1));
      const visibles = new Set(encontradas.slice(pagina * 8, pagina * 8 + 8));
      datos.forEach(f => { f.hidden = !visibles.has(f); });
      anterior.disabled = pagina === 0 || !datos.length;
      siguiente.disabled = pagina + 1 >= paginas || !datos.length;
      pie.hidden = !datos.length;
      contador.textContent = datos.length
        ? (encontradas.length ? encontradas.length + " de " + datos.length + " registros · Mostrando " + (pagina * 8 + 1) + "–" + Math.min((pagina + 1) * 8, encontradas.length) : "No hay coincidencias. Cambia o limpia la búsqueda.")
        : "";
      estado.textContent = "Página " + (pagina + 1) + " de " + paginas;
    }
    entrada.addEventListener("input", () => { pagina = 0; pintar(); });
    new MutationObserver(pintar).observe(cuerpo, { childList: true });
    pintar();
  }
  function agruparReporte() {
    const reporte = document.querySelector("#resumen-ventas");
    if (!reporte || reporte.querySelector(":scope > .informe-bloque") || !reporte.querySelector(":scope > h3")) return;
    let bloque = null;
    [...reporte.childNodes].forEach(nodo => {
      if (nodo.nodeType === 1 && nodo.tagName === "H3") {
        bloque = document.createElement("section"); bloque.className = "informe-bloque";
        reporte.insertBefore(bloque, nodo);
      }
      if (bloque) bloque.append(nodo);
    });
    reporte.classList.add("informe-cuadricula");
  }
  function adaptarTablas() {
    agruparReporte();
    raiz.querySelectorAll(".panel-melanova table").forEach(tabla => {
      if (!tabla.classList.contains("tabla-melanova")) {
        tabla.classList.add("tabla-melanova"); tabla.setAttribute("role", "table");
        const nombre = tabla.caption?.textContent.trim() || tabla.closest(".modulo")?.querySelector("h2")?.textContent.trim() || "Datos";
        if (!tabla.getAttribute("aria-label")) tabla.setAttribute("aria-label", nombre);
        let marco = tabla.parentElement;
        if (!marco.matches(".rec-tabla,.lista-clientes-scroll,.tabla-categorias-scroll,.tabla-desplazable")) {
          marco = document.createElement("div"); tabla.before(marco); marco.append(tabla);
        }
        marco.classList.add("tabla-desplazable");
        marco.tabIndex = 0; marco.setAttribute("role", "region"); marco.setAttribute("aria-label", nombre + ": tabla desplazable");
        const cabeceras = [...tabla.tHead?.rows[0]?.cells || []];
        cabeceras.forEach(c => { c.scope = "col"; });
        if (cabeceras.length >= 6) tabla.classList.add("tabla-amplia");
        if (tabla.id === "tabla-productos") prepararListado(tabla, "muebles", () => cargarProductos());
        if (tabla.id === "tabla-clientes") prepararListado(tabla, "clientes", () => probarClientes());
        if (tabla.id === "tabla-categorias") tabla.classList.add("tabla-tarjetas");
      }
      const nombres = [...tabla.tHead?.rows[0]?.cells || []].map(c => c.textContent.trim());
      [...tabla.tBodies].forEach(cuerpo => [...cuerpo.rows].forEach(fila => {
        [...fila.cells].forEach((celda, indice) => {
          if (celda.colSpan === 1 && nombres[indice]) celda.dataset.etiqueta = nombres[indice];
        });
        if (tabla.id === "tabla-productos" && fila.cells.length === 5) {
          const celda = fila.cells[3]; const texto = celda.textContent.trim();
          if (!celda.querySelector(".stock-estado")) {
            const insignia = document.createElement("span"); insignia.textContent = texto;
            insignia.className = "stock-estado " + (texto === "Agotado" ? "stock-agotado" : texto === "Stock bajo" ? "stock-bajo" : texto === "Disponible" ? "stock-disponible" : "");
            celda.replaceChildren(insignia);
          }
        }
      }));
    });
  }
  let pendiente = false;
  new MutationObserver(() => {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; adaptarTablas(); });
  }).observe(raiz, { childList: true, subtree: true });
  adaptarTablas();
})();
