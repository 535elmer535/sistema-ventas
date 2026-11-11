# Estado actual de Melanova

Referencia documental consolidada: **11/11/2026**. Se contrastaron los 34 Markdown originales, index.html, módulos y SQL del ZIP del usuario. No se consultó ni modificó la base remota durante esta corrección.

## Cómo leer la documentación

- README, requerimientos (03), historias (04), casos de uso (05), modelo (06), interfaz (07) y manual describen el sistema actual según los archivos.
- Las guías de implementación y sus capturas conservan la evidencia de cada etapa. Una frase antigua de pendiente no anula un resultado posterior documentado.
- Este archivo consolida esos estados. Los requisitos y las pruebas describen lo esperado; una casilla de prueba pendiente no se convierte en aprobada por existir el código.
- Los identificadores técnicos con mueblex se conservan por compatibilidad. No son errores de marca que deban renombrarse automáticamente.

## Funciones y trazabilidad

| Función | RF | HU | CU | Referencias |
| --- | --- | --- | --- | --- |
| Registro de catálogo | 01 | 03 | 03 | productos.js; guías 11, 13 y 15 |
| Consulta de existencias | 02 | 02 | 02 | productos.js; CP-07 histórico |
| Ventas de stock y pedidos | 03 | 01 | 01 | ventas.js; CP-01 y ampliaciones registradas |
| Reportes monetarios y muebles vendidos | 04 | 04 | 04 | ventas.js; guía 16; CP-20 nuevo |
| Uso móvil | 05 | 05 | 05 | guía 23 y capturas de etapas posteriores |
| Avisos de stock | 06 | 06 | 06 | productos.js; CP-19 incluye el indicador de Inicio |
| Comprobantes y taller | 07 | 07 | 07 | ventas.js; manual |
| Clientes | 08 | 08 | 09 | clientes.js; entrega complementa RF-12 |
| Historiales | 09 | 09 | 12 | ventas.js |
| Cobros | 10 | 10 | 13 | ventas.js; SQL de cobros |
| Avance de taller | 11 | 11 | 14 | SQL de taller y ventas.js |
| Datos de entrega | 12 | 12 | 09, 14 | SQL de entrega y ventas.js |
| Precio y reposición | 13 | 13 | 10 | productos.js; falta respaldar la función de precio remota |
| Anulación y devolución | 14 | 14 | 15 | ventas.js y devoluciones-mueblex.js |
| Alta administrativa de cuentas | 15 | 15 | 11 | registrar-usuario; guía 22 |
| Solicitudes comerciales inciertas | 16 | 16 | 16 | ventas.js; recuperación local por cuenta y origen |
| Categorías | 17 | 17 | 17 | categorias.js; guía 22; CP-15 y CP-16 |
| Recuperación de acceso | 18 | 18 | 18 | recuperacion-mueblex.js; gestionar-recuperacion; CP-17 y CP-18 |
| Resumen de Inicio | 19 | 19 | 19 | inicio-mueblex.js; CP-19 |

Los números remiten a RF-xx / HU-xx / CU-xx. No se renumeraron los existentes. RNF-07 añade el objetivo de respaldo y restauración comprobada, todavía pendiente.

## Evidencia histórica disponible

- Guías 21 y 22: el usuario confirmó el cierre y guardado; categorías y registro administrativo tienen pruebas documentadas con distintos roles.
- Guía 23: publicación, venta 22 por Bs 240, descuento de 2 a 0 unidades y rechazo sin sesión; uso móvil confirmado. Cierre registrado en commit 6253810.
- Guía 24: manual y documento de cierre; el usuario mostró commit 9ba7e31 y su publicación en Netlify. El ensayo de presentación de 3 a 5 minutos es una estimación, no un ensayo medido.
- Recuperación de acceso: flujo básico local con contraseña temporal, cambio obligatorio, rechazo de la temporal y dos eventos de historial; rechazo al vendedor para listar; comprobaciones móviles registradas.
- La identidad y los datos de prueba de esas capturas pertenecen a su fecha. No se trasladan sus resultados automáticamente a una nueva instalación.

## Verificación de este paquete

- Sintaxis de 16 archivos JavaScript comprobada.
- Ocho escenarios automatizados simulados del reporte de muebles vendidos aprobados; no realizaron operaciones remotas.
- Modelo actualizado con doce tablas públicas identificadas en código y SQL; no sustituye una exportación del esquema remoto.
- Cuatro enlaces corregidos por diferencia entre .png y .PNG; enlaces locales y recursos de index.html revisados.
- Ningún cambio de diseño, permisos, SQL existente o datos del negocio en esta actualización. El cambio de comportamiento está limitado a consultar por lotes el reporte de muebles vendidos.

## Pendientes reales

1. Obtener esquema, datos y configuración vigentes de Supabase y comprobar restauración en un entorno separado (CP-21). Los scripts incrementales y el esquema de respaldo de funciones no son un respaldo completo.
2. Completar en la instalación real las comprobaciones adicionales de recuperación de acceso que conserva recuperacion-whatsapp.md (CP-18), y repetir el flujo completo desde Netlify (CP-17).
3. Cotejar todos los indicadores del Inicio con datos conocidos (CP-19); repetir navegación y operaciones después de cambiar diseños y registrar dispositivos y navegadores.
4. Renovar capturas del manual al aprobar el diseño. Las capturas existentes no fueron inventadas ni sustituidas por imágenes que no se hayan probado.
5. Confirmar funcionamiento del reporte corregido en el navegador y, cuando proceda, con un historial grande real. Las consultas por lotes no son una instantánea transaccional: rechazan variaciones detectables de conteo e identificadores, pero no garantizan detectar toda modificación simultánea. Para grandes volúmenes, conviene una agregación SQL autorizada.
6. Guardar esta actualización en Git al terminar, enviarla a GitHub y comprobar el despliegue de la nueva versión. Este paquete no ejecutó esos pasos.

## Decisiones futuras, no implementadas

Asociar cliente a venta de stock; desactivar personal con protección del último administrador; agregación del resumen en servidor; costos/gastos y ganancia; ajustes de inventario por daños; devoluciones parciales. Definir cada regla antes de implementarla. No son requisitos terminados por una corrección documental.

Ver [instalación y respaldo](instalacion-y-respaldo.md), [plan de pruebas](18-plan-pruebas.md) y [manual](manual-usuario.md).
