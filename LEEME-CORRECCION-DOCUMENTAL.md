# Melanova — Paquete corregido del 11/11/2026

## Cómo aplicarlo

1. Conserva tu ZIP original como respaldo de archivos.
2. Extrae este ZIP. Dentro está la carpeta sistema-ventas.
3. Copia su contenido dentro de tu carpeta del proyecto actual y acepta reemplazar los archivos del mismo nombre. No borres tu proyecto ni su carpeta oculta .git.
4. Este ZIP no incluye .git: se conserva el historial de Git que ya tienes en tu computadora. No ejecutes git init ni reemplaces .git.
5. Abre index.html con Live Server y recarga. No hace falta ejecutar SQL ni volver a desplegar funciones de Supabase para esta corrección.
6. Revisa docs/estado-actual-melanova.md y el manual. En Reportes pulsa Consultar muebles más vendidos y comprueba su resultado.
7. Al terminar la revisión, guarda los cambios con Git, súbelos y comprueba el nuevo despliegue en Netlify. Esos pasos no fueron ejecutados al preparar el ZIP.

## Qué cambió

Requerimientos, historias, casos de uso, modelo de doce tablas, interfaz, manual y estados de guías actualizados. Se conservan numeración y evidencia histórica. Se corrigieron cuatro rutas de capturas con mayúsculas/minúsculas. Se añadieron un estado consolidado, procedimiento de respaldo y CP-15 a CP-21.

En código cambian únicamente js/listados-melanova.js y js/ventas.js para consultar por lotes el reporte de muebles vendidos. Se añade tests/reporte-vendidos-melanova.cjs. Ocho escenarios simulados pasaron y los 16 archivos de js/ pasaron comprobación de sintaxis. No se repitió la batería anterior ni se ejecutaron pruebas remotas o visuales en este bloque.

## Lo que sigue pendiente

El respaldo completo requiere obtener información de Supabase y probar su restauración. No se inventó la función de precio ni el esquema remoto que no aparece completo en el ZIP. Tampoco se fabricaron capturas ni se dieron por aprobadas las pruebas pendientes. El ensayo de la guía conserva duración estimada, sin afirmar que se realizó.

No cambia el diseño ni se eliminan funciones existentes. No se modifica el documento Word de KOI Studio, que no forma parte de este proyecto ZIP.
