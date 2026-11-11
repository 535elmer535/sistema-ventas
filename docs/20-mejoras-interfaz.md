# Guía 20 — Mejoras de interfaz y experiencia de Mueblex

> Registro histórico de esta etapa. Las fechas, cantidades de pruebas y pendientes que aparecen abajo corresponden a su momento; no son una certificación de la versión actual. Consulta [estado-actual-melanova.md](estado-actual-melanova.md) para el estado consolidado.


**Estado al cierre de las pruebas:** mejoras aplicadas y verificaciones descritas completadas; pendiente revisar git status, hacer commit y push en la PC del usuario. Las notas iniciales de pendientes se conservan como registro cronológico y sus resultados posteriores se detallan en cada sección.

## 1. Entorno y alcance

- Fecha de revisión inicial: 04/11/2026.
- Proyecto: Mueblex, aplicación de gestión de una mueblería de melamina.
- Entorno observado: Chrome DevTools, modo Responsive, viewport de 390 × 844 píxeles CSS.
- Cuenta utilizada para las pantallas internas: elmer, Administrador.
- Pantallas revisadas inicialmente: inicio de sesión, Inventario, Ventas y Reportes.
- Esta primera revisión es visual, a partir de capturas de la aplicación actual. No equivale a una prueba en un teléfono físico ni a una medición automática de accesibilidad.

## 2. Actividad A — Estado inicial en modo móvil (3.2)

### Inicio de sesión

- El formulario circular cabe en el ancho mostrado.
- Los textos de los campos, Recordarme y recuperación de contraseña se ven pequeños y claros sobre un fondo también claro. Revisar tamaño y contraste antes de ajustar los estilos; todavía no se midió una relación de contraste.
- La pantalla combina textos en español con Login, Sign in to your account y SIGN IN. Revisar su coherencia con el idioma del sistema.

### Navegación común

- El menú se presenta completo encima del contenido, con enlaces en dos columnas, imagen decorativa y cierre de sesión.
- Ocupa aproximadamente la mitad de la altura visible. Después aparecen la cuenta y el buscador; el contenido de cada módulo comienza cerca del borde inferior de la primera pantalla.
- Esto obliga a desplazarse bastante para llegar a las tareas de Inventario, Ventas o Reportes. Evaluar una navegación móvil más compacta que conserve el acceso a todos los módulos.
- Los enlaces del menú y el botón Cerrar sesión son visibles en las capturas.

### Inventario

- Los formularios visibles de reposición se apilan y sus controles caben en la pantalla.
- El historial de reposiciones y la tabla de existencias no muestran todas sus columnas a la vez.
- Nombres y fechas se dividen en muchas líneas; en la tabla de existencias algunas palabras se parten dentro de la propia palabra. Las filas quedan muy altas y cuesta comparar registros.
- Revisar el ancho mínimo de las columnas y el desplazamiento horizontal de cada tabla. Una tabla desplazable es una solución válida si permite consultar todos los datos y acciones con claridad; no es necesario comprimir todas las columnas en 390 píxeles.

### Ventas

- Se repite el problema de espacio ocupado por la navegación antes del formulario.
- La lista temporal y el historial muestran desplazamiento horizontal. Varias columnas quedan fuera de la zona visible inicialmente.
- Las fechas del historial se parten en varias líneas, incluso dentro del año, dificultando su lectura.
- Con la lista vacía, el total muestra Bs 0.00 y Confirmar venta tiene una apariencia distinta de los botones habilitados. Es un comportamiento visual correcto que debe conservarse.
- No se registró una venta para esta revisión visual. Las capturas no permiten evaluar todavía el formulario completo, los mensajes durante el guardado ni una lista con muebles agregados.

### Reportes

- Los filtros visibles se apilan; Hasta y Consultar ventas caben en la pantalla.
- Los bloques de ventas, dinero cobrado, devoluciones y neto se muestran en una columna. Los importes y sus explicaciones son legibles en las capturas.
- La lista de operaciones y los nombres de muebles se ajustan en varias líneas dentro de sus contenedores, sin observarse pérdida de texto en esas listas.
- La tabla por método de devolución muestra una barra horizontal. Comprobar su comodidad y si puede aprovechar mejor el ancho disponible.
- El reporte tiene bastante contenido vertical. Esto, por sí solo, no es un error: deben conservarse las explicaciones y distinguir claramente sus secciones.
- También se repite el menú alto antes del contenido principal.

### Evidencias de la revisión inicial

Las siguientes capturas se revisaron en la conversación. Su envío no implica que se hayan guardado automáticamente en la carpeta diagramas del proyecto.

| Pantalla | Capturas recibidas |
| --- | --- |
| Login | image(20261104-144055).png |
| Inventario | image(20261104-144431).png, image(20261104-144446).png, image(20261104-144502).png, image(20261104-144514).png |
| Ventas | image(20261104-144732).png, image(20261104-144744).png, image(20261104-144854).png |
| Reportes | image(20261104-145007).png, image(20261104-145020).png, image(20261104-145037).png, image(20261104-145050).png, image(20261104-145100).png |

## 3. Actividad B — Adaptación responsive (3.3)

**Estado: completada la verificación de las pantallas principales a 390 px, formulario de venta a 320 px, cambio de menú entre 699/700 px y vista de Inventario a 1280 px.**

Se utilizó el ZIP sistema-ventas(1).zip enviado el 04/11/2026. El usuario confirmó que la integración adicional de administración y recuperación por WhatsApp todavía no forma parte de esta versión. Esa integración queda para después.

### Cambios preparados

- **index.html:** enlaza css/responsive.css al final de las hojas de estilo y añade el botón Menú asociado al identificador del menú existente. Conserva los identificadores originales, formularios, enlaces de scripts y módulos.
- **css/responsive.css:** concentra los ajustes de esta actividad dentro de `@media (max-width: 699px)`. Compacta la cabecera del menú, ajusta formularios y paneles y conserva las palabras y fechas de las tablas en líneas legibles con desplazamiento horizontal local. Incluye ajustes de los módulos actuales, sin agregar funcionalidades nuevas de administración.
- **js/navegacion.js:** abre y cierra el menú móvil, lo cierra al elegir una sección o pulsar Escape y restablece su visibilidad cuando cambia el ancho entre móvil y escritorio. Al pulsar Escape devuelve el foco al botón. No registra operaciones ni modifica la sesión.
- **Login móvil:** sustituye las medidas circulares fijas por una tarjeta flexible con esquinas redondeadas y controles legibles, para no encoger las letras ni recortar mensajes. El círculo de escritorio conserva sus estilos originales.

Las tablas siguen mostrando todas sus columnas mediante desplazamiento horizontal. Se evita partir palabras y años para forzarlas a caber simultáneamente en el ancho del teléfono. No se ocultaron columnas de datos ni acciones.

### Comprobaciones realizadas en la copia de revisión

- Sintaxis de js/navegacion.js y js/app.js verificada con Node.
- 195 comprobaciones sobre la navegación usando un DOM simulado: estado inicial móvil/escritorio, apertura, cambio de sección, cierre, Escape y foco, cambios a ambos lados de 699 px y vuelta a Inicio al mostrarse la aplicación. Estas comprobaciones no prueban el aspecto ni el tamaño final de los elementos.
- Identificadores HTML originales conservados y sin duplicados; hojas de estilo locales existentes y nueva hoja enlazada al final.
- Reglas de la nueva hoja delimitadas al ancho máximo de 699 px.
- Comparación de archivos con el ZIP: los archivos de operaciones, conexión a Supabase y los demás estilos existentes permanecen iguales. Los únicos archivos existentes modificados son index.html y js/navegacion.js, además de este documento; responsive.css es nuevo.

**Límite de verificación:** no se pudo abrir la copia local en el navegador de pruebas disponible. No se presentan capturas del resultado ni se afirma que ya se haya comprobado visualmente en móvil o escritorio. La validación siguiente se realizará en el Chrome del usuario, con su versión real de Mueblex.

### Primera verificación visual recibida después de aplicar los cambios (04/11/2026)

- Login: el formulario y sus controles caben en la pantalla, con campos y texto mayores que en la referencia inicial. Evidencia: image(20261104-152722).png. El contraste y el idioma siguen pendientes de la actividad C.
- Inicio: se observa la cabecera de navegación compacta y el botón Menú; las tarjetas se distribuyen en dos columnas, las acciones rápidas en una columna y el catálogo en dos. Se detectó que la imagen dificultaba leer parte del texto de bienvenida.
- Apertura del menú: se muestran los enlaces y Cerrar menú. Se detectó que Cerrar sesión aparecía antes de la marca por heredar grid-row: 1 de una regla anterior.
- Inventario: las capturas muestran nuevamente el menú cerrado, el formulario dentro del ancho disponible y las tablas con nombres y fechas completos y barras de desplazamiento horizontal. Falta comprobar visualmente el extremo derecho y el acceso a sus acciones.
- Evidencias: image(20261104-152943).png, image(20261104-152957).png, image(20261104-153010).png, image(20261104-153037).png, image(20261104-153126).png, image(20261104-153146).png e image(20261104-153201).png.

**Ajustes de seguimiento preparados en responsive.css:** restablecer grid-row: auto para Cerrar sesión en móvil, permitiendo que aparezca después del menú; extender el fondo claro sobre la imagen de bienvenida para facilitar la lectura. Pendiente confirmar su resultado tras reemplazar esa hoja y recargar en la PC del usuario. Ninguno de estos ajustes cambia los estilos de escritorio.

### Verificación de los ajustes y del extremo derecho de las tablas (04/11/2026)

- Evidencias image(20261104-153619).png e image(20261104-153700).png: el texto completo de bienvenida se lee sobre el fondo aclarado y Cerrar sesión aparece debajo de los enlaces del menú abierto. Los dos ajustes móviles quedan confirmados visualmente a 390 × 844.
- Las capturas intermedias image(20261104-153632).png e image(20261104-153643).png conservan las acciones rápidas, catálogo y últimas ventas dentro de sus paneles.
- image(20261104-153936).png: al desplazar la tabla de Inventario hasta el extremo derecho se ven los botones Editar precio y Eliminar. El inicio de la columna de estado queda fuera de esa posición de desplazamiento; no significa que se hayan eliminado sus datos. No se pulsaron las acciones como parte de esta comprobación visual.
- image(20261104-154010).png: el historial de ventas permite llegar a Estado del pago y Ver detalle mediante desplazamiento horizontal. Esta captura no muestra el formulario de selección y confirmación de venta, cuya revisión sigue pendiente.
- image(20261104-154106).png, image(20261104-154121).png e image(20261104-154132).png: los bloques de cobros, devoluciones, operaciones y muebles más vendidos permanecen dentro del ancho. La tabla de cobros se muestra desplazada hacia la derecha; es necesario volver a su extremo izquierdo para leer los nombres completos de los métodos.
- Todavía no se han recibido evidencias del formulario de venta después del cambio ni de esta versión a 320 px o en escritorio. No se marca la actividad B como finalizada.

### Lista de verificación usada después de copiar los archivos

1. A 390 × 844, comprobar login, menú cerrado/abierto, Inventario, Ventas y Reportes, comparando con las evidencias de antes.
2. Confirmar que se puede desplazar cada tabla hasta su última columna, que las fechas se leen completas y que el desplazamiento de la tabla no ensancha la página.
3. Revisar que los formularios y el panel de edición permanecen dentro de la pantalla; revisar también Pedidos y Clientes.
4. Comprobar otro ancho pequeño, por ejemplo 320 px, y los anchos 699 y 700 px para verificar el cambio de navegación.
5. Volver a escritorio y comprobar que el menú lateral completo y el diseño original se mantienen.
6. Registrar las observaciones reales y las capturas de después antes de marcar esta actividad como completada.

### Verificación de anchos y cierre de la actividad B (04/11/2026)

- A 320 × 844 se recibieron capturas del formulario de Ventas con selector de producto, cantidad y Agregar mueble dentro del panel; la tabla temporal conserva su desplazamiento local. Evidencias: image(20261104-154621).png e image(20261104-154643).png.
- A 699 × 844 se comprobaron las dos posiciones del menú móvil, abierto y cerrado. Evidencias: image(20261104-154742).png e image(20261104-154758).png.
- A 700 × 844 se observa de nuevo el menú lateral completo y el formulario de Ventas. Evidencia: image(20261104-154905).png.
- A 1280 × 844 Inventario mantiene el menú lateral y la distribución de escritorio. Evidencias: image(20261104-155007).png e image(20261104-155156).png.
- El usuario indicó un ligero movimiento lateral en Historial de reposiciones y aclaró que se mueven únicamente las filas y columnas. Se confirmó que es el desplazamiento de la tabla, no un movimiento del título, el botón o el panel completo; se conserva para consultar sus columnas.
- Alcance: se comprobó la adaptación de las pantallas principales solicitadas en la actividad. No se afirma una revisión visual completa de todos los formularios de detalle y de los módulos adicionales; su revisión de accesibilidad continúa en la actividad C y el reto.

## 4. Actividad C — Estados visuales y accesibilidad (3.4)

**Estado: etiquetas verificadas en código; login revisado en móvil y escritorio, navegación con Tab comprobada en login y estados de guardado de venta comprobados con éxito y rechazo confirmado. Quedan las comprobaciones adicionales indicadas abajo.**

### Etiquetas y coherencia de idioma

- Se añadieron asociaciones explícitas for/id en 38 etiquetas que envolvían controles y todavía no tenían for. Se conservaron los atributos de los controles y las asociaciones explícitas que ya existían.
- Se verificaron los 50 controles del HTML que no son de tipo hidden: todos tienen una etiqueta asociada explícitamente. No se exige una etiqueta visible a identificadores técnicos ocultos.
- En el login se añadieron etiquetas visibles persistentes para Correo electrónico y Contraseña. El encabezado, subtítulo y botón se presentan en español: Iniciar sesión, Accede a tu cuenta Mueblex e Ingresar.
- Los formularios generados de anulación sin cobros y devolución tienen IDs asociados a sus etiquetas; incluyen tipo de operación e identificador para distinguir venta/pedido. Se mantienen los nombres de los campos y la lógica de sus operaciones.

### Estilos preparados en css/accesibilidad.css

- Texto y placeholders del login más oscuros; enlace de recuperación subrayado; foco visible para campos, enlace y botón.
- Botones deshabilitados visualmente diferenciados de los habilitados, sin efectos de movimiento al pasar el mouse por el botón de login bloqueado.
- Se conservan los estados hover y foco de los botones internos, y se evita perder el contraste de la opción activa del menú al pasar el mouse.
- Texto oscuro y fondos más claros en las acciones rápidas Ver inventario y Pedido a medida.
- Casillas de confirmación de devolución con tamaño propio y disposición junto a su texto, sin aplicarles el ancho de un campo de texto.
- Administración ocupa una fila completa en el menú móvil, para evitar partir su nombre en pantallas angostas. No se añadieron funcionalidades ni se cambiaron permisos.
- Se respetan las preferencias de movimiento reducido en el login.

### Guardado de venta — comportamiento existente que se conserva

La revisión de js/app.js comprobó que guardandoVenta bloquea Agregar mueble, Confirmar venta, campos y acciones de quitar mientras se procesa la solicitud. El mensaje existente indica Guardando venta... y finally libera el estado de procesamiento.

La reactivación depende del resultado: tras el éxito, Confirmar venta queda deshabilitado si la lista está vacía; ante un rechazo confirmado se permite corregir o reintentar según la lista; si se desconoce si el servidor guardó la operación, ventaPorRevisar conserva el bloqueo y se ofrece la recuperación de la misma solicitud. No se fuerza a habilitar el botón tras un error de red porque eso permitiría duplicar una venta. Se conserva esta adaptación segura del requisito de la guía.

### Verificación local y límites

- Sintaxis de los archivos JavaScript comprobada con Node.
- Comparación de todos los controles del HTML antes/después: IDs, nombres, tipos y validaciones intactos. Ningún ID HTML duplicado.
- Ocho formularios dinámicos generados en una prueba local verificaron las asociaciones de etiquetas, identificadores distintos y restricción visual por rol; no se llamó a Supabase.
- Contraste calculado para pares planos concretos del CSS: texto secundario del login #595959 sobre #e8e8e8, 5.72:1; enlace #674020 sobre #e8e8e8, 7.35:1; texto de mensaje del login #842424 sobre #e8e8e8, 7.59:1; botón interno #fffdf4 sobre #365b49, 7.50:1. Estas mediciones de pares no equivalen a certificar la accesibilidad de toda la página.
- Las comprobaciones posteriores del login, estados de guardado y panel de edición se detallan abajo. La auditoría Lighthouse y su corrección se registran en el apartado 7. Quedan por confirmar el clic en las etiquetas del login y la revisión visual de módulos adicionales.

### Prueba visual de Confirmar venta con éxito (04/11/2026)

- Sesión de elmer, Administrador; viewport 390 × 844. Producto 6, Mueble de prueba sin stock, precio Bs 120 y existencia inicial 5. El nombre del producto no describe su existencia actual.
- Se agregó una unidad y se confirmó una sola vez con la simulación 3G activada.
- image(20261104-164119).png muestra Guardando venta..., campos bloqueados y Agregar mueble y Confirmar venta con su aspecto deshabilitado. El total de la línea es Bs 120.
- image(20261104-164147).png muestra Venta 19 registrada correctamente. Total: Bs 120.00. Las existencias se actualizaron. La lista quedó vacía y el total volvió a cero; Agregar mueble y los campos recuperaron su estado habilitado. Confirmar venta permaneció deshabilitado porque no había líneas para confirmar, que es lo esperado.
- Las consultas visuales de Inventario antes y después, image(20261104-163937).png e image(20261104-164244).png, muestran existencia 5 y luego 4 para el producto a Bs 120. El usuario confirmó expresamente ese cambio y restauró No throttling, visible en la última captura.
- Esta operación de prueba sí creó una venta y descontó una unidad; no se informa como una comprobación sin cambios en los datos. No se registró un cobro como parte de estas instrucciones.
### Prueba de rechazo por precio desactualizado y restauración (04/11/2026)

- Se preparó una unidad de Mueble de prueba sin stock en Ventas por Bs 120, sin recargar esa pestaña. En otra pestaña se cambió su precio a Bs 121. Evidencias: image(20261104-165351).png e image(20261104-165407).png; el inventario mantenía 4 unidades.
- Al confirmar una sola vez la venta preparada, apareció: “Cambió el precio de Mueble de prueba sin stock. Actualiza la lista antes de confirmar.” La línea y el total Bs 120 permanecieron visibles y Confirmar venta volvió a habilitarse. Evidencia: image(20261104-165510).png. Queda comprobada la reactivación tras este rechazo confirmado.
- Se restauró el precio a Bs 120 mediante Editar precio y Guardar cambios. Las capturas image(20261104-165653).png e image(20261104-165747).png muestran precio 120 y existencia 4 en escritorio y móvil, con No throttling visible en móvil. El rechazo no produjo un descuento adicional observable de existencias. No se consultó el listado de ventas ni la base de datos para verificar su conteo en esta comprobación.

### Verificación del login después de aplicar la actividad C

- image(20261104-160800).png: a 390 × 844 se observan el encabezado, subtítulo y botón en español, etiquetas visibles sobre los campos y enlace de recuperación subrayado. El contenido cabe en la tarjeta móvil.
- image(20261104-165944).png: fuera de la emulación móvil, el login conserva la presentación circular de escritorio. Encabezado, etiquetas, campos, Recordarme, enlace de recuperación y botón Ingresar caben dentro del círculo sin superponerse. Esta captura comprueba la distribución visual; no mide por sí sola contraste ni accesibilidad completa.
- image(20261104-161224).png muestra el foco visible en Contraseña. El usuario confirmó que Tab recorre todos los elementos y que la línea de foco indica dónde está. Esto comprueba navegación por teclado en el login; no equivale a auditar todos los controles del sistema.
- La activación de ambos campos mediante clic en el texto de sus etiquetas se solicitó, pero no se recibió una confirmación expresa por separado. La asociación for/id sí se verificó en el código.

## 5. Reto — Formulario de edición (3.5)

**Estado: completado; panel móvil, bloqueo durante el guardado, éxito y reactivación ante error comprobados.**

- El formulario Editar precio modifica el precio mediante actualizar_precio_mueble; la existencia actual es de lectura. Reponer existencias sigue siendo la operación para ingresar unidades.
- La lógica existente deshabilita Guardar cambios antes de la llamada al servidor y lo habilita en finally, tanto si la llamada tiene éxito como si lanza un error. No fue necesario sustituir esta lógica; se ajustaron las etiquetas y el aspecto del estado disabled.
- Con elmer, Administrador, se abrió el producto 8, Mueble última unidad CP14 20261028, a 390 × 844. El panel, sus campos y botones caben dentro de la pantalla. Evidencia: image(20261104-161535).png.
- Para observar el procesamiento se activó 3G en Chrome y se guardó el precio existente 100, sin cambiarlo. image(20261104-162622).png muestra Guardar cambios con el estilo deshabilitado y el mensaje Guardando precio... debajo del panel.
- image(20261104-162649).png muestra Precio actualizado correctamente y el producto con precio 100, existencia 0. El panel se cerró después del éxito. Esta captura no muestra el botón reactivado porque el formulario está cerrado; falta reabrirlo para comprobarlo directamente.
- Se reabrió la edición del mismo mueble con precio 100 y stock 0, se activó Offline antes de guardar y se pulsó Guardar cambios una vez. image(20261104-163208).png muestra el mensaje No se pudo confirmar el cambio. Recarga el inventario y consulta el precio antes de reintentar, y el botón nuevamente con su apariencia habilitada.
- Se indicó restaurar No throttling, recargar y consultar Inventario. El usuario confirmó expresamente que se conservaron precio y existencia (100 y 0). No se registró una venta, anulación o reposición durante esta prueba del formulario de edición.
- Resultado: la lógica existente con try/catch/finally y los estilos disabled cumplen el comportamiento esperado del reto. Se conserva el límite de verificación: no hubo una llamada nueva de venta en estas comprobaciones de edición; esa prueba corresponde a la actividad C.

## 6. Reflexión (3.7)

La regla real está en css/responsive.css: `@media (max-width: 699px)`. Sus estilos se aplican cuando el ancho disponible de la página es de 699 píxeles CSS o menos. No se refiere a la resolución física total del monitor ni al tamaño de las letras. En esta regla Mueblex compacta el menú, adapta los formularios y permite consultar tablas sin partir palabras.

En las pruebas a 699 px se mostró Menú y a 700 px volvió el lateral completo. Si se cambiara este punto de corte a 1200 px, la presentación móvil también aparecería en ventanas y pantallas bastante más anchas: el menú quedaría plegable y los ajustes móviles del login y formularios se activarían hasta ese ancho. No significaría que toda la página midiera 1200 px; cambiaría cuándo se aplican esas reglas. Si se modifica el CSS también habría que ajustar el matchMedia del menú en js/navegacion.js para conservar el mismo punto de cambio.

## 7. Desafíos opcionales (3.8)

El indicador de carga existente quedó comprobado visualmente mediante Guardando venta... y Guardando precio..., junto con sus controles deshabilitados. La adaptación al proyecto propio se realizó en Mueblex.

La auditoría Lighthouse del login, ejecutada por el usuario el 04/11/2026 con Mobile y Navigation, obtuvo 98 en Accessibility. Evidencia: image(20261104-170349).png. El informe muestra “Document does not have a main landmark”, 18 auditorías aprobadas y 10 comprobaciones manuales pendientes. El resultado corresponde al login visible, no a todos los módulos autenticados.

Se añadió role="main" al contenedor existente #seccion-login para identificar el contenido principal cuando se muestra el login. El panel autenticado ya tiene main#contenido-panel; el cambio conserva IDs, clases y comportamiento de visibilidad. El usuario aplicó el ajuste y repitió la auditoría: image(20261104-170647).png e image(20261104-170658).png muestran 100 en Accessibility, 22 auditorías aprobadas y 41 no aplicables; la advertencia de región principal desapareció. Permanecen 10 comprobaciones manuales recomendadas, que no son fallos automáticos detectados. Se completó el desafío de ejecutar Lighthouse y corregir una advertencia real. Este resultado corresponde al login y no certifica la accesibilidad integral de todos los módulos. Pedidos y Clientes se revisaron posteriormente en móvil, como se detalla en el apartado 8.

## 8. Referencia de código y entregable (3.9 y 3.10)

El código completo de ejemplo de la guía es una referencia. Los cambios deben integrarse en la estructura actual de Mueblex, que tiene módulos y operaciones adicionales.

Se integraron las mejoras en Mueblex conservando sus módulos. La evidencia recibida cubre los tamaños y pantallas descritos en las actividades B y C, el reto de edición y la auditoría del login.

### Revisión adicional de Pedidos y Clientes a 390 × 844 (04/11/2026)

- Pedidos: image(20261104-170925).png e image(20261104-170936).png muestran selección de cliente, descripción, medidas, color, cantidad, precio, fecha y botón Agregar mueble a medida dentro del panel. Los campos se distribuyen verticalmente con etiquetas visibles.
- image(20261104-170948).png muestra total, monto recibido, método del cobro y saldo dentro del ancho. Registrar pedido a medida aparece deshabilitado con la lista vacía, que es el estado esperado.
- image(20261104-170957).png muestra el historial de pedidos dentro del panel, con fechas sin partir en varias líneas. La tabla conserva el desplazamiento horizontal para consultar sus demás columnas.
- Clientes: image(20261104-171018).png muestra Nombre, Teléfono, Dirección opcional y Registrar cliente dentro del panel; image(20261104-171027).png muestra la lista con desplazamiento horizontal.
- Estas capturas verifican distribución visual; no se solicitó guardar pedidos o clientes en esta revisión. No demuestran una prueba completa de sus operaciones ni acceso a todas las columnas del extremo derecho.

### Archivos de la entrega

- index.html: enlaces a estilos, menú móvil, etiquetas y región principal del login.
- css/responsive.css: adaptación hasta 699 px.
- css/accesibilidad.css: contraste, foco, etiquetas y estados deshabilitados.
- js/navegacion.js: apertura, cierre y adaptación del menú.
- js/app.js y js/devoluciones-mueblex.js: asociaciones de etiquetas de formularios dinámicos.
- docs/20-mejoras-interfaz.md: observaciones, cambios, pruebas y reflexión.

### Límites de la revisión

El clic en las dos etiquetas del login no recibió confirmación expresa; sus asociaciones se comprobaron en código y Tab fue confirmado por el usuario. Lighthouse se ejecutó sobre el login; sus recomendaciones manuales no se consideran automáticamente aprobadas. No se realizó una auditoría integral con lector de pantalla ni pruebas en un teléfono físico. La integración adicional de administración y WhatsApp sigue fuera de esta entrega.

## 9. Actividad D — Commit y push (3.6)

Documento de pruebas actualizado y listo para incorporar al proyecto. Pendiente ejecutar git status en la PC del usuario, revisar los archivos modificados, realizar commit y push y comprobar la salida final. No se afirma que los cambios estén publicados hasta recibir esa confirmación.
