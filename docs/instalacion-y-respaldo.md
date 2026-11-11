# Instalación y respaldo de Melanova

Estado al 11/11/2026: procedimiento preparado; respaldo y restauración completos aún no realizados. No ejecutar una limpieza ni reconstruir producción a partir de suposiciones.

## Qué contiene este ZIP

Interfaz HTML/CSS/JavaScript, funciones Edge y scripts SQL incrementales. Estos scripts suponen tablas y funciones creadas previamente. No son una instalación autocontenida desde cero.

Falta, como mínimo, el DDL completo del esquema inicial y la definición remota de actualizar_precio_mueble, llamada desde productos.js con p_id_producto, p_precio_centavos y p_precio_anterior_centavos. No se ha inventado una función de sustitución: podría eliminar validaciones o controles de acceso existentes.

## Qué obtener de la instalación actual

1. Exportación del esquema vigente: tablas, claves, índices, restricciones, secuencias, vistas, funciones, triggers, propietarios, RLS y permisos efectivos.
2. Respaldo de datos de negocio y estrategia específica para cuentas de Supabase Auth; un CSV público no contiene esas cuentas.
3. Código y configuración de las dos Edge Functions: registrar-usuario y gestionar-recuperacion. Guardar los secretos de forma privada; nunca dentro del ZIP público o Git.
4. Configuración de Authentication: altas públicas, proveedores, URLs autorizadas y ajustes necesarios para la instalación. Respaldar Storage por separado si se utiliza.
5. Copia de la interfaz y referencia de Git correspondiente al respaldo.

Usar la exportación/restauración soportada por Supabase o PostgreSQL y comprobar el resultado en un entorno de prueba independiente. No agregar service_role al navegador.

## Orden y precauciones

Los archivos mejora-01 a mejora-11b documentan la evolución sobre la base existente; las guías 15 y 22 contienen cambios de permisos de sus etapas. Reaplicarlos a ciegas puede reemplazar controles añadidos después. Para una instalación nueva, preferir el esquema vigente exportado y una lista de migraciones ya aplicadas, en lugar de ejecutar todas las guías nuevamente.

mejora-11-recuperacion-whatsapp.sql y SQL-Recuperacion-MUEBLEX.sql son copias del mismo ajuste: no aplicar ambas. mejora-11b conserva la corrección puntual del historial; comprobar su presencia en la versión instalada antes de ejecutarla.

La tabla privada de definiciones previas de funciones ayuda a esa migración; no sustituye un respaldo integral ni permite recuperar por sí sola los datos del negocio.

## Verificación de la restauración — CP-21

- [ ] Se obtuvieron esquema y datos de la instalación actual.
- [ ] Se restauraron en un entorno de prueba separado.
- [ ] Los recuentos y las relaciones corresponden a la copia respaldada.
- [ ] Las funciones comerciales, actualizar_precio_mueble y sus permisos están presentes.
- [ ] Administrador, vendedor y visitante conservan los accesos previstos.
- [ ] Ventas, pedidos, cobros y recuperación funcionan en la copia con datos de prueba.
- [ ] Se conserva el respaldo de forma privada y se registró el procedimiento y la versión.

Solo después de comprobar la restauración y recibir autorización específica se preparará la limpieza de datos de prueba. Este paquete no borra datos ni aplica SQL.
