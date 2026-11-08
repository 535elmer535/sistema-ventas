// Funciones compartidas para texto, importes, fechas y resaltado de filas.

// Los nombres y contactos se muestran como texto, no como código HTML.
function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[caracter]);
}


function manejarError(
  error,
  selector = "#mensaje-venta",
  texto = "Ocurrió un problema al guardar. Intenta de nuevo."
) {
  console.error("Error en la operación:", error);
  document.querySelector(selector).textContent = texto;
}

// Guía 13, punto 3.8: resaltar la fila actualizada.
function resaltarFilaEditada(selectorTabla, id) {
  const boton = document.querySelector(
    `${selectorTabla} button[data-id="${id}"]`
  );
  const fila = boton?.closest("tr");
  if (!fila) return;

  for (const celda of fila.cells) {
    celda.animate(
      [
        { backgroundColor: "#c8f7c5" },
        { backgroundColor: "#c8f7c5" }
      ],
      { duration: 1000 }
    );
  }
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

function fechaHistorialMueblex(valor) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return "Fecha no disponible";

  return fecha.toLocaleString("es-BO", {
    timeZone: "America/La_Paz"
  });
}

