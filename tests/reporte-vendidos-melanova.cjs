// Ejecutar desde la raíz: node tests/reporte-vendidos-melanova.cjs
// Cliente simulado: no conecta con Supabase ni registra operaciones.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function clienteSimulado(filas, limite = 500, fallo = {}) {
  let llamadas = 0;
  return { from(tabla) {
    assert.equal(tabla, 'detalle_ventas');
    return {
      select(columnas, opciones) { assert.ok(columnas.includes('id_detalle')); assert.equal(opciones.count, 'exact'); return this; },
      eq(campo, valor) { assert.equal(campo, 'operacion.estado_operacion'); assert.equal(valor, 'activa'); return this; },
      order(campo) { assert.equal(campo, 'id_detalle'); return this; },
      async range(desde, hasta) {
        const turno = llamadas++;
        if (fallo.error && turno === 1) return { data: null, error: new Error('Fallo de red'), count: null };
        const data = fallo.vacio && turno === 1 ? [] : filas.slice(desde, Math.min(hasta + 1, desde + limite));
        if (fallo.duplicado && turno === 1 && data.length) data[0] = { ...data[0], id_detalle: filas[0].id_detalle };
        return { data, error: null, count: filas.length + (fallo.cambio && turno === 1 ? 1 : 0) };
      }
    };
  } };
}
async function verificar(listados, ventas) {
  const caja = vm.createContext({ console });
  vm.runInContext(listados, caja);
  const leer = caja.leerDetallesVendidosMelanova;
  const filas = Array.from({ length: 1201 }, (_, i) => ({ id_detalle: i + 1, id_producto: i < 1200 ? 1 : 2, cantidad: i < 1200 ? 1 : 1500, productos: { nombre: i < 1200 ? 'Mesa' : 'Armario final' } }));
  assert.equal((await leer(clienteSimulado([]))).length, 0);
  assert.equal((await leer(clienteSimulado(filas))).length, 1201);
  assert.equal((await leer(clienteSimulado(filas, 73))).length, 1201);
  await assert.rejects(() => leer(clienteSimulado(filas, 500, { error: true })), /Fallo de red/);
  await assert.rejects(() => leer(clienteSimulado(filas, 500, { cambio: true })), /cambió/);
  await assert.rejects(() => leer(clienteSimulado(filas, 500, { duplicado: true })), /cambió/);
  await assert.rejects(() => leer(clienteSimulado(filas, 500, { vacio: true })), /completo/);
  const reporte = { textContent: '', innerHTML: '' };
  caja.document = { querySelector() { return reporte; } };
  caja.clientesupabase = clienteSimulado(filas, 73);
  caja.escaparHTML = v => String(v).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const inicio = ventas.indexOf('async function cargarProductosVendidos()');
  const fin = ventas.indexOf('document.querySelector("#btn-productos-vendidos")', inicio);
  assert.ok(inicio >= 0 && fin > inicio);
  vm.runInContext(ventas.slice(inicio, fin), caja);
  await caja.cargarProductosVendidos();
  assert.match(reporte.innerHTML, /Armario final/);
  assert.match(reporte.innerHTML, /1500 unidades/);
  assert.ok(reporte.innerHTML.indexOf('Armario final') < reporte.innerHTML.indexOf('Mesa'));
  return '8 escenarios aprobados: vacío, historial grande, límite reducido, error, cambio de conteo, duplicado, lote incompleto e integración del reporte.';
}
module.exports = { verificar };
if (require.main === module) {
  const raiz = path.resolve(__dirname, '..');
  verificar(fs.readFileSync(path.join(raiz, 'js/listados-melanova.js'), 'utf8'), fs.readFileSync(path.join(raiz, 'js/ventas.js'), 'utf8'))
    .then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
}
