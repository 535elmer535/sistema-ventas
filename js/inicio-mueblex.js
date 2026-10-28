/* Inicio y búsqueda: consultas de lectura con el cliente y RLS originales. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const moneda = valor => new Intl.NumberFormat('es-BO', {style:'currency', currency:'BOB', maximumFractionDigits:2}).format(Number(valor) || 0);
  const diaLocal = fecha => new Intl.DateTimeFormat('en-CA', {timeZone:'America/La_Paz', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(fecha));
  const fechaCorta = fecha => new Intl.DateTimeFormat('es-BO', {timeZone:'America/La_Paz',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(fecha));
  function diasSemana(ahora = new Date()) {
    const hoy = diaLocal(ahora);
    return Array.from({length:7}, (_,i) => {
      const fecha = new Date(`${hoy}T12:00:00-04:00`);
      fecha.setUTCDate(fecha.getUTCDate() - 6 + i);
      return diaLocal(fecha);
    });
  }
  function agruparVentas(ventas, dias) {
    const centavos = new Map(dias.map(dia => [dia,0]));
    for (const venta of ventas) {
      const dia = diaLocal(venta.fecha_venta);
      if (centavos.has(dia)) centavos.set(dia, centavos.get(dia) + Math.round(Number(venta.total) * 100));
    }
    return dias.map(dia => ({dia,total:centavos.get(dia)/100}));
  }
  function terminoSeguro(valor) {
    return String(valor).normalize('NFC').replace(/[^\p{L}\p{N}\s@.+-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,80);
  }
  function filtroVenta(termino) {
    const id = termino.match(/^(?:v-?|venta\s*)?(\d+)$/i);
    if (id && Number.isSafeInteger(Number(id[1]))) return {tipo:'id',valor:Number(id[1])};
    if (/^\d{4}-\d{2}-\d{2}$/.test(termino)) {
      const fecha = new Date(`${termino}T12:00:00Z`);
      if (!Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0,10) === termino) {
        fecha.setUTCDate(fecha.getUTCDate()+1);
        return {tipo:'fecha',valor:termino,hasta:fecha.toISOString().slice(0,10)};
      }
    }
    return {tipo:'texto',valor:termino};
  }
  const app = $('seccion-app');
  let epoca = 0, busquedaActual = 0, temporizador, aborto;
  const visible = () => app.style.display !== 'none';
  const crear = (tag, texto, clase) => {
    const nodo = document.createElement(tag);
    if (texto !== undefined) nodo.textContent = texto;
    if (clase) nodo.className = clase;
    return nodo;
  };
  function perfil() {
    const saludo = $('saludo-usuario').textContent.trim();
    const nombre = saludo.replace(/^Bienvenido,?\s*/i,'') || 'Mi cuenta';
    $('perfil-nombre').textContent = nombre;
    $('avatar-panel').textContent = nombre.charAt(0).toUpperCase();
    $('perfil-rol').textContent = typeof usuarioEsAdministrador !== 'undefined' && usuarioEsAdministrador ? 'Administrador' : 'Mi cuenta';
  }
  function ir(destino) {
    const boton = app.querySelector(`nav [data-destino="${destino}"]`);
    if (boton) boton.click();
  }
  function catalogo(productos) {
    const contenedor = $('catalogo-inicio'); contenedor.replaceChildren();
    if (!productos.length) { contenedor.append(crear('p','Todavía no hay productos registrados.')); return; }
    productos.forEach(producto => {
      const tarjeta = crear('article',undefined,'producto-inicio');
      const icono = crear('div',undefined,'imagen-producto');
      const i = crear('i',undefined,'fa-solid fa-couch'); i.setAttribute('aria-hidden','true'); icono.append(i);
      tarjeta.append(icono,crear('h3',producto.nombre),crear('strong',moneda(producto.precio)),crear('small',`${Number(producto.existencia)||0} unidades disponibles`));
      contenedor.append(tarjeta);
    });
  }
  function grafico(valores) {
    const contenedor = $('grafico-semana'); contenedor.replaceChildren();
    const maximo = Math.max(1,...valores.map(v=>v.total));
    valores.forEach(({dia,total}) => {
      const columna = crear('div',undefined,'columna-grafico');
      columna.append(crear('span',moneda(total),'valor-grafico'));
      const pista = crear('div',undefined,'pista-grafico');
      const barra = crear('span',undefined,'barra-grafico');
      barra.style.height = `${Math.max(0,total/maximo*100)}%`; pista.append(barra);
      const etiqueta = new Intl.DateTimeFormat('es-BO',{weekday:'short',timeZone:'America/La_Paz'}).format(new Date(`${dia}T12:00:00-04:00`));
      columna.append(pista,crear('span',etiqueta,'dia-grafico')); columna.setAttribute('aria-label',`${dia}: ${moneda(total)}`);
      contenedor.append(columna);
    });
  }
  function ultimas(ventas) {
    const cuerpo = $('ultimas-ventas-inicio'); cuerpo.replaceChildren();
    if (!ventas.length) { const fila=crear('tr');const celda=crear('td','Todavía no hay ventas registradas.');celda.colSpan=4;fila.append(celda);cuerpo.append(fila);return; }
    ventas.forEach(venta => {
      const fila = crear('tr');
      fila.append(crear('td',`V-${venta.id_venta}`),crear('td',fechaCorta(venta.fecha_venta)),crear('td',moneda(venta.total)));
      const estado = crear('td');

estado.append(crear(
  'span',
  venta.estado_pago || 'Sin estado',
  `estado-pago ${venta.estado_pago === 'pagado' ? 'pagado' : 'pendiente'}`
));

estado.append(
  crear('br'),
  crear(
    'small',
    `Operación: ${
      venta.estado_operacion === 'anulada'
        ? 'Anulada'
        : venta.estado_operacion === 'activa'
          ? 'Activa'
          : 'Por revisar'
    }`
  )
);
      fila.append(estado);cuerpo.append(fila);
    });
  }
  async function ventasSemana(dias) {
    let filas=[];
    const fin = new Date(`${dias[dias.length-1]}T12:00:00Z`);
    fin.setUTCDate(fin.getUTCDate()+1);
    const hasta = fin.toISOString().slice(0,10);
    // Paginación de lectura para no calcular totales truncados por el límite de Supabase.
    for (let desde=0;;desde+=1000) {
      const {data,error} = await clientesupabase
  .from('ventas')
  .select('id_venta,fecha_venta,total')
  .in('tipo_venta', ['directa_stock', 'pedido_medida'])
  .eq('estado_operacion', 'activa')
  .gte('fecha_venta', `${dias[0]}T00:00:00-04:00`)
  .lt('fecha_venta', `${hasta}T00:00:00-04:00`)
  .order('fecha_venta', {ascending:true})
  .order('id_venta', {ascending:true})
  .range(desde, desde+999);
      if (error) throw error;
      filas.push(...data);
      if (data.length<1000) return filas;
    }
  }
  function limpiar() {
    ++epoca; ++busquedaActual; clearTimeout(temporizador); aborto?.abort();
    $('busqueda-global').value=''; $('resultados-buscador').hidden=true; $('lista-resultados').replaceChildren();
    ['inicio-ventas-hoy','inicio-productos','inicio-clientes','inicio-pedidos'].forEach(id=>$(id).textContent='—');
    $('catalogo-inicio').replaceChildren(); $('ultimas-ventas-inicio').replaceChildren(); $('grafico-semana').replaceChildren();
    $('estado-inicio').textContent=''; $('perfil-nombre').textContent='Mi cuenta';$('perfil-rol').textContent='Sesión activa';$('avatar-panel').textContent='M';
  }
  async function cargarInicio() {
    const turno=++epoca;
    $('estado-inicio').textContent='Cargando resumen…';
    try {
      const {data:{session},error} = await clientesupabase.auth.getSession();
      if (error || !session || !visible() || turno!==epoca) return;
      const dias=diasSemana();
      const resultados=await Promise.allSettled([
        clientesupabase.from('productos').select('id_producto,nombre,precio,existencia',{count:'exact'}).order('id_producto').limit(4),
        clientesupabase.from('clientes').select('id_cliente',{count:'exact',head:true}),
        clientesupabase
  .from('ventas')
  .select('id_venta', {count:'exact', head:true})
  .eq('tipo_venta', 'pedido_medida')
  .eq('estado_operacion', 'activa'),
        ventasSemana(dias),
        clientesupabase.from('ventas')
  .select('id_venta,fecha_venta,total,estado_pago,estado_operacion')
  .order('fecha_venta', {ascending:false})
  .order('id_venta', {ascending:false})
  .limit(5)
      ]);
      if (!visible() || turno!==epoca) return;
      let fallos=0;
      resultados.forEach((r,i)=>{
        if (r.status!=='fulfilled' || r.value.error) {
          fallos++;
          if (i===0) $('catalogo-inicio').textContent='No se pudo cargar el catálogo.';
          if (i===3) $('grafico-semana').textContent='No se pudo cargar el gráfico.';
          if (i===4) { const fila=crear('tr');const td=crear('td','No se pudieron cargar las ventas.');td.colSpan=4;fila.append(td);$('ultimas-ventas-inicio').replaceChildren(fila); }
          return;
        }
        if(i===0){$('inicio-productos').textContent=r.value.count??'—';catalogo(r.value.data);}
        if(i===1)$('inicio-clientes').textContent=r.value.count??'—';
        if(i===2)$('inicio-pedidos').textContent=r.value.count??'—';
        if(i===3){const resumen=agruparVentas(r.value,dias);grafico(resumen);$('inicio-ventas-hoy').textContent=moneda(resumen[6].total);}
        if(i===4)ultimas(r.value.data);
      });
      $('estado-inicio').textContent=fallos?'Algunos datos no pudieron cargarse. Revisa la conexión o los permisos de tu cuenta.':'';
      perfil();
    } catch {if(turno===epoca && visible())$('estado-inicio').textContent='No se pudo cargar el resumen.';}
  }
  async function consultar(termino,signal) {
    const patron=`*${termino}*`;
    const productos=clientesupabase.from('productos').select('id_producto,nombre,precio,existencia').ilike('nombre',patron).order('nombre').limit(12).abortSignal(signal);
    const clientes=clientesupabase.from('clientes').select('id_cliente,nombre,contacto').or(`nombre.ilike.${patron},contacto.ilike.${patron}`).order('nombre').limit(12).abortSignal(signal);
    let ventas=clientesupabase.from('ventas').select('id_venta,fecha_venta,total,tipo_venta,estado_pago');
    const filtro=filtroVenta(termino);
    if(filtro.tipo==='id')ventas=ventas.eq('id_venta',filtro.valor);
    else if(filtro.tipo==='fecha')ventas=ventas.gte('fecha_venta',`${filtro.valor}T00:00:00-04:00`).lt('fecha_venta',`${filtro.hasta}T00:00:00-04:00`);
    else ventas=ventas.or(`tipo_venta.ilike.${patron},estado_pago.ilike.${patron}`);
    ventas=ventas.order('fecha_venta',{ascending:false}).order('id_venta',{ascending:false}).limit(12).abortSignal(signal);
    return Promise.allSettled([productos,clientes,ventas]);
  }
  function pintarResultados(respuestas) {
    const lista=$('lista-resultados');lista.replaceChildren();let cantidad=0,fallos=0;
    respuestas.forEach((r,i)=>{
      const nombre=['Productos','Clientes','Ventas'][i];const grupo=crear('section',undefined,'grupo-busqueda');grupo.append(crear('h3',nombre));
      if(r.status!=='fulfilled'||r.value.error){fallos++;grupo.append(crear('p',`No se pudo consultar ${nombre.toLowerCase()}.`));}
      else if(!r.value.data.length)grupo.append(crear('p','Sin coincidencias.'));
      else {
        cantidad+=r.value.data.length;
        r.value.data.forEach(fila=>{
          const item=crear('article',undefined,'resultado-busqueda');
          const titulo=i===2?`Venta V-${fila.id_venta}`:fila.nombre;
          const detalle=i===0?`${moneda(fila.precio)} · ${fila.existencia} unidades`:i===1?`Teléfono: ${fila.contacto || 'Sin contacto'}`:`${fechaCorta(fila.fecha_venta)} · ${moneda(fila.total)} · ${fila.estado_pago||'Sin estado'} · ${fila.tipo_venta==='pedido_medida'?'Pedido a medida':'Venta de stock'}`;
          item.append(crear('strong',titulo),crear('p',detalle));
          const boton=crear('button',['Ir a Inventario','Ir a Clientes','Ir a Reportes'][i]);boton.type='button';
          boton.addEventListener('click',()=>{
            ir(['inventario','clientes','reportes'][i]);
            if(i<2){
              const tbody=$(i===0?'cuerpo-productos':'cuerpo-clientes');
              const id=String(i===0?fila.id_producto:fila.id_cliente);
              const encontrado=[...tbody.querySelectorAll('button[data-id]')].find(b=>b.dataset.id===id)?.closest('tr');
              if(encontrado){encontrado.scrollIntoView({block:'center'});encontrado.animate([{backgroundColor:'#edceaa'},{backgroundColor:'transparent'}],{duration:1800});}
            }
            $('resultados-buscador').hidden=true;
          });
          item.append(boton);grupo.append(item);
        });
        if(r.value.data.length===12)grupo.append(crear('small','Mostrando 12 coincidencias. Escribe más detalles para precisar.'));
      }
      lista.append(grupo);
    });
    $('estado-buscador').textContent=`${cantidad} coincidencias mostradas.${fallos?' Algunas consultas no pudieron completarse.':''}`;
  }
  async function buscar() {
    const turno=++busquedaActual;aborto?.abort();aborto=new AbortController();const signal=aborto.signal;
    const termino=terminoSeguro($('busqueda-global').value);
    if(!visible())return;
    if(termino.length<2){$('resultados-buscador').hidden=true;$('lista-resultados').replaceChildren();return;}
    $('resultados-buscador').hidden=false;$('estado-buscador').textContent='Buscando…';$('lista-resultados').replaceChildren();
    try {
      const {data:{session},error}=await clientesupabase.auth.getSession();
      if(turno!==busquedaActual || !visible() || signal.aborted)return;
      if(error || !session){$('estado-buscador').textContent='Inicia sesión para buscar.';return;}
      const respuestas=await consultar(termino,signal);
      if(turno!==busquedaActual || !visible() || signal.aborted)return;
      pintarResultados(respuestas);
    }catch{if(turno===busquedaActual && visible() && !signal.aborted)$('estado-buscador').textContent='No se pudo completar la búsqueda.';}
  }
  $('form-buscador').addEventListener('submit',e=>{e.preventDefault();clearTimeout(temporizador);buscar();});
  $('busqueda-global').addEventListener('input',()=>{clearTimeout(temporizador);++busquedaActual;aborto?.abort();temporizador=setTimeout(buscar,350);});
  function cerrar(){++busquedaActual;clearTimeout(temporizador);aborto?.abort();$('resultados-buscador').hidden=true;$('busqueda-global').focus();}
  $('cerrar-buscador').addEventListener('click',cerrar);
  $('busqueda-global').addEventListener('keydown',e=>{if(e.key==='Escape')cerrar();});
  new MutationObserver(()=>{if(visible()){perfil();cargarInicio();}else limpiar();}).observe(app,{attributes:true,attributeFilter:['style']});
  new MutationObserver(perfil).observe($('saludo-usuario'),{childList:true,subtree:true,characterData:true});
  // Actualizar al volver a Inicio y después de refrescar listados por operaciones existentes.
  new MutationObserver(()=>{if(visible()&&!$('vista-inicio').hidden)cargarInicio();}).observe($('vista-inicio'),{attributes:true,attributeFilter:['hidden']});
  if(visible()){perfil();cargarInicio();}
})();
