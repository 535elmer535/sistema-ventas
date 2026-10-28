# Estilo MUEBLEX en todo el sistema

Revisión sobre `sistema-ventas-mueblex.zip`. Extiende la identidad visual de Inicio a Inventario, Ventas, Pedidos, Clientes, Reportes y Administración, y hace más visible Cerrar sesión.

## Cambios por archivo

| Archivo modificado | Cambio |
| --- | --- |
| `css/styles.css` | Tema común limitado a los módulos: tarjetas crema, bordes cálidos, campos claros, títulos verdes, acentos caramelo y botones principales verdes. Acciones de edición en verde claro, eliminación en terracota y cancelar en crema. Tablas con cabeceras cálidas y filas claras. Conserva las reglas de tamaño y distribución. |
| `css/productos.css` | Panel de edición cálido y énfasis verde en precios; conserva el ancho de tabla y edición. |
| `css/ventas.css` | Total en tarjeta verde suave y botones Quitar en tono arena. |
| `css/pedidos.css` | Marco de datos en crema cálido, totales y saldo en verde suave. Se conserva el máximo de 600 px del marco interior y el espacio amplio de la tabla. |
| `css/clientes.css` | Formulario de registro cálido, cabecera de tabla y panel de edición coordinados. Se conservan registro a la izquierda, listado a la derecha y desplazamiento propio. |
| `css/reportes.css` | Resultados en tarjetas crema, importes verdes y marcadores caramelo. Se conserva la corrección de filtros y límites de ancho. |
| `css/usuarios.css` | Tema cálido para alta de usuarios y seguridad; rol resaltado en verde suave. Sin cambios de visibilidad, permisos ni anchos de campos. |
| `css/inicio-mueblex.css` | Cerrar sesión con fondo crema contrastado, letra de 15 px y negrita, icono de 20 px, altura mínima de 52 px y foco visible. No cambia su comportamiento ni el diseño de Inicio. |
| `INFORME-AJUSTES-COMPACTOS.md` | Este informe actualizado. |
| `MANIFIESTO-AJUSTES-COMPACTOS.json` | Registro actualizado de archivos modificados e intactos. |

**Archivos creados: ninguno. Archivos eliminados: ninguno.**

## Conservación

`index.html` y todos los archivos JavaScript se conservan idénticos a la entrega anterior. El login circular y su CSS no cambian. Se conservan el buscador, el resumen de Inicio, los formularios, tablas, botones, IDs, reglas de Supabase, autenticación y permisos. Esta revisión es exclusivamente visual: no introduce consultas ni escrituras ni modifica datos.

El diseño sigue adaptándose a pantallas pequeñas mediante las mismas reglas anteriores. No se cambian los anchos de campos ni la disposición corregida de Clientes, Pedidos o Reportes. Los nuevos colores se limitan a `#seccion-app`; el tema de los módulos no afecta al login.

## Verificación

- Comparación binaria: únicamente cambian los ocho CSS listados y los dos documentos de registro.
- HTML y cinco JS idénticos, incluyendo los manejadores de cerrar sesión y búsqueda.
- CSS del login idéntico.
- Revisión estructural del CSS agregado: bloques y paréntesis equilibrados, declaraciones estructuradas, IDs existentes y alcance limitado al panel.
- Contraste calculado de texto/fondo: Cerrar sesión **8.01:1**; botones principales **7.50:1**, ambos superiores a 4,5:1. Este cálculo no sustituye una auditoría de accesibilidad completa.
- ZIP verificado por integridad y cotejo de cada archivo final.

La revisión visual en un navegador continúa pendiente por las restricciones del entorno documentadas en entregas anteriores. No se probaron operaciones reales con Supabase en esta revisión; su código no cambia.

## Uso

Descomprimir el ZIP completo, abrir `sistema-ventas-mueblex-completo` en Visual Studio Code y servir `index.html` como antes. Al actualizar una instalación, copiar los CSS modificados y recargar sin caché. No requiere migraciones, dependencias nuevas ni cambios de configuración.

La imagen ambiental generada en la entrega anterior permanece en `assets/interior-mueblex.png`, sin modificaciones.
