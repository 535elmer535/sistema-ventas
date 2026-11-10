/* Inicio y búsqueda: consultas de lectura con el cliente y RLS originales. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const moneda = valor => new Intl.NumberFormat('es-BO', {style:'currency', currency:'BOB', maximumFractionDigits:2}).format(Number(valor) || 0);
  const diaLocal = fecha => new Intl.DateTimeFormat('en-CA', {timeZone:'America/La_Paz', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(fecha));
  const fechaCorta = fecha => new Intl.DateTimeFormat('es-BO', {timeZone:'America/La_Paz',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(fecha));
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

  // Cálculos en centavos; se excluyen las operaciones anuladas.
  function resumenOperativo(ventas, pagos, hoy) {
    const centavos = valor => {
      const numero=Number(valor),resultado=Math.round(numero*100);
      if(valor==null||!Number.isFinite(numero)||!Number.isSafeInteger(resultado)||resultado<0)throw new Error('Importe no válido');
      return resultado;
    };
    const cobros=new Map();
    pagos.forEach(p=>{const id=String(p.id_venta),suma=(cobros.get(id)||0)+centavos(p.monto);if(!Number.isSafeInteger(suma))throw new Error('Importe fuera de rango');cobros.set(id,suma);});
    let ventasHoy=0,saldo=0;
    const pendientes=[];
    for(const venta of ventas){
      if(venta.estado_operacion!=='activa'||!['directa_stock','pedido_medida'].includes(venta.tipo_venta))continue;
      const total=centavos(venta.total);
      if(diaLocal(venta.fecha_venta)===hoy)ventasHoy+=total;
      saldo+=Math.max(0,total-(cobros.get(String(venta.id_venta))||0));
      if(!Number.isSafeInteger(saldo)||!Number.isSafeInteger(ventasHoy))throw new Error('Importe fuera de rango');
      if(venta.tipo_venta!=='pedido_medida')continue;
      const muebles=(venta.muebles||[]).filter(m=>m.estado_taller!=='entregado');
      if(!muebles.length)continue;
      const fechas=muebles.map(m=>m.fecha_entrega_estimada).filter(f=>/^\d{4}-\d{2}-\d{2}$/.test(f||'')).sort();
      const cliente=Array.isArray(venta.cliente)?venta.cliente[0]:venta.cliente;
      pendientes.push({id:venta.id_venta,cliente:cliente?.nombre||'Sin cliente registrado',fecha:fechas[0]||null,muebles:muebles.length,atrasado:!!fechas[0]&&fechas[0]<hoy});
    }
    pendientes.sort((a,b)=>(a.fecha||'9999-12-31').localeCompare(b.fecha||'9999-12-31')||Number(a.id)-Number(b.id));
    return {ventasHoy:ventasHoy/100,saldo:saldo/100,pendientes};
  }

  function serieSemana(ventas,hoy){
    const dias=Array.from({length:7},(_,i)=>{const fecha=new Date(hoy+'T12:00:00-04:00');fecha.setUTCDate(fecha.getUTCDate()-6+i);return diaLocal(fecha);});
    const importes=new Map(dias.map(d=>[d,0]));
    for(const venta of ventas){
      if(venta.estado_operacion!=='activa'||!['directa_stock','pedido_medida'].includes(venta.tipo_venta))continue;
      const dia=diaLocal(venta.fecha_venta);if(!importes.has(dia))continue;
      const importe=Math.round(Number(venta.total)*100);
      const suma=importes.get(dia)+importe;
      if(venta.total==null||!Number.isSafeInteger(importe)||importe<0||!Number.isSafeInteger(suma))throw new Error('Importe no válido');
      importes.set(dia,suma);
    }
    return dias.map(dia=>({dia,total:importes.get(dia)/100}));
  }
  function pintarSemana(ventas,hoy){
    const serie=serieSemana(ventas,hoy),contenedor=$('grafico-semana-inicio');contenedor.replaceChildren();
    const maximo=Math.max(1,...serie.map(v=>v.total));
    const total=serie.reduce((s,v)=>s+Math.round(v.total*100),0);
    if(!Number.isSafeInteger(total))throw new Error('Importe semanal fuera de rango');
    $('total-semana-inicio').textContent=moneda(total/100)+' en 7 días';
    serie.forEach(({dia,total})=>{
      const columna=crear('div',undefined,'columna-semana-inicio');
      const pista=crear('div',undefined,'pista-semana-inicio'),barra=crear('span',undefined,'barra-semana-inicio');
      barra.style.height=(total/maximo*100)+'%';pista.append(barra);
      const etiqueta=new Intl.DateTimeFormat('es-BO',{timeZone:'America/La_Paz',weekday:'short'}).format(new Date(dia+'T12:00:00-04:00'));
      columna.setAttribute('aria-label',fechaCorta(dia+'T12:00:00-04:00')+': '+moneda(total));
      columna.title=fechaCorta(dia+'T12:00:00-04:00')+': '+moneda(total);
      columna.append(crear('span',new Intl.NumberFormat('es-BO',{notation:'compact',maximumFractionDigits:1}).format(total),'importe-semana-inicio'),pista,crear('span',etiqueta,'dia-semana-inicio'));contenedor.append(columna);
    });
  }
  async function leerPaginas(consulta){
    const filas=[];
    for(let desde=0;;desde+=500){
      const {data,error}=await consulta().range(desde,desde+499);
      if(error)throw error;if(!Array.isArray(data))throw new Error('Respuesta incompleta');
      filas.push(...data);if(data.length<500)return filas;
    }
  }
  function pintarEntregas(pedidos){
    const lista=$('entregas-inicio');lista.replaceChildren();
    if(!pedidos.length){lista.append(crear('p','No hay pedidos pendientes de entrega.','vacio-inicio'));return;}
    pedidos.slice(0,3).forEach(p=>{
      const fila=crear('article',undefined,'entrega-inicio'),detalle=crear('div');
      detalle.append(crear('strong','Pedido V-'+p.id+' · '+p.cliente),crear('small',p.muebles+(p.muebles===1?' mueble pendiente':' muebles pendientes')));
      const fecha=crear('span',p.fecha?fechaCorta(p.fecha+'T12:00:00-04:00'):'Sin fecha',p.atrasado?'fecha-entrega atrasada':'fecha-entrega');
      if(p.atrasado)fecha.append(crear('small','Atrasado'));
      fila.append(detalle,fecha);lista.append(fila);
    });
  }
  function limpiar(){
    ++epoca;++busquedaActual;clearTimeout(temporizador);aborto?.abort();
    $('busqueda-global').value='';$('resultados-buscador').hidden=true;$('lista-resultados').replaceChildren();
    ['inicio-ventas-hoy','inicio-saldo','inicio-stock-bajo','inicio-pendientes'].forEach(id=>$(id).textContent='—');
    $('ultimas-ventas-inicio').replaceChildren();$('entregas-inicio').replaceChildren();$('grafico-semana-inicio').replaceChildren();$('total-semana-inicio').textContent='—';
    $('estado-inicio').textContent='';$('fecha-inicio').textContent='';$('perfil-nombre').textContent='Mi cuenta';$('perfil-rol').textContent='Sesión activa';$('avatar-panel').textContent='M';
  }
  async function cargarInicio(){
    const turno=++epoca;$('estado-inicio').textContent='Cargando resumen…';
    ['inicio-ventas-hoy','inicio-saldo','inicio-stock-bajo','inicio-pendientes'].forEach(id=>$(id).textContent='—');
    $('ultimas-ventas-inicio').replaceChildren();$('entregas-inicio').textContent='Cargando pedidos…';$('grafico-semana-inicio').textContent='Cargando gráfico…';$('total-semana-inicio').textContent='—';
    try{
      const {data:{session},error}=await clientesupabase.auth.getSession();
      if(error||!session||!visible()||turno!==epoca)return;
      const hoy=diaLocal(new Date());
      $('fecha-inicio').textContent=new Intl.DateTimeFormat('es-BO',{timeZone:'America/La_Paz',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
      const respuestas=await Promise.allSettled([
        leerPaginas(()=>clientesupabase.from('ventas').select('id_venta,fecha_venta,total,tipo_venta,estado_operacion,cliente:clientes(nombre),muebles:pedidos_personalizados(estado_taller,fecha_entrega_estimada)').eq('estado_operacion','activa').in('tipo_venta',['directa_stock','pedido_medida']).order('id_venta')),
        leerPaginas(()=>clientesupabase.from('pagos').select('id_pago,id_venta,monto').order('id_pago')),
        clientesupabase.from('productos').select('id_producto',{count:'exact',head:true}).gte('existencia',0).lte('existencia',3),
        clientesupabase.from('ventas').select('id_venta,fecha_venta,total,estado_pago,estado_operacion').eq('tipo_venta','directa_stock').order('fecha_venta',{ascending:false}).order('id_venta',{ascending:false}).limit(3)
      ]);
      if(!visible()||turno!==epoca)return;
      const fallo=r=>r.status!=='fulfilled'||r.value?.error;let fallos=0;
      if(!fallo(respuestas[0])){
        try{
          const resumen=resumenOperativo(respuestas[0].value,fallo(respuestas[1])?[]:respuestas[1].value,hoy);
          pintarSemana(respuestas[0].value,hoy);
          $('inicio-ventas-hoy').textContent=moneda(resumen.ventasHoy);$('inicio-pendientes').textContent=resumen.pendientes.length;pintarEntregas(resumen.pendientes);
          if(!fallo(respuestas[1]))$('inicio-saldo').textContent=moneda(resumen.saldo);else fallos++;
        }catch{fallos++;$('entregas-inicio').textContent='No se pudo calcular el resumen de pedidos e importes.';$('grafico-semana-inicio').textContent='No se pudo calcular el gráfico.';$('total-semana-inicio').textContent='—';}
      }else{fallos++;$('entregas-inicio').textContent='No se pudieron cargar los pedidos.';$('grafico-semana-inicio').textContent='No se pudo cargar el gráfico.';}
      if(!fallo(respuestas[2])&&Number.isInteger(respuestas[2].value.count))$('inicio-stock-bajo').textContent=respuestas[2].value.count;else fallos++;
      if(!fallo(respuestas[3]))ultimas(respuestas[3].value.data);else{fallos++;const fila=crear('tr'),celda=crear('td','No se pudieron cargar las ventas.');celda.colSpan=4;fila.append(celda);$('ultimas-ventas-inicio').replaceChildren(fila);}
      $('estado-inicio').textContent=fallos?'Algunos datos no pudieron cargarse. Pulsa Actualizar resumen o revisa los permisos de tu cuenta.':'';perfil();
    }catch{if(turno===epoca&&visible())$('estado-inicio').textContent='No se pudo cargar el resumen. Pulsa Actualizar resumen para reintentar.';}
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
  $('actualizar-inicio').addEventListener('click',cargarInicio);
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
