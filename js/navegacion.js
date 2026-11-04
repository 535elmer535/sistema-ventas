/* Navegación local: no modifica sesión, permisos, datos ni formularios. */
(() => {
  'use strict';
  const app = document.getElementById('seccion-app');
  const vistas = [...app.querySelectorAll('.vista-panel')];
  const botones = [...app.querySelectorAll('[data-destino]')];
  const menu = [...app.querySelectorAll('nav [data-destino]')];
  const titulo = document.getElementById('titulo-seccion');
  const lateral = app.querySelector('.barra-lateral');
  const nav = document.getElementById('menu-secciones');
  const alternar = document.getElementById('alternar-menu');
  const textoMenu = document.getElementById('texto-menu-movil');
  const pantallaMovil = window.matchMedia('(max-width: 699px)');

  function cambiarMenu(abierto) {
    const movil = pantallaMovil.matches;
    nav.hidden = movil && !abierto;
    lateral.dataset.menuMovil = movil ? (abierto ? 'abierto' : 'cerrado') : 'escritorio';
    alternar.setAttribute('aria-expanded', String(!nav.hidden));
    textoMenu.textContent = movil && abierto ? 'Cerrar menú' : 'Menú';
  }

  function ajustarMenu() {
    alternar.hidden = !pantallaMovil.matches;
    cambiarMenu(false);
  }

  alternar.addEventListener('click', () => cambiarMenu(nav.hidden));
  lateral.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pantallaMovil.matches && !nav.hidden) {
      cambiarMenu(false);
      alternar.focus();
    }
  });
  pantallaMovil.addEventListener('change', ajustarMenu);
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
    if (pantallaMovil.matches) cambiarMenu(false);
    if (enfocar) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  botones.forEach(boton => boton.addEventListener('click', () => mostrar(boton.dataset.destino)));
  // Cada entrada o salida de sesión vuelve a Inicio sin vaciar los formularios.
  new MutationObserver(() => {
    ajustarMenu();
    mostrar('inicio', false);
  }).observe(app, { attributes: true, attributeFilter: ['style'] });
  ajustarMenu();
  mostrar('inicio', false);
})();
