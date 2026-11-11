// node tests/listados-melanova.cjs · sin conexión a Supabase.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const contexto = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/listados-melanova.js'), 'utf8'), contexto);
function clienteSimulado(total, limite = 500, fallo = null) {
  const llamadas = [];
  const datos = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
  return { llamadas, from(tabla) {
    assert.equal(tabla, 'prueba');
    return { select(columnas, opciones) {
      assert.equal(columnas, '*'); assert.equal(opciones.count, 'exact');
      return { order(columna) {
        assert.equal(columna, 'id');
        return { async range(desde, hasta) {
          llamadas.push([desde, hasta]);
          if (fallo) return fallo(llamadas.length, desde, hasta, datos);
          return { data: datos.slice(desde, Math.min(hasta + 1, desde + limite)), count: total, error: null };
        } };
      } };
    } };
  } };
}
(async () => {
  let total = 0;
  const vacio = clienteSimulado(0);
  assert.equal((await contexto.leerListadoMelanova('prueba', 'id', vacio)).length, 0); total++;
  const grande = clienteSimulado(1201);
  const filas = await contexto.leerListadoMelanova('prueba', 'id', grande);
  assert.equal(filas.length, 1201); assert.equal(filas.at(-1).id, 1201);
  assert.equal(grande.llamadas.length, 3); assert.equal(grande.llamadas[1][0], 500); total++;
  const limiteBajo = clienteSimulado(60, 17);
  assert.equal((await contexto.leerListadoMelanova('prueba', 'id', limiteBajo)).length, 60);
  assert.equal(limiteBajo.llamadas[1][0], 17); total++;
  await assert.rejects(contexto.leerListadoMelanova('prueba', 'id', clienteSimulado(2, 500, () => ({ error: new Error('sin permiso') }))), /sin permiso/); total++;
  await assert.rejects(contexto.leerListadoMelanova('prueba', 'id', clienteSimulado(2, 500, () => ({ data: [], count: 2, error: null }))), /completo/); total++;
  await assert.rejects(contexto.leerListadoMelanova('prueba', 'id', clienteSimulado(2, 500, () => ({ data: [{id:1},{id:1}], count:2, error:null }))), /cambió/); total++;
  await assert.rejects(contexto.leerListadoMelanova('prueba', 'id', clienteSimulado(2, 1, (numero, desde, hasta, datos) => ({ data: datos.slice(desde, desde+1), count:numero === 1 ? 2 : 3, error:null }))), /cambió/); total++;
  await assert.rejects(contexto.leerListadoMelanova('prueba', 'id', clienteSimulado(1, 500, () => ({ data:[{id:1}], count:null, error:null }))), /tamaño/); total++;
  console.log(total + ' pruebas de listados superadas (Supabase simulado).');
})().catch(error => { console.error(error); process.exitCode = 1; });
