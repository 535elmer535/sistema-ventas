// Pruebas del código real de la función Edge, con Supabase simulado.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const origen = fs.readFileSync(path.join(__dirname, '../supabase/functions/gestionar-recuperacion/index.ts'), 'utf8')
  .replace(/^import .*;\r?\n/m, '');
const actorId = '11111111-1111-4111-8111-111111111111';
const destinoId = '22222222-2222-4222-8222-222222222222';
let total = 0;
async function caso(nombre, body, opciones, esperado, comprobar) {
  const o = { rol: 'administrador', token: true, ...opciones }, llamadas = [];
  const metadata = o.pendiente ? { mueblex_cambio_pendiente: true, mueblex_restablecimiento_id: destinoId } : {};
  if (o.tokenAntiguo) metadata.mueblex_restablecido_desde = 200;
  let consultas = 0, handler;
  const authUser = { id: actorId, email: 'prueba@example.com', app_metadata: metadata, factors: o.mfa ? [{ status: 'verified' }] : [] };
  const cliente = {
    auth: {
      getUser: async () => o.tokenInvalido ? { data: {}, error: {} } : { data: { user: authUser }, error: null },
      admin: {
        getUserById: async id => ({ data: { user: { id, factors: o.destinoMfa ? [{ status: 'verified' }] : [] } }, error: null }),
        updateUserById: async (id, entrada) => { llamadas.push({ id, entrada }); return { error: o.falloAuth ? {} : null }; }
      }
    },
    from(tabla) {
      const q = { tabla, modo: 'select', filtros: {}, select() { return this; }, not() { return this; }, order() { return this; },
        eq(k, v) { this.filtros[k] = v; return this; }, or(filtro) { llamadas.push({ filtro }); return this; },
        update(entrada) { this.modo = 'update'; llamadas.push({ tabla, entrada }); return this; },
        single() { return Promise.resolve(this.resultado()); },
        range() { return Promise.resolve(o.falloConsulta ? { error: {} } : { data: [], error: null, count: 0 }); },
        resultado() {
          if (this.modo === 'update') return { error: null };
          consultas++;
          if (consultas === 1) return o.sinPerfil ? { error: {} } : { data: { id_auth: actorId, nombre: 'Administrador', rol: o.rol }, error: null };
          return o.sinDestino ? { error: {} } : { data: { id_auth: this.filtros.id_auth, nombre: 'Cuenta de prueba', rol: o.rolDestino || 'vendedor' }, error: null };
        },
        then(resolve, reject) { return Promise.resolve(this.resultado()).then(resolve, reject); }
      }; return q;
    }
  };
  const verificador = { auth: {
    signInWithPassword: async entrada => {
      llamadas.push({ verificacion: entrada });
      return o.temporalIncorrecta ? { data: {}, error: {} } : { data: { user: { id: actorId } }, error: null };
    },
    signOut: async () => { llamadas.push({ cerrarVerificador: true }); return { error: null }; }
  } };
  let clientes = 0;
  const contexto = {
    Deno: { env: { get: () => 'valor-de-prueba' }, serve: h => { handler = h; } },
    createClient: () => clientes++ === 0 ? cliente : verificador,
    Request, Response, TextEncoder, crypto: webcrypto, atob
  };
  vm.runInNewContext(origen, contexto);
  const headers = { 'Content-Type': 'application/json' };
  if (o.token) headers.Authorization = 'Bearer cabecera.' + Buffer.from(JSON.stringify({ iat: 100 })).toString('base64url') + '.firma';
  const method = o.method || 'POST';
  const req = new Request('https://prueba.invalid', { method, headers,
    ...(!['GET', 'OPTIONS'].includes(method) ? { body: o.jsonInvalido ? '{' : JSON.stringify(body) } : {}) });
  const respuesta = await handler(req);
  assert.equal(respuesta.status, esperado, nombre);
  const resultado = method === 'OPTIONS' ? null : await respuesta.json();
  if (esperado >= 400 && !o.falloAuth) assert.equal(llamadas.filter(l => l.entrada && !l.verificacion).length, 0, nombre + ': no escribe ante rechazo');
  if (comprobar) comprobar(resultado, llamadas);
  total++;
}
(async () => {
  await caso('OPTIONS', {}, { method: 'OPTIONS' }, 200);
  await caso('GET', {}, { method: 'GET' }, 405);
  await caso('sin sesión', {}, { token: false }, 401);
  await caso('JWT inválido', {}, { tokenInvalido: true }, 401);
  await caso('sin perfil', {}, { sinPerfil: true }, 403);
  await caso('sesión anterior al restablecimiento', {}, { tokenAntiguo: true }, 401);
  await caso('JSON inválido', {}, { jsonInvalido: true }, 400);
  await caso('body array', [], {}, 400);
  await caso('body null', null, {}, 400);
  for (const accion of ['listar', 'historial', 'contacto', 'restablecer', 'eliminar']) {
    await caso('vendedor rechaza ' + accion, { accion, id_auth: destinoId }, { rol: 'vendedor' }, 403);
    await caso('admin temporal rechaza ' + accion, { accion, id_auth: destinoId }, { pendiente: true }, 403);
  }
  await caso('acción desconocida', { accion: 'eliminar', id_auth: destinoId }, {}, 400);
  await caso('listar', { accion: 'listar' }, {}, 200, r => assert.equal(r.total, 0));
  await caso('administrador con MFA requiere asistencia', { accion: 'listar' }, { mfa: true }, 409);
  await caso('página negativa', { accion: 'listar', pagina: -1 }, {}, 400);
  await caso('página texto', { accion: 'listar', pagina: '1' }, {}, 400);
  await caso('búsqueda segura', { accion: 'listar', buscar: 'José prueba@example.com' }, {}, 200);
  await caso('filtro inyectado', { accion: 'listar', buscar: 'a),rol.eq.administrador' }, {}, 400);
  await caso('historial', { accion: 'historial', pagina: 0 }, {}, 200);
  await caso('error de consulta', { accion: 'listar' }, { falloConsulta: true }, 500);
  await caso('historial página inválida', { accion: 'historial', pagina: 0.5 }, {}, 400);
  await caso('cuenta inválida', { accion: 'contacto', id_auth: 'no-uuid' }, {}, 400);
  await caso('destino inexistente', { accion: 'contacto', id_auth: destinoId }, { sinDestino: true }, 404);
  await caso('contacto solo admin', { accion: 'contacto', id_auth: destinoId, whatsapp: '59170000000' }, {}, 400);
  await caso('teléfono inválido', { accion: 'contacto', id_auth: destinoId, whatsapp: '+591 70000000' }, { rolDestino: 'administrador' }, 400);
  await caso('guardar teléfono', { accion: 'contacto', id_auth: destinoId, whatsapp: '59170000000', rol: 'vendedor' }, { rolDestino: 'administrador' }, 200,
    (_, l) => assert.deepEqual(Object.keys(l.find(x => x.entrada).entrada), ['whatsapp_recuperacion']));
  await caso('retirar teléfono', { accion: 'contacto', id_auth: destinoId, whatsapp: '' }, { rolDestino: 'administrador' }, 200,
    (_, l) => assert.equal(l.find(x => x.entrada).entrada.whatsapp_recuperacion, null));
  const reset = { accion: 'restablecer', id_auth: destinoId, temporal: 'Temporal-prueba-123', identidad_verificada: true };
  await caso('no restablece propia', { ...reset, id_auth: actorId }, {}, 409);
  await caso('identidad sin verificar', { ...reset, identidad_verificada: false }, {}, 400);
  await caso('temporal corta', { ...reset, temporal: 'abc' }, {}, 400);
  await caso('límite bcrypt bytes', { ...reset, temporal: 'á'.repeat(40) }, {}, 400);
  await caso('MFA destino', reset, { destinoMfa: true }, 409);
  await caso('fallo de actualización Auth', reset, { falloAuth: true }, 409);
  await caso('restablecer seguro', reset, {}, 200, (r, l) => {
    const cambio = l.find(x => x.entrada).entrada;
    assert.equal(cambio.app_metadata.mueblex_cambio_pendiente, true);
    assert.equal(cambio.app_metadata.mueblex_restablecido_por, actorId);
    assert.ok(!JSON.stringify(r).includes(reset.temporal));
    assert.equal(Object.keys(cambio).sort().join(','), 'app_metadata,password');
  });
  const completar = { accion: 'completar_cambio', actual: 'Temporal-prueba-123', nueva: 'Personal-distinta-456' };
  await caso('sin cambio pendiente', completar, {}, 409);
  await caso('misma contraseña', { ...completar, nueva: completar.actual }, { pendiente: true }, 400);
  await caso('temporal incorrecta', completar, { pendiente: true, temporalIncorrecta: true }, 400);
  await caso('MFA cuenta', completar, { pendiente: true, mfa: true }, 409);
  await caso('fallo al completar contraseña', completar, { pendiente: true, falloAuth: true }, 409);
  await caso('completar vendedor', completar, { pendiente: true, rol: 'vendedor' }, 200, (r, l) => {
    const cambio = l.find(x => x.entrada).entrada;
    assert.equal(cambio.app_metadata.mueblex_cambio_pendiente, false);
    assert.equal(cambio.app_metadata.mueblex_completar_version, destinoId);
    assert.ok(l.some(x => x.cerrarVerificador));
    assert.ok(!JSON.stringify(r).includes(completar.nueva));
  });
  console.log(`${total} pruebas del servidor superadas (Supabase simulado).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
