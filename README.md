# MUEBLEX — Sistema de ventas de muebles de melamina

Sistema web para administrar muebles de catálogo y pedidos fabricados a medida. Reúne inventario, clientes, ventas, cobros y seguimiento del trabajo y la entrega.

Desarrollado por Elmer para utilizarlo en un negocio de muebles de melamina, tomando las guías del curso como referencia y adaptándolas a las necesidades del proyecto.

## Estado del proyecto

**Guía 22 en curso — preparación para publicación.**

La versión actual utiliza datos de prueba. Antes de incorporar operaciones reales se preparará un respaldo de Supabase y se revisará la limpieza de esas pruebas. La elección del alojamiento y la publicación se realizarán después de completar las verificaciones pendientes.

El seguimiento actualizado está en [la checklist de publicación](docs/22-checklist-publicacion.md).

## Funcionalidades

- **Inventario**. Registro de muebles, consulta de existencias, avisos de stock bajo o agotado, edición de precios y reposiciones con historial.
- **Categorías**. Creación y edición de nombres desde Administración, reservadas al administrador. Las categorías se utilizan al registrar muebles.
- **Clientes**. Registro, consulta y edición de nombre, contacto y dirección. La eliminación está restringida al administrador y sujeta a los registros relacionados.
- **Ventas de stock**. Lista de muebles con cantidades, precios y subtotales, confirmación de la venta y descuento de existencias.
- **Pedidos a medida**. Registro de descripción, medidas, color, cantidad, precio y fecha estimada de entrega, con anticipo o pago al registrar el pedido.
- **Cobros**. Registro de pagos de ventas y pedidos, métodos de cobro, historial y consulta de saldos.
- **Taller y entrega**. Seguimiento del estado de fabricación y registro de datos de entrega o retiro.
- **Documentos**. Comprobantes de operaciones y notas de fabricación para el taller, con vista de impresión.
- **Anulaciones y devoluciones**. Operaciones protegidas para el administrador, con validaciones sobre cobros y recuperación del stock cuando corresponde.
- **Reportes**. Ventas y pedidos por período, dinero cobrado, devoluciones, neto cobrado y muebles vendidos.
- **Acceso del personal**. Inicio y cierre de sesión, opción Recordarme, cambio de contraseña y creación administrativa de cuentas.
- **Interfaz**. Navegación adaptable a pantallas pequeñas y buscador de productos, clientes y ventas.

Los reportes distinguen el valor vendido del dinero efectivamente cobrado. El neto cobrado corresponde a cobros menos devoluciones. El cálculo de ganancia requiere considerar también los costos y gastos del negocio.

## Roles

| Rol | Uso principal |
| --- | --- |
| Administrador | Gestión del negocio, muebles, precios, reposiciones, categorías, cuentas del personal, anulaciones y devoluciones. |
| Vendedor | Consulta del inventario, gestión de clientes, ventas, pedidos, cobros, seguimiento de taller y entrega, y consulta de reportes. |

Las restricciones de las operaciones se comprueban en Supabase mediante permisos, políticas y funciones. La interfaz muestra los controles correspondientes al rol.

## Tecnologías

- HTML5 y CSS3.
- JavaScript y Supabase JavaScript Client v2.
- Supabase PostgreSQL, Authentication y Row Level Security (RLS).
- Funciones SQL para operaciones del negocio y una Edge Function en TypeScript para crear cuentas.
- Git y GitHub para el control de versiones.
- VS Code y Live Server para el desarrollo local.

## Abrir la instalación actual en desarrollo

1. Abre la carpeta `sistema-ventas` en VS Code.
2. Comprueba que `js/supabase-client.js` apunta al proyecto Supabase correspondiente y utiliza su clave pública.
3. Abre `index.html` con Live Server.
4. Inicia sesión con una cuenta del personal creada por el administrador.

La aplicación utiliza Internet para conectarse a Supabase y cargar bibliotecas, fuentes e iconos externos.

### Base de datos y cuentas

La instalación actual se configuró progresivamente durante el desarrollo. Una instalación nueva requiere preparar el esquema completo, las relaciones, las políticas, los permisos y las funciones del servidor. Los archivos de `docs/sql/` documentan cambios incrementales realizados sobre esa estructura.

La creación administrativa de cuentas utiliza `supabase/functions/registrar-usuario/index.ts`, desplegada en el proyecto Supabase correspondiente. Sus secretos se configuran en el servidor. La clave `service_role` pertenece a ese entorno del servidor; el navegador utiliza la clave pública y la sesión del usuario.

El registro público de cuentas está desactivado. La creación desde el administrador y el rechazo de solicitudes de vendedores se comprobaron durante la Guía 22.

## Estructura principal

```text
sistema-ventas/
├── index.html                 # Interfaz principal y carga de los módulos
├── css/                       # Estilos por sección y adaptación responsive
├── js/
│   ├── supabase-client.js     # Conexión y almacenamiento de sesión
│   ├── utils.js               # Funciones compartidas
│   ├── auth.js                # Acceso, perfiles y cuentas
│   ├── productos.js           # Inventario, muebles, precios y reposiciones
│   ├── categorias.js          # Administración de nombres de categorías
│   ├── clientes.js            # Operaciones de clientes
│   ├── ventas.js              # Ventas, pedidos, cobros y operaciones asociadas
│   ├── app.js                 # Punto de entrada mediante iniciar()
│   ├── devoluciones-mueblex.js
│   ├── navegacion.js
│   └── inicio-mueblex.js
├── supabase/functions/        # Código de funciones del servidor
├── docs/                      # Documentación y SQL del desarrollo
├── diagramas/                 # Diagramas y evidencias de pruebas
├── assets/                    # Recursos visuales
└── pages/                     # Páginas secundarias conservadas del desarrollo
```

Los módulos de la interfaz actual se integran desde `index.html`. El orden de los scripts coordina sus dependencias antes de ejecutar `iniciar()`.

## Pruebas y documentación

- [Plan de pruebas adaptado a Mueblex](docs/18-plan-pruebas.md).
- [Ejecución de pruebas y correcciones](docs/19-ejecucion-pruebas.md).
- [Diseño responsive y accesibilidad](docs/20-mejoras-interfaz.md).
- [Reorganización del código y pruebas posteriores](docs/21-refactor.md).
- [Preparación para publicación y revisión de seguridad](docs/22-checklist-publicacion.md).

Después de reorganizar el código se comprobaron una venta de stock, un pedido a medida con anticipo y el rechazo de ventas sin sesión, incluyendo consultas de verificación en Supabase. Las pruebas de administración de categorías y de registro de cuentas se documentaron posteriormente en la Guía 22.

Los documentos registran el alcance y los resultados de cada comprobación. Las verificaciones de producción pendientes se siguen en la checklist de publicación.

## Respaldo y puesta en uso

El repositorio y los ZIP del proyecto conservan el código, los recursos y la documentación. Los datos de Supabase requieren un respaldo independiente de la base de datos.

La incorporación de datos reales se coordinará después de revisar las pruebas existentes, los accesos del personal y la configuración final de publicación.


## Recuperación asistida por WhatsApp

Se incluye la adaptación para solicitar ayuda a un administrador elegido y
restablecer el acceso con contraseña temporal y cambio obligatorio.
El usuario instaló el SQL y las funciones del servidor y comprobó el flujo
con una cuenta de prueba: contacto por WhatsApp, restablecimiento, cambio
obligatorio, rechazo de la contraseña temporal e historial. Se comprobó el
rechazo HTTP 403 para la consulta administrativa desde un vendedor y se
revisó la presentación móvil. Las pruebas adicionales pendientes se indican
en el documento de recuperación. La publicación en Netlify sigue pendiente.

- [Instalación por bloques](LEEME-RECUPERACION-WHATSAPP.md)
- [Funcionamiento y resultados de pruebas](docs/recuperacion-whatsapp.md)
