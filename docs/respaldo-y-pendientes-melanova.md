# Melanova — Respaldo y mejoras siguientes

## Alcance de este bloque

Se implementaron la presentación de las seis secciones, la búsqueda/paginación visible de muebles y clientes, la consulta por lotes, la documentación del estado y la corrección de las pruebas de recuperación. No se cambiaron reglas del negocio ni permisos del servidor.

## Antes de utilizar datos reales

El ZIP y Git guardan archivos; no guardan los datos actuales de Supabase. Para poder reconstruir el sistema se necesita respaldar por separado:

- Estructura completa de tablas, relaciones, índices, restricciones, funciones, triggers, políticas RLS y permisos.
- Datos de las tablas, respetando sus relaciones.
- Código y configuración de las Edge Functions, guardando sus secretos en un lugar privado, fuera del repositorio.
- Configuración de Authentication y procedimiento para recuperar cuentas. Un CSV de tablas públicas no respalda las cuentas de Auth.
- Recursos de Storage, si se empieza a utilizar ese servicio.

El paso pendiente es obtener un respaldo completo mediante un método oficial de Supabase/PostgreSQL y probar su restauración en otro proyecto de prueba. No ejecutar una limpieza en el proyecto actual antes de comprobar esa restauración. Los scripts de docs/sql son incrementales; no constituyen por sí solos una instalación completa desde cero.

## Mejoras funcionales pendientes de otro bloque

1. Asociar un cliente a la venta de stock: añadir selector y validación en la función SQL, preservando el registro atómico y los reintentos por identificador. Definir cómo se identifica una venta de mostrador antes de hacer obligatorio el cliente.
2. Desactivar cuentas del personal: requiere validación del estado en Supabase y en las funciones del servidor, además del botón. Ocultar un botón no bloquea una cuenta. Proteger la propia cuenta y al último administrador activo.
3. Concentrar los cálculos del Inicio en consultas del servidor cuando aumente el volumen de operaciones.
4. Completar el paquete de instalación de base de datos, incluida la función de actualización de precio que no aparece definida en los SQL del ZIP recibido.
5. Actualizar las capturas del manual cuando se elija definitivamente el diseño.

No se añadieron costos/gastos, bajas por daños, devolución parcial ni cambios de la regla de entrega con saldo pendiente. Son decisiones independientes del diseño y necesitan definir primero su comportamiento con el negocio.
