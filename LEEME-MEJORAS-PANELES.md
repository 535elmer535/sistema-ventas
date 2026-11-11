# Instalar las mejoras de Melanova

> Antecedente del desarrollo o instrucciones de su paquete original. No volver a instalarlo ni aplicar SQL para actualizar este ZIP. El estado vigente y los pendientes se indican en [Estado actual de Melanova](docs/estado-actual-melanova.md). Las descripciones del proceso manual inicial son contexto del planteamiento, no hechos verificables desde el código.


Este paquete contiene los archivos que debes agregar o reemplazar, no una copia completa del proyecto.

1. Conserva una copia de tu carpeta actual sistema-ventas.
2. Extrae Melanova-Mejoras-Paneles.zip.
3. Copia index.html y README.md a la raíz de sistema-ventas.
4. Copia el contenido de css, js, tests y docs dentro de las carpetas del mismo nombre del proyecto. Acepta reemplazar los archivos que ya existen; agrega los nuevos. No sustituyas una carpeta completa borrando su contenido anterior.
5. Abre index.html con Live Server y pulsa Ctrl + F5.
6. Comprueba las seis secciones, el buscador de las tablas y una cuenta de vendedor.

No hay SQL que ejecutar ni Edge Functions que desplegar para este paquete. No modifica credenciales ni datos de Supabase. Inicio y los archivos del diseño de acceso se conservan.

## Volver a la versión recibida

Extrae Melanova-Volver-Al-Diseno-Anterior.zip y copia sus archivos en el proyecto, reemplazando los del mismo nombre. Restaura index.html, README.md, productos.js, clientes.js y la prueba de recuperación anterior. Los archivos nuevos pueden permanecer: el index.html anterior no los carga. El respaldo se preparó a partir del ZIP enviado el 10/11/2026.

## Guardar después de probar

En la terminal de VS Code, dentro de sistema-ventas:

~~~text
git status
git add .
git commit -m "Mejora: paneles de Melanova y listados de muebles y clientes"
git push
git status
~~~

Comprueba que Netlify termine de publicar el nuevo commit. Hasta hacer el push, la web publicada conserva su versión anterior.

Detalles y verificaciones: docs/mejoras-paneles-melanova.md.
Mejoras funcionales que siguen pendientes: docs/respaldo-y-pendientes-melanova.md.
