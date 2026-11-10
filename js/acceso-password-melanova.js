// Control visual de la contraseña. No modifica el inicio de sesión.
(() => {
  const campo = document.getElementById('login-password');
  const boton = document.getElementById('alternar-password-melanova');
  const formulario = document.getElementById('form-login');
  if (!campo || !boton) return;
  const icono = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const iconoOcultar = icono.replace('</svg>', '<path d="M3 3 21 21"/></svg>');
  function mostrar(visible) {
    campo.type = visible ? 'text' : 'password';
    const texto = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    boton.setAttribute('aria-label', texto);
    boton.setAttribute('aria-pressed', String(visible));
    boton.title = texto;
    boton.innerHTML = visible ? iconoOcultar : icono;
  }
  boton.addEventListener('click', () => mostrar(campo.type === 'password'));
  formulario?.addEventListener('submit', () => mostrar(false), true);
  formulario?.addEventListener('reset', () => mostrar(false));
  mostrar(false);
})();
