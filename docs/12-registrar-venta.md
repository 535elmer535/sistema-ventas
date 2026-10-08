# Guía 12 — Registrar venta

## Primera prueba

Registré una unidad del ropero de melamina.

### Registro en ventas

- id_venta: 2
- id_usuario: 1
- id_cliente: NULL
- tipo_venta: directa_stock
- total: 1200
- estado_pago: pendiente

### Registro en detalle_ventas

- id_detalle: 1
- id_venta: 2
- id_producto: 1
- cantidad: 1
- precio_unitario: 1200
- subtotal: 1200

Comprobé ambos registros en Table Editor.
Esta prueba todavía no registra un cobro ni descuenta existencias.

## Segunda prueba

Registré dos escritorios con precio unitario de Bs 500.
El formulario confirmó el registro de la venta 3.

- id_venta: 3
- Total calculado: 1000

### Registro comprobado en detalle_ventas

- id_detalle: 2
- id_venta: 3
- id_producto: 2
- cantidad: 2
- precio_unitario: 500
- subtotal: 1000

El formulario volvió a sus valores iniciales después del guardado.

## Pruebas de cantidad inválida

- Cantidad vacía: la comprobación de JavaScript mostró un
  mensaje y detuvo la operación antes de guardar.
- Cantidad cero: el navegador bloqueó el envío mediante
  min="1" y mostró “El valor debe ser superior o igual a 1”.

## Reto 3.5 — Registrar cliente

Registré un cliente desde el formulario y comprobé
su fila en Table Editor:

- id_cliente: 2
- nombre: Cliente de prueba
- contacto: 00000000
- direccion: NULL

El formulario mostró la confirmación y limpió sus campos.

Registrar un cliente necesitó un solo insert en clientes.
Registrar una venta necesitó dos inserts: uno en ventas
y otro en detalle_ventas, relacionado mediante id_venta.

---

## Desafío 3.8 — Varios muebles en una venta

Implementé una lista temporal para agregar y quitar muebles,
acumular cantidades y calcular subtotales y total.

Prueba comprobada en Supabase:

- id_venta: 4
- Total: 2200
- Detalle 3: producto 1, cantidad 1, precio 1200, subtotal 1200.
- Detalle 4: producto 2, cantidad 2, precio 500, subtotal 1000.

Ambos detalles pertenecen a la misma venta.
Después de guardar, la lista quedó vacía y el total volvió a cero.

Este flujo todavía no descuenta existencias ni registra cobros.

---

## Ampliación propia — Pedidos a medida

Añadí cliente obligatorio, lista de muebles personalizados,
medidas, color, cantidad, precio acordado y fecha de entrega.
El formulario calcula total, monto recibido y saldo.

### Prueba comprobada en Supabase

- Venta: 5.
- Cliente: 2.
- Tipo: pedido_medida.
- Total: 1500.
- Estado de pago: anticipo_cobrado.
- Pedido personalizado: 1, asociado a la venta 5.
- Mueble: Ropero a medida de tres puertas.
- Medidas: 180 x 120 x 50 cm.
- Color: Blanco mate.
- Cantidad: 1.
- Precio unitario y subtotal: 1500.
- Estado del taller: pendiente.
- Entrega estimada: 2026-11-10.
- Pago: 1, asociado a la venta 5.
- Monto recibido: 500, en efectivo, como anticipo.
- Saldo calculado: 1000.

Se comprobaron los registros en ventas,
pedidos_personalizados y pagos.

Los guardados son separados; todavía no forman una
transacción atómica. El cobro posterior del saldo y
la actualización del estado del taller siguen pendientes.
