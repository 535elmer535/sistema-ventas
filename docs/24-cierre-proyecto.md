# Guía 24 — Cierre del proyecto Melanova

URL pública: https://mela-nova.netlify.app

Fecha de esta revisión: 9 de noviembre de 2026.

## Estado del cierre

La Guía 23 fue guardada y subida a GitHub con el commit 6253810. Las capturas compartidas muestran el árbol de trabajo limpio y el despliegue de ese mismo commit publicado en Netlify. La interfaz conserva la marca MUEBLEX; el cambio visual a Melanova queda para una mejora posterior.

El manual de usuario está en [manual-usuario.md](manual-usuario.md), acompañado de sus capturas. El usuario confirmó que las instrucciones y las imágenes se ven bien. Este documento de cierre se completa por bloques; no declara terminada la Guía 24.

## Actividad B — De la necesidad del negocio a la prueba

Esta relación permite localizar por qué existe una función, dónde se documentó y con qué prueba se comprobó. Los dos requisitos elegidos figuran como «Debe tener» en el documento de requerimientos.

| Necesidad / requerimiento | Historia de usuario | Caso de uso | Tablas involucradas | Guía de implementación | Prueba y resultado documentado |
| --- | --- | --- | --- | --- | --- |
| RF-02: consultar el nombre, precio y existencias de los muebles antes de ofrecerlos. | HU-02: como vendedor, consultar existencias antes de ofrecer un mueble. | CU-02: consultar existencias. | productos; usuarios y Supabase Auth intervienen en el acceso autorizado. | Guía 11: listado de muebles; Guías 14 y 15: acceso y permisos. | CP-07, ejecución del 28/10/2026: el vendedor consultó el producto 6, a Bs 120 y con 5 unidades; la interfaz coincidió con Supabase y la lectura posterior confirmó que no se modificó el producto. Resultado registrado: pasó. |
| RF-03: registrar una venta con sus muebles, cantidades y responsable, descontando las existencias como una sola operación. | HU-01: como vendedor, registrar ventas y pedidos. Esta fila se centra en el flujo de venta de stock. | CU-01: registrar una venta de stock o un pedido a medida; flujo principal de venta de stock. | ventas, detalle_ventas, productos y usuarios. pagos se consultó para comprobar que no se generó un cobro automático. | Guía 12: registro de venta; Guías 14 y 15: acceso y permisos. Guía 21 reorganizó el código sin cambiar el objetivo del flujo. | CP-01, ejecución del 28/10/2026: venta 14 del vendedor de prueba, 2 unidades del producto 7 a Bs 350, total Bs 700; existencia de 4 a 2 y ningún pago automático. Resultado registrado: pasó. En la Guía 23 se repitió la venta válida con administrador: venta 22, Bs 240 y existencia de 2 a 0. |

### Protección adicional del registro de ventas

En la URL pública se ejecutó CP-04 sin sesión: el servidor rechazó registrar_venta_stock con HTTP 401 / código 42501. La consulta posterior confirmó cero ventas para la solicitud y existencia 2 sin cambios en el producto 5. Esto verifica el rechazo de ese intento concreto; no equivale a comprobar todos los permisos y escenarios posibles.

### Documentos consultados

- [Requerimientos y prioridades](03-requerimientos.md).
- [Historias de usuario](04-historias-usuario.md).
- [Casos de uso](05-casos-uso.md).
- [Modelo de datos](06-modelo-datos.md).
- [Listado de muebles](11-listado-productos.md).
- [Registro de venta](12-registrar-venta.md).
- [Plan de pruebas](18-plan-pruebas.md).
- [Resultados de las pruebas](19-ejecucion-pruebas.md).
- [Publicación y pruebas en Netlify](23-publicacion.md).

Los valores anteriores son resultados históricos de pruebas, no las existencias actuales. En el resumen inicial del modelo aparece detalle_venta en singular; las consultas verificadas y el apartado de atributos usan el nombre real detalle_ventas, empleado aquí.

## Actividad C — Explicación breve del proyecto

Este guion puede usarse para presentar el sistema o explicar su funcionamiento a un trabajador. Describe las funciones del negocio y los resultados comprobados.

### 1. Problema del negocio

Una mueblería necesita saber qué muebles tiene disponibles, qué se vendió y cuánto falta cobrar. También necesita conservar las medidas de los pedidos a fabricar y conocer su avance para atender correctamente al cliente.

### 2. Solución

Melanova reúne inventario, clientes, ventas, pedidos a medida, cobros y reportes en una página web. Cada trabajador entra con su cuenta y utiliza las opciones permitidas para su función; las tareas de administración tienen controles adicionales.

### 3. Diseño y organización

El menú separa las tareas del negocio para encontrar con facilidad Inventario, Ventas, Pedidos, Clientes, Reportes y Administración. Los datos se guardan en Supabase, relacionando cada venta con sus muebles, responsable y pagos para conservar el historial.

### 4. Recorrido de demostración

Primero se consulta Inventario para conocer precio y disponibilidad, y después se abre el detalle de una venta existente para ver muebles, total y saldo. Luego se muestra un pedido a medida con sus especificaciones y estado del taller, y se termina en Reportes para distinguir lo vendido, lo cobrado y lo devuelto.

Para este recorrido se pueden consultar registros de prueba existentes sin crear ventas, modificar existencias ni registrar pagos nuevos.

### 5. Calidad y seguridad comprobadas

Las pruebas documentadas compararon la información de la página con Supabase y verificaron ventas, descuentos de existencias y restricciones de acceso. Por ejemplo, la venta 22 guardó dos unidades a Bs 120 y dejó la existencia en cero; un intento posterior sin sesión fue rechazado y no creó una venta.

### 6. Estado actual y continuación

El sistema está publicado en Netlify y cuenta con un manual de usuario. Se mantienen datos de prueba; el cambio visual a Melanova, otras mejoras y la preparación para cargar datos reales continuarán después del cierre de las guías.

## Preguntas y respuestas para explicar las decisiones

### 1. ¿Por qué se separaron los datos en varias tablas?

Porque representan cosas diferentes: un cliente no es una venta y una venta puede incluir varios muebles y varios pagos. Separar clientes, productos, ventas, detalle_ventas y pagos permite relacionarlos sin repetir toda la información en cada registro y conservar el detalle de lo ocurrido.

### 2. ¿Cómo sabemos que el sistema responde a las necesidades del negocio?

La tabla de la Actividad B relaciona necesidades concretas con sus historias de usuario, funciones y pruebas. Por ejemplo, consultar existencias se comprobó comparando la página con Supabase, y registrar una venta se comprobó revisando su total y el descuento de las unidades vendidas.

### 3. ¿Qué pasa si dos personas intentan vender el mismo mueble?

El registro de la venta comprueba las existencias vigentes en el servidor y guarda la venta junto con el descuento como una sola operación. La prueba CP-14 documentada en la Guía 19 preparó dos intentos para la última unidad: el primero se registró y el segundo se rechazó; esa comprobación no sustituye pruebas de carga con muchos usuarios simultáneos.

### 4. ¿Qué evidencia tenemos de que funciona?

Hay resultados de pruebas, capturas y consultas de comprobación en Supabase. En la página publicada se verificaron la venta 22 por Bs 240, la existencia final cero y el rechazo de una venta sin sesión; el manual también muestra las pantallas reales del sistema.

### 5. ¿Por qué se publicó en Netlify?

El proyecto utiliza HTML, CSS y JavaScript y se puede publicar sin un proceso de compilación. Netlify permite conectarlo con GitHub y publicar los cambios enviados al repositorio; Supabase sigue gestionando la base de datos, el acceso y las funciones del servidor.

## Estado del ensayo de presentación

Duración estimada de la presentación: **de 3 a 5 minutos**. Este intervalo es una estimación de planificación, no un tiempo medido en un ensayo.

Se preparó el guion escrito. No se ha realizado ni cronometrado un ensayo de presentación durante este bloque. Para el uso del negocio se conserva como material de explicación; si se necesita acreditar el ensayo solicitado por el curso, seguirá pendiente hasta realizarlo.

## Reflexión personal

Este fue mi primer proyecto de este tipo y me costó entender el proceso en general. No hubo una sola parte difícil: todo era nuevo para mí y tuve que avanzar paso a paso para ir comprendiendo cómo se construye el sistema.

Si empezara otro sistema, prepararía mejor las tablas de la base de datos desde el principio. Dedicaría más tiempo a pensar qué información necesita guardar el negocio y cómo se relacionan esas tablas, para tener una base más clara antes de continuar con las demás funciones.

## Revisión final y guardado

- Si se requiere completar el ensayo del curso, practicar la demostración y anotar el tiempo realmente empleado.
- Revisión local de documentación realizada: manual, imágenes y documentos enlazados accesibles; README con URL pública correcta.
- Pendiente: guardar y subir la Guía 24 en Git y confirmar la publicación automática en Netlify.

## Uso posterior del proyecto

Terminar esta guía no impide seguir añadiendo funciones, cambiar el diseño o actualizar la marca. Los datos actuales son de prueba. La carga de datos reales y cualquier limpieza se realizarán por separado, con respaldo y autorización del usuario.
