/* Navegación local: no modifica sesión, permisos, datos ni formularios. */
(() => {
  'use strict';
  const app = document.getElementById('seccion-app');
  const vistas = [...app.querySelectorAll('.vista-panel')];
  const botones = [...app.querySelectorAll('[data-destino]')];
  const menu = [...app.querySelectorAll('nav [data-destino]')];
  const titulo = document.getElementById('titulo-seccion');
  function mostrar(destino, enfocar = true) {
    const vista = document.getElementById(`vista-${destino}`);
    if (!vistas.includes(vista)) return;
    vistas.forEach(panel => { panel.hidden = panel !== vista; });
    menu.forEach(boton => {
      if (boton.dataset.destino === destino) {
        boton.setAttribute('aria-current', 'page');
        titulo.textContent = boton.textContent.trim();
      } else boton.removeAttribute('aria-current');
    });
    if (enfocar) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  botones.forEach(boton => boton.addEventListener('click', () => mostrar(boton.dataset.destino)));
  // Cada entrada o salida de sesión vuelve a Inicio sin vaciar los formularios.
  new MutationObserver(() => mostrar('inicio', false)).observe(app, { attributes: true, attributeFilter: ['style'] });
  mostrar('inicio', false);
})();
