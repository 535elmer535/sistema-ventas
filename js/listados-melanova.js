// Listados completos para selectores y tablas. No modifica registros.
async function leerListadoMelanova(tabla, columnaId, cliente = clientesupabase) {
  const filas = [];
  const ids = new Set();
  let totalInicial = null;
  for (;;) {
    const { data, error, count } = await cliente.from(tabla)
      .select("*", { count: "exact" }).order(columnaId)
      .range(filas.length, filas.length + 499);
    if (error) throw error;
    if (!Array.isArray(data) || !Number.isSafeInteger(count) || count < 0) {
      throw new Error("No se confirmó el tamaño del listado.");
    }
    if (totalInicial === null) totalInicial = count;
    if (count !== totalInicial) throw new Error("El listado cambió durante la consulta. Actualiza para verlo completo.");
    for (const fila of data) {
      const id = fila[columnaId];
      if (id === null || id === undefined || ids.has(String(id))) {
        throw new Error("El listado cambió durante la consulta. Actualiza para verlo completo.");
      }
      ids.add(String(id)); filas.push(fila);
    }
    if (filas.length === totalInicial) return filas;
    if (!data.length || filas.length > totalInicial) throw new Error("No se recibió el listado completo.");
  }
}
