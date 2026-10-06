# Guía 9 — Configuración de Supabase

## Datos del proyecto

- **Nombre del proyecto:** sistema-ventas
- **Negocio:** tienda de muebles de melamina.
- **Región:** West US (Oregon).
- **Código de región:** us-west-2.

El sistema gestionará ventas de muebles en stock, pedidos a medida y sus pagos, incluidos anticipos y saldos.

## Tablas creadas

Se crearon las ocho tablas del modelo de datos de la mueblería:

| Tabla                  | Clave primaria | Propósito                                                       |
| ---------------------- | -------------- | --------------------------------------------------------------- |
| categorias             | id_categoria   | Clasificar los muebles del catálogo.                            |
| productos              | id_producto    | Registrar muebles, precios y existencias.                       |
| clientes               | id_cliente     | Guardar los datos de los clientes.                              |
| usuarios               | id_usuario     | Registrar al personal del negocio.                              |
| ventas                 | id_venta       | Registrar los datos comerciales de ventas y pedidos.            |
| detalle_ventas         | id_detalle     | Guardar productos, cantidades y precios de las ventas de stock. |
| pedidos_personalizados | id_pedido      | Guardar medidas, color y datos de fabricación.                  |
| pagos                  | id_pago        | Registrar anticipos, pagos completos y cobros de saldo.         |

Se utilizaron Table Editor y SQL Editor durante la configuración. En la tabla clientes se utilizaron ambas herramientas.

El ejemplo del profesor contiene cinco tablas. Este proyecto utiliza ocho para incluir categorías, pedidos personalizados y pagos, según su modelo de datos.

### Ajustes realizados

- cantidad en detalle_ventas y existencia en productos utilizan int4 para registrar unidades enteras.
- Los precios e importes utilizan numeric para permitir decimales.
- Las fechas de registro, venta y pago utilizan timestamptz.
- fecha_entrega_estimada utiliza date y no tiene un valor predeterminado automático.
- Se conserva el nombre detalle_ventas, actualizado también en la Guía 6.

## Row Level Security

Las ocho tablas tienen RLS activado y una política llamada **solo autenticados**.

| Tabla                  | RLS    | Política          | Operación | Rol           |
| ---------------------- | ------ | ----------------- | --------- | ------------- |
| categorias             | Activo | solo autenticados | ALL       | authenticated |
| productos              | Activo | solo autenticados | ALL       | authenticated |
| clientes               | Activo | solo autenticados | ALL       | authenticated |
| usuarios               | Activo | solo autenticados | ALL       | authenticated |
| ventas                 | Activo | solo autenticados | ALL       | authenticated |
| detalle_ventas         | Activo | solo autenticados | ALL       | authenticated |
| pedidos_personalizados | Activo | solo autenticados | ALL       | authenticated |
| pagos                  | Activo | solo autenticados | ALL       | authenticated |

Las políticas se configuraron como Permissive, con la condición `auth.role() = 'authenticated'` tanto en USING como en WITH CHECK.

Esta configuración establece el requisito de autenticación para las operaciones permitidas por los privilegios de la base de datos. Todavía no distingue los permisos de administrador y vendedor.

Se comprobó visualmente que las ocho políticas aparecen guardadas en Supabase. Las pruebas de acceso con y sin sesión están pendientes.

## Configuración de conexión

Se guardaron la URL del proyecto y la clave pública anon en
js/supabase-client.js, mediante las constantes SUPABASE_URL
y SUPABASE_ANON_KEY.

No se incluyeron la clave service_role ni la contraseña de la base de datos.

En esta etapa solo se guardó la configuración.
La conexión desde JavaScript todavía no se ha probado.

## Reflexión breve

Pendiente de responder después de completar la práctica.

## Registro en GitHub

Pendiente de realizar el commit, el push y la verificación de los archivos en el repositorio.
