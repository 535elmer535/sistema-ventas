// Pruebas del módulo real con DOM y respuestas de Supabase simulados.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const base = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
class Elemento {
  constructor(tag = 'div') { this.tagName = tag; this.value = ''; this.checked = false; this.hidden = false;
    this.disabled = false; this.open = false; this.textContent = ''; this.children = []; this.eventos = {}; this.dataset = {}; this.style = {}; }
  addEventListener(tipo, fn) { (this.eventos[tipo] ||= []).push(fn); }
  async emitir(tipo) { for (const fn of this.eventos[tipo] || []) await fn({ currentTarget: this, preventDefault() {} }); }
  append(nodo) { this.children.push(nodo); }
  replaceChildren(...nodos) { this.children = nodos; }
  get firstElementChild() { return this.children[0]; }
  add(opcion) { this.append(opcion); }
  focus() { this.enfocado = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.emitir('close'); }
  removeAttribute(nombre) { delete this[nombre]; }
  checkValidity() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value); }
  querySelectorAll() { return this.controles || []; }
  querySelector() { return (this.formularios || []).find(f => f.dataset.guardando === 'true') || null; }
  reset() { for (const campo of this.controles || []) { campo.value = ''; campo.checked = false; } }
  closest() { return this.dialogo; }
}
const elementos = {};
for (const m of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
  assert.ok(!elementos[m[2]], 'ID duplicado: ' + m[2]); elementos[m[2]] = new Elemento(m[1]);
  elementos[m[2]].hidden = /\bhidden\b/.test(m[0]);
}
for (const m of html.matchAll(/<form\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/form>/g)) {
  elementos[m[1]].controles = [...m[2].matchAll(/<(?:input|button|select)\b[^>]*\bid="([^"]+)"/g)].map(x => elementos[x[1]]);
}
const dialogos = [], cerrar = [];
for (const m of html.matchAll(/<dialog\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/dialog>/g)) {
  const d = elementos[m[1]]; dialogos.push(d);
  d.formularios = [...m[2].matchAll(/<form\b[^>]*id="([^"]+)"/g)].map(x => elementos[x[1]]);
  for (const _ of m[2].matchAll(/data-rec-cerrar/g)) { const boton = new Elemento('button'); boton.dialogo = d; cerrar.push(boton); }
}
const $ = id => { assert.ok(elementos[id], 'Falta ID en HTML: ' + id); return elementos[id]; };
let api, pendiente = false, falloEstado = false, falloContactos = false, falloEscritura = false, llamadas = [], recargas = 0;
const actor = '11111111-1111-4111-8111-111111111111', otro = '22222222-2222-4222-8222-222222222222';
const lista = [
  { id_auth: actor, nombre: 'Admin propio', correo: 'admin@example.com', rol: 'administrador' },
  { id_auth: otro, nombre: '<img src=x onerror=alert(1)>', correo: 'otra@example.com', rol: 'administrador', whatsapp_recuperacion: '59170000000' },
  { id_auth: '33333333-3333-4333-8333-333333333333', nombre: 'Vendedor', correo: 'vendedor@example.com', rol: 'vendedor' }
];
const storage = new Map();
const cliente = {
  rpc: async nombre => {
    if (nombre === 'estado_recuperacion_mueblex') return { data: falloEstado ? null : { requiere_cambio: pendiente }, error: falloEstado ? {} : null };
    return falloContactos ? { data: null, error: {} } : { data: [{ nombre: 'Ana', whatsapp: '59170000000' }, { nombre: 'Luis', whatsapp: '59171111111' }], error: null };
  },
  functions: { invoke: async (_, { body }) => {
    llamadas.push(body);
    if (falloEscritura && ['contacto', 'restablecer'].includes(body.accion)) return { data: null, error: { context: { json: async () => ({ error: 'Error simulado: revisa el historial.' }) } } };
    if (body.accion === 'listar') return { data: { usuarios: lista, total: 3, mi_id: actor }, error: null };
    if (body.accion === 'historial') return { data: { historial: [], total: 0 }, error: null };
    return { data: { ok: true }, error: null };
  } },
  auth: { signOut: async () => ({ error: null }) }
};
const contexto = {
  clientesupabase: cliente, TextEncoder, Date, Option: function(texto, valor) { const e = new Elemento('option'); e.textContent = texto; e.value = valor; return e; },
  document: { getElementById: $, createElement: tag => new Elemento(tag), querySelectorAll: selector => selector === '[data-rec-cerrar]' ? cerrar : dialogos },
  window: { addEventListener() {} }, location: { reload() { recargas++; } },
  sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }
};
vm.runInNewContext(fs.readFileSync(path.join(base, 'js/recuperacion-mueblex.js'), 'utf8') + '\napi=RecuperacionMueblex;', { ...contexto, set api(v) { api = v; } });
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
let total = 0;
const comprobar = (nombre, accion) => { accion(); total++; };
(async () => {
  comprobar('sin consultas al cargar', () => assert.equal(llamadas.length, 0));
  await api.preparar(false);
  comprobar('panel vendedor oculto', () => assert.equal($('panel-recuperacion-admin').hidden, true));
  comprobar('sin datos vendedor', () => assert.equal($('filas-accesos').children.length, 0));
  await api.preparar(true);
  comprobar('panel admin visible', () => assert.equal($('panel-recuperacion-admin').hidden, false));
  comprobar('tres usuarios', () => assert.equal($('filas-accesos').children.length, 3));
  const filas = $('filas-accesos').children;
  comprobar('texto HTML no interpretado', () => assert.equal(filas[1].children[0].textContent, lista[1].nombre));
  const botones = fila => fila.children[4].children[0].children;
  comprobar('propia cuenta sin restablecer', () => assert.ok(!botones(filas[0]).some(b => b.textContent === 'Restablecer contraseña')));
  comprobar('vendedor sin editar contacto', () => assert.equal(botones(filas[2]).length, 1));
  $('buscar-acceso').value = 'Ana'; await $('form-buscar-acceso').emitir('submit'); await flush();
  comprobar('búsqueda enviada', () => assert.equal(llamadas.filter(l => l.accion === 'listar').at(-1).buscar, 'Ana'));
  await $('enlace-recuperar').emitir('click');
  comprobar('selección dos administradores', () => assert.equal($('rec-administrador').children.length, 3));
  $('rec-correo').value = 'persona+ventas@example.com'; $('rec-administrador').value = '1';
  await $('form-contactar-admin').emitir('submit');
  comprobar('destinatario elegido', () => assert.ok($('rec-abrir-whatsapp').href.startsWith('https://wa.me/59171111111?text=')));
  comprobar('correo codificado', () => assert.ok($('rec-abrir-whatsapp').href.includes('persona%2Bventas%40example.com')));
  comprobar('sin mensaje automático', () => assert.equal(llamadas.some(l => l.accion === 'whatsapp'), false));
  await $('rec-administrador').emitir('change');
  comprobar('invalida enlace al cambiar destinatario', () => assert.equal($('rec-abrir-whatsapp').hidden, true));
  comprobar('borra href anterior', () => assert.equal($('rec-abrir-whatsapp').href, undefined));
  $('dialogo-contactar-admin').close(); falloContactos = true; await $('enlace-recuperar').emitir('click');
  comprobar('error contactos visible', () => assert.match($('mensaje-contactar-admin').textContent, /No se pudieron/));
  $('dialogo-contactar-admin').close(); falloContactos = false;
  await botones($('filas-accesos').children[1]).find(b => b.textContent === 'Restablecer contraseña').emitir('click');
  comprobar('abre modal restablecer', () => assert.equal($('dialogo-restablecer-acceso').open, true));
  const antes = llamadas.length;
  $('rec-temporal').value = 'Temporal-prueba-123'; $('rec-temporal-repetir').value = 'Distinta-prueba-456';
  await $('form-restablecer-acceso').emitir('submit');
  comprobar('rechaza contraseñas distintas', () => assert.equal(llamadas.length, antes));
  $('rec-temporal-repetir').value = 'Temporal-prueba-123'; $('rec-identidad').checked = true;
  await $('form-restablecer-acceso').emitir('submit');
  comprobar('restablecimiento correcto', () => assert.equal(llamadas.find(l => l.accion === 'restablecer').id_auth, otro));
  comprobar('modal cierra', () => assert.equal($('dialogo-restablecer-acceso').open, false));
  comprobar('contraseña borrada del formulario', () => assert.equal($('rec-temporal').value, ''));
  await botones($('filas-accesos').children[1]).find(b => b.textContent === 'WhatsApp de ayuda').emitir('click');
  $('rec-telefono').value = '59172222222'; await $('form-contacto-recuperacion').emitir('submit');
  comprobar('contacto seleccionado', () => assert.equal(llamadas.find(l => l.accion === 'contacto').whatsapp, '59172222222'));
  await botones($('filas-accesos').children[1]).find(b => b.textContent === 'Restablecer contraseña').emitir('click');
  $('rec-temporal').value = 'Temporal-prueba-123'; $('rec-temporal-repetir').value = 'Temporal-prueba-123'; $('rec-identidad').checked = true;
  falloEscritura = true; await $('form-restablecer-acceso').emitir('submit');
  comprobar('fallo mantiene modal', () => assert.equal($('dialogo-restablecer-acceso').open, true));
  comprobar('fallo explica incertidumbre', () => assert.match($('mensaje-restablecer-acceso').textContent, /revisa el historial/));
  comprobar('fallo limpia contraseña', () => assert.equal($('rec-temporal').value, ''));
  comprobar('fallo pide verificar identidad otra vez', () => assert.equal($('rec-identidad').checked, false));
  $('dialogo-restablecer-acceso').close(); falloEscritura = false;
  pendiente = true; $('seccion-app').style.display = 'block';
  comprobar('estado normal anterior', () => assert.equal($('cambio-obligatorio').hidden, true));
  assert.equal(await api.verificarAcceso(), false); total++;
  comprobar('cuenta temporal oculta negocio', () => assert.equal($('seccion-app').style.display, 'none'));
  comprobar('cuenta temporal muestra cambio', () => assert.equal($('cambio-obligatorio').hidden, false));
  comprobar('limpia lista admin al bloquear', () => assert.equal($('filas-accesos').children.length, 0));
  $('rec-password-actual').value = 'Temporal-prueba-123'; $('rec-password-nueva').value = 'Temporal-prueba-123'; $('rec-password-repetir').value = 'Temporal-prueba-123';
  await $('form-cambio-obligatorio').emitir('submit');
  comprobar('impide reutilizar temporal', () => assert.equal(llamadas.filter(l => l.accion === 'completar_cambio').length, 0));
  $('rec-password-nueva').value = 'Personal-nueva-456'; $('rec-password-repetir').value = 'Personal-nueva-456';
  await $('form-cambio-obligatorio').emitir('submit');
  comprobar('completa cambio', () => assert.equal(llamadas.filter(l => l.accion === 'completar_cambio').length, 1));
  comprobar('vuelve al login', () => assert.equal(recargas, 1));
  comprobar('campos de contraseña vacíos', () => assert.equal($('rec-password-nueva').value, ''));
  falloEstado = true; await assert.rejects(api.verificarAcceso(), /No se pudo comprobar/); total++;
  console.log(`${total} pruebas de interfaz superadas (DOM y Supabase simulados).`);
})().catch(e => { console.error(e); process.exitCode = 1; });
