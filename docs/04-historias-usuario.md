# Guía 4 — Historias de usuario

## Historias de usuario

- **HU-01:** Como vendedor, quiero registrar la venta de un mueble en stock o un pedido a medida, para no tener que anotarlo a mano.
- **HU-02:** Como vendedor, quiero consultar la disponibilidad de un modelo de mueble específico, para saber si hay en exhibición antes de ofrecerlo.
- **HU-03:** Como administrador, quiero registrar nuevos muebles con su precio y cantidad, para mantener actualizado el inventario de la tienda.
- **HU-04:** Como administrador, quiero consultar el total de dinero ingresado en el día, para llevar un control claro de la caja.
- **HU-05:** Como administrador, quiero ver un resumen de ventas y pedidos desde mi celular, para revisarlo aunque no esté en la tienda.
- **HU-06:** Como administrador, quiero recibir una alerta cuando un mueble popular se quede sin stock, para reponerlo a tiempo.
- **HU-07:** Como vendedor, quiero generar un comprobante para el cliente y una nota de pedido con medidas, para que los operarios del taller empiecen a fabricarlo.

## Criterios de aceptación

### HU-01

- Se puede elegir entre venta directa o pedido a medida.
- Se pueden registrar los datos y el anticipo del cliente.
- El sistema guarda la orden correctamente.

### HU-02

- Se puede buscar el mueble por su nombre.
- El sistema muestra la cantidad exacta disponible en exhibición.
- Si no hay stock, avisa que debe tomarse como pedido a medida.

### HU-03

- Se puede ingresar nombre, precio y cantidad del mueble.
- El nombre y precio son obligatorios.
- El mueble se añade automáticamente al catálogo de la tienda.

### HU-04

- Se puede filtrar por fecha o consultar el día actual.
- El sistema suma automáticamente las ventas directas y los anticipos.
- Se muestra el total de ingresos de forma clara.

### HU-05

- El administrador puede acceder desde el navegador del celular.
- La pantalla se adapta al tamaño del móvil.
- Muestra el resumen de ventas y pedidos actualizados.

### HU-06

- El sistema monitorea el stock tras cada venta.
- Se muestra un aviso visual cuando el stock llega a cero.
- La alerta indica el nombre específico del mueble agotado.

### HU-07

- Se genera un comprobante digital o impreso para el cliente.
- Se crea una nota con las medidas exactas para el taller.
- La nota queda accesible para los operarios del taller.

## Trazabilidad

- HU-01 -> RF-03
- HU-02 -> RF-02
- HU-03 -> RF-01
- HU-04 -> RF-04
- HU-05 -> RF-05
- HU-06 -> RF-06
- HU-07 -> RF-07

## Backlog ordenado

1. HU-03 (RF-01 - Debe tener)
2. HU-02 (RF-02 - Debe tener)
3. HU-01 (RF-03 - Debe tener)
4. HU-04 (RF-04 - Debería tener)
5. HU-05 (RF-05 - Debería tener)
6. HU-06 (RF-06 - Podría tener)
7. HU-07 (RF-07 - Podría tener)

## Reflexión breve

No hay ninguna historia de usuario desconectada; todas nuestras historias (HU-01 a HU-07) se relacionan perfectamente con un Requerimiento Funcional (RF-01 a RF-07) de la Guía 3. Esto demuestra que el análisis es coherente: cada necesidad del usuario tiene su contraparte técnica exacta en el sistema, por lo que no sobran historias ni faltan requerimientos.
