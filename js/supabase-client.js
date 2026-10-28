
const SUPABASE_URL = "https://hthqfmizagsrxgzspqqe.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHFmbWl6YWdzcnhnenNwcXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzM5OTEsImV4cCI6MjEwNjQ0OTk5MX0.k8185qLK4BxjZodrmLi6bJLCCsa-jdSJ6okUTThus_M";

// Al marcar Recordarme, Supabase guarda la sesión en localStorage.
// Si no se marca, se utiliza sessionStorage (solo la pestaña actual).
// La clave anterior de Supabase sigue siendo legible para no desconectar
// inesperadamente a los usuarios que ya tenían una sesión.
const PREFERENCIA_RECORDAR = "melamina-recordarme";
let recordarSesion = localStorage.getItem(PREFERENCIA_RECORDAR) !== "false";
const almacenamientoSesion = {
  getItem(clave) {
    return sessionStorage.getItem(clave) ?? localStorage.getItem(clave);
  },
  setItem(clave, valor) {
    if (recordarSesion) {
      localStorage.setItem(clave, valor);
      sessionStorage.removeItem(clave);
    } else {
      sessionStorage.setItem(clave, valor);
      localStorage.removeItem(clave);
    }
  },
  removeItem(clave) {
    sessionStorage.removeItem(clave);
    localStorage.removeItem(clave);
  }
};

const clientesupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: almacenamientoSesion, persistSession: true, autoRefreshToken: true }
});