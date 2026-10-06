# Guía 6 — Modelo de datos (Mueblería de Melamina)

## Entidades

- **categorias**: Clasificación de los muebles de catálogo (ej. Roperos, Escritorios, Centros de TV).
- **productos**: Muebles de melamina en stock listos para venta directa (CU-01, CU-02, CU-03).
- **clientes**: Clientes que realizan compras de stock o mandan a fabricar muebles a medida (Guía 2, CU-01).
- **usuarios**: Personal de la mueblería que opera el sistema: Vendedor o Administrador (CU-01, CU-03, CU-04).
- **ventas**: Registro general de cada transacción comercial (CU-01, CU-04).
- **detalle_venta**: Muebles de stock y cantidades específicas incluidas en una venta (relación N:N).
- **pedidos_personalizados**: Especificaciones técnicas (medidas, color de melamina, estado en taller) para la fabricación de muebles a medida y generación de notas de pedido (CU-01, CU-07).
- **pagos**: Historial de transacciones de dinero (anticipos, saldos finales, métodos de pago) vinculados a cada venta.

## Atributos

### categorias

- id_categoria: identificador (clave primaria)
- nombre: texto (ej. Roperos, Escritorios, Cocinas)
- descripcion: texto (opcional)

### productos

- id_producto: identificador (clave primaria)
- id_categoria: clave foránea -> categorias
- nombre: texto
- precio: número decimal
- existencia: número entero
- fecha_registro: fecha / hora (para seguimiento de rotación de inventario)

### clientes

- id_cliente: identificador (clave primaria)
- nombre: texto
- contacto: texto
- direccion: texto (opcional, para entregas a domicilio)

### usuarios

- id_usuario: identificador (clave primaria)
- nombre: texto
- rol: texto (vendedor / administrador)
- fecha_registro: fecha
- contacto: texto

### ventas

- id_venta: identificador (clave primaria)
- fecha_venta: fecha / hora
- id_usuario: clave foránea -> usuarios
- id_cliente: clave foránea -> clientes (opcional para venta directa, obligatorio para pedidos a medida)
- tipo_venta: texto (directa_stock / pedido_medida)
- total: número decimal
- estado_pago: texto (pendiente / pagado / anticipo_cobrado)

### detalle_ventas

- id_detalle: identificador (clave primaria)
- id_venta: clave foránea -> ventas
- id_producto: clave foránea -> productos
- cantidad: número entero
- precio_unitario: número decimal
- subtotal: número decimal

### pedidos_personalizados

- id_pedido: identificador (clave primaria)
- id_venta: clave foránea -> ventas
- descripcion_mueble: texto
- medidas: texto (alto x ancho x profundidad en cm)
- color_melamina: texto
- estado_taller: texto (pendiente / en_taller / listo / entregado)
- fecha_entrega_estimada: fecha

### pagos

- id_pago: identificador (clave primaria)
- id_venta: clave foránea -> ventas
- monto: número decimal
- metodo_pago: texto (efectivo / QR / transferencia)
- tipo_pago: texto (anticipo / saldo_final / pago_total)
- fecha_pago: fecha / hora

## Relaciones

- productos.id_categoria -> categorias.id (una categoría agrupa varios productos)
- ventas.id_usuario -> usuarios.id (un usuario o vendedor registra muchas ventas)
- ventas.id_cliente -> clientes.id (un cliente puede realizar muchas compras o pedidos)
- detalle_venta.id_venta -> ventas.id (una venta directa de stock puede contener varios muebles)
- detalle_venta.id_producto -> productos.id (un producto de catálogo puede venderse en diferentes ventas)
- pedidos_personalizados.id_venta -> ventas.id (una venta de tipo pedido a medida se vincula a su orden de fabricación en taller)
- pagos.id_venta -> ventas.id (una venta puede recibir múltiples pagos, como el anticipo y el saldo pendiente)

## Reflexión breve

Sí, el modelo actual lo permite con total precisión. Al conectar las tablas `clientes` -> `ventas` -> `detalle_venta` -> `productos` (para muebles de catálogo) y `ventas` -> `pedidos_personalizados` (para muebles a medida), se puede consultar mediante consultas SQL con agrupación (`GROUP BY`) qué productos o tipos de muebles compra con mayor frecuencia cada cliente.

## Desafíos opcionales

- **Atributo `fecha_registro` en `productos`:** Permite saber cuándo se dio de alta un producto en el inventario para medir la velocidad de rotación de stock en tienda.
- **Normalización y Control Financiero (Tablas `categorias`, `pedidos_personalizados` y `pagos`):** Permite separar los productos de catálogo rápido de los muebles fabricados bajo pedido en taller[cite: 16]. Además, la tabla `pagos` permite un control financiero estricto para registrar cobros parciales (anticipos y saldos) con su respectivo método de pago (QR, transferencia, efectivo)[cite: 16].
