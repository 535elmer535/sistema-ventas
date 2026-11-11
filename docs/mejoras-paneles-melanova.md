# Melanova — Mejoras de paneles y listados

Fecha: 10 de noviembre de 2026.

## Cambios del paquete

- Inventario: registro y reposición en tarjetas proporcionadas; consulta de existencias antes del historial; estados de stock con texto y color.
- Ventas: campos alineados, tabla amplia, total destacado y detalle/cobro delimitados.
- Pedidos: descripción, medidas, color, cantidad, precio y fecha organizados; tablas amplias con desplazamiento propio cuando hace falta.
- Clientes: formulario y listado adaptables al ancho disponible; búsqueda y páginas de ocho registros.
- Reportes: separación visual entre ventas registradas, cobros, devoluciones, neto y listado de operaciones. Se conserva la distinción entre ventas, cobros y ganancias.
- Administración: medidas comunes para categorías, usuarios, contraseñas e historial de recuperación.
- Tablas: encabezados claros, tamaños de letra compartidos, botones legibles y foco visible. Muebles, clientes y categorías pasan a tarjetas en móvil. Los historiales extensos conservan desplazamiento horizontal dentro de su marco.
- Muebles y clientes: carga completa por lotes ordenados por ID, con conteo exacto. Si cambia el total durante la consulta o falta parte de la respuesta, se muestra el error existente y no se presenta un listado incompleto como correcto.
- Pruebas: adaptación del DOM simulado al panel B de recuperación y pruebas de la nueva carga por lotes.

El filtro busca en los registros cargados. Los selectores de venta y pedido conservan todos los muebles/clientes consultados; el filtro de la tabla no limita sus opciones. La paginación visible es local: ocho filas por página. Para catálogos muy grandes convendrá migrar a búsqueda y paginación completas en el servidor.

## Verificación realizada

- 16 archivos JavaScript revisados sintácticamente, sin errores.
- No se perdieron identificadores HTML existentes; sin duplicados, enlaces locales rotos ni etiquetas sin campo.
- 8 pruebas de listados superadas: vacío, 1201 registros, servidor con límite menor, error de permisos, respuesta incompleta, ID repetido, cambio de total y conteo ausente.
- 39 pruebas de interfaz de recuperación superadas, con DOM y Supabase simulados.
- 48 pruebas del servidor de recuperación superadas, con Supabase simulado.
- Revisión visual de las seis secciones a 1280 × 720 y 390 × 844 con registros ficticios; sin desplazamiento horizontal de la página en las seis vistas móviles.
- Búsqueda y navegación a segunda página de muebles verificadas en navegador; tarjetas de móvil verificadas.
- Sin errores de consola en la vista de prueba.

Estas verificaciones no sustituyen las pruebas conectadas a la instalación real. No se ejecutaron ventas, pagos, modificaciones de cuentas ni migraciones en Supabase. No se publicó el paquete en GitHub/Netlify.

## Comprobación local después de copiar

1. Abrir el proyecto en Live Server y recargar con Ctrl + F5.
2. Iniciar sesión como administrador: abrir las seis secciones y revisar campos, tablas y botones.
3. Buscar un mueble o cliente por parte del nombre; limpiar la búsqueda; probar páginas si hay más de ocho registros.
4. Abrir un detalle existente de venta y pedido: revisar información, cobros y entrega sin registrar operaciones nuevas por error.
5. Entrar como vendedor: confirmar que siguen ocultos los controles administrativos.
6. Probar en móvil y revisar la consola.
7. Al confirmar el resultado, guardar en Git y comprobar el despliegue de Netlify.

Pruebas automáticas, si Node.js está instalado:

~~~text
node tests/listados-melanova.cjs
node tests/recuperacion-interfaz.cjs
node tests/recuperacion-servidor.cjs
~~~
