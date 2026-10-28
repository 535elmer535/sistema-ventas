# Rediseño del panel interno — 25 octubre 2026

## Archivos modificados
- `index.html`: se agregaron siete referencias CSS y clases de presentación a ocho secciones existentes. **No se borraron formularios, campos, identificadores, secciones o scripts**.
- `css/styles.css`: estaba vacío; ahora contiene los estilos generales del panel y las reglas responsive.

## Archivos nuevos
- `css/usuarios.css`, `css/productos.css`, `css/ventas.css`, `css/pedidos.css`, `css/clientes.css`, `css/reportes.css`: reglas visuales de cada módulo.
- Este registro de cambios.

## Archivos conservados sin cambios
- `css/login-neumorfico.css` (login original)
- `js/app.js`, `js/supabase-client.js`, `supabase/functions/registrar-usuario/index.ts`
- Documentos, diagramas y demás archivos.

## Eliminaciones
- Ninguna.

## Notas
- Las modificaciones son visuales, no alteran permisos ni la configuración de Supabase.
- Abre `index.html` con Live Server y prueba sesión de administrador y vendedor, formularios y vista móvil.
- Las tablas amplias tienen desplazamiento horizontal en pantallas pequeñas.
