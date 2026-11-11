# Guía 23 — Publicación de Melanova

> Registro histórico de esta etapa. Las fechas, cantidades de pruebas y pendientes que aparecen abajo corresponden a su momento; no son una certificación de la versión actual. Consulta [estado-actual-melanova.md](estado-actual-melanova.md) para el estado consolidado.


## Estado

Sistema publicado en Netlify y probado por el usuario el 9 de noviembre de 2026.
La documentación se guardó y subió a GitHub con el commit 6253810. Las capturas
compartidas confirmaron el árbol de trabajo limpio y la publicación automática
de ese mismo commit en Netlify.

- URL pública: https://mela-nova.netlify.app
- Proyecto Netlify: mela-nova.
- Equipo de Netlify: emprendimiento.
- Repositorio: sistema-ventas.
- Rama publicada: main.
- Commit de la publicación inicial: a455a47.
- Marca elegida: Melanova. La interfaz conserva el nombre MUEBLEX; el cambio visual
  de marca y la elección del logo se realizarán después.

## Actividad A — Publicación

Se importó el repositorio de GitHub y Netlify mostró el estado Published.
Se utilizó esta configuración:

| Campo                           | Valor                                                              |
| ------------------------------- | ------------------------------------------------------------------ |
| Base directory                  | Vacío, raíz del repositorio                                        |
| Build command                   | Vacío: HTML, CSS y JavaScript sin compilación                      |
| Publish directory               | Un punto: .                                                        |
| Functions directory             | Valor predeterminado netlify/functions, sin funciones propias allí |
| Variables de entorno de Netlify | No se añadieron para esta publicación                              |

Las funciones registrar-usuario y gestionar-recuperacion continúan desplegadas en
Supabase. La publicación de la página no crea una base de datos nueva: Live Server
y Netlify consultan el mismo proyecto de Supabase.

Antes de publicar, el usuario confirmó que había cambiado las contraseñas que
estaban repetidas. Las contraseñas no se recopilaron ni se incluyen aquí.

## Actividad B — Pruebas de la página publicada

### Acceso y carga general

El usuario abrió la URL pública, inició sesión y confirmó la carga de Inventario,
Ventas, Pedidos, Clientes, Reportes y Administración sin fallos funcionales.

### CP-01 — Variante ejecutada con administrador

El plan original pide una sesión de vendedor. Esta ejecución fue realizada por
el administrador elmer, que figura como responsable en la interfaz y en Supabase.
Se documenta como variante administrativa de la venta válida, sin afirmar que
se repitió también la precondición de vendedor en la URL publicada.

| Dato               | Resultado observado                                    |
| ------------------ | ------------------------------------------------------ |
| Venta              | 22                                                     |
| Producto           | 6 — Mueble de prueba sin stock                         |
| Responsable        | elmer                                                  |
| Cantidad           | 2                                                      |
| Precio unitario    | Bs 120                                                 |
| Total y subtotal   | Bs 240                                                 |
| Existencia inicial | 2, confirmada por el usuario                           |
| Existencia final   | 0, comprobada en Inventario y Supabase                 |
| Operación          | Activa                                                 |
| Pago               | Pendiente                                              |
| Pagos asociados    | 0                                                      |
| Saldo por cobrar   | Bs 240                                                 |
| Lista temporal     | Vacía y total del formulario Bs 0 después de confirmar |

La consulta de lectura en Supabase confirmó venta, responsable, detalle, importes,
existencia y ausencia de pagos. No se registró un cobro para esta prueba.

**Resultado:** la variante ejecutada confirmó la venta y descontó exactamente
las dos unidades disponibles, sin generar un pago automático.

### CP-04 — Intento de venta sin sesión

Después de cerrar sesión y recargar la URL pública, apareció el inicio de sesión.
El código de prueba comprobó la ausencia de sesión antes de llamar directamente a
registrar_venta_stock.

- Solicitud: e3abd3ee-ecac-4ade-9546-6b771179f8a4.
- Producto: 5, cantidad 1, precio 30000 centavos.
- Respuesta: HTTP 401, código PostgreSQL 42501, resultado null.
- Mensaje: permission denied for function registrar_venta_stock.
- Consulta posterior en Supabase: ventas_creadas = 0 y existencia_actual = 2.

**Resultado:** el intento fue rechazado y no creó una venta ni descontó existencias.
El error rojo de esa solicitud fue el rechazo esperado de la prueba de seguridad.

### Vista móvil

El usuario confirmó que la página publicada se puede utilizar en móvil tras
revisar el acceso, el menú, Inventario, Ventas y Administración. No se registró
otra venta para esta comprobación. No se afirmó un modelo de teléfono ni un tamaño
concreto, porque el usuario no especificó cuál utilizó en esta prueba publicada.

### Consola y diferencias observadas

Tras recargar, el navegador mostró cinco advertencias Permissions-Policy relativas
a funciones publicitarias no reconocidas: attribution-reporting,
private-aggregation, join-ad-interest-group, run-ad-auction y browsing-topics.

La respuesta principal de la web se comprobó con HTTP 200 y sin esa cabecera.
No se identificó con certeza el recurso que origina las advertencias. No se
ocultaron ni se modificaron permisos para silenciarlas. El usuario confirmó que
las secciones funcionaban; la venta y la restricción sin sesión se comprobaron
además en Supabase. Estas advertencias no se presentan como un error corregido.

La recuperación por WhatsApp y el cambio obligatorio ya se habían probado en
Live Server antes de publicar; esta guía no afirma que se repitió todo ese flujo
contra Netlify.

## Actividad C — README

El README incluye una sección Demo en vivo con la URL pública y el estado del
proyecto. El archivo se incluyó en el commit 6253810. La revisión local de la
Guía 24 confirmó que conserva el enlace correcto; no se registró una comprobación
separada de abrir ese enlace desde la interfaz de GitHub.

## Actividad D — Guardado y publicación automática

- [x] Commit y push de esta documentación: 6253810.
- El push confirmó el envío del commit que contiene el README y este documento; no se documentó una inspección separada de ambos archivos en la interfaz de GitHub.
- Comprobación adicional no registrada: abrir desde la interfaz de GitHub el enlace de Demo en vivo. La URL pública sí se abrió y se probó.
- [x] Netlify mostró publicado el commit 6253810.
- [x] La captura de git status confirmó el árbol de trabajo limpio después del push.

## Reflexión

El acceso a los datos y las operaciones comprobadas se comportaron como en local:
se registró una venta con el total esperado y se rechazó una solicitud sin sesión.
La diferencia observada fueron las advertencias de Permissions-Policy al recargar
la publicación. Son un aspecto de compatibilidad del entorno publicado cuyo origen
sigue pendiente de identificar; no se atribuyen sin evidencia a una guía anterior.

Probar la URL pública permitió comprobar el resultado real de la publicación, en
lugar de suponer que bastaba con que funcionara en Live Server.

## Próximos pasos

- La Guía 24 se cerró después con el manual y el documento de cierre; se conserva aquí la evidencia de la publicación inicial.
- La marca y el logo ya se actualizaron a Melanova después de esta publicación inicial.
- Conservar los datos de prueba mientras se verifica el sistema. Antes de cargar
  operaciones reales, preparar un respaldo de Supabase y autorizar una limpieza
  controlada. No se ha realizado ni autorizado una limpieza de datos en esta guía.
