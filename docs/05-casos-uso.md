# Guía 5 — Casos de uso

## CU-01: Registrar una venta

- Historia relacionada: HU-01
- Actor principal: Vendedor
- Precondición: Existen muebles registrados en el sistema.

### Flujo principal

1. El vendedor abre la pantalla de registrar venta.
2. El vendedor elige si es una venta directa de stock o un pedido a medida.
3. El vendedor busca y selecciona el modelo de mueble.
4. El vendedor ingresa los datos del cliente y el anticipo monetario (si aplica).
5. El sistema calcula el total a cobrar o el saldo pendiente.
6. El vendedor confirma la transacción.
7. El sistema guarda el registro y genera el comprobante o nota de pedido.

### Flujos alternativos

- 3a. Si el mueble seleccionado no tiene stock y es venta directa, el sistema avisa que debe ofrecerse como pedido a medida.
- 6a. Si el vendedor cancela antes de confirmar, no se guarda ningún cambio en el sistema.

### Postcondición

La venta o pedido queda registrado y el stock o la orden de fabricación se actualiza.

---

## CU-02: Consultar existencia de un producto

- Historia relacionada: HU-02
- Actor principal: Vendedor
- Precondición: Existen muebles registrados en el sistema.

### Flujo principal

1. El vendedor abre la opción de consulta de productos.
2. El vendedor escribe el nombre del modelo de mueble que desea buscar.
3. El sistema busca los muebles que coinciden con el nombre ingresado.
4. El vendedor selecciona el mueble correspondiente.
5. El sistema muestra la cantidad disponible en exhibición.
6. El vendedor utiliza la información para saber si hay stock o si debe tomarlo como pedido a medida.

### Flujos alternativos

- 3a. Si no existe ningún mueble con ese nombre, el sistema informa que no se encontraron resultados.
- 5a. Si la existencia disponible es cero, el sistema indica que el producto está agotado para venta directa.

### Postcondición

El vendedor conoce la existencia actual del modelo sin modificar ningún dato del inventario.

---

## CU-03: Registrar un nuevo producto

- Historia relacionada: HU-03
- Actor principal: Administrador (Marcelo)
- Precondición: El administrador tiene acceso autorizado al sistema.

### Flujo principal

1. El administrador abre la opción de registrar productos.
2. El sistema muestra el formulario de registro.
3. El administrador ingresa el nombre del mueble.
4. El administrador ingresa el precio.
5. El administrador ingresa la existencia inicial en exhibición.
6. El administrador confirma el registro.
7. El sistema valida los datos ingresados.
8. El sistema guarda el nuevo mueble.
9. El sistema muestra el producto dentro del catálogo de la tienda.

### Flujos alternativos

- 3a. Si el nombre está vacío, el sistema informa que es un dato obligatorio y no permite guardar.
- 4a. Si el precio no es un número mayor que cero, el sistema muestra un mensaje de error.
- 6a. Si el administrador cancela el registro, no se guarda ningún producto.

### Postcondición

El nuevo mueble queda registrado y disponible para ser consultado o vendido.

---

## CU-04: Consultar total vendido en un periodo

- Historia relacionada: HU-04
- Actor principal: Administrador (Marcelo)
- Precondición: Existen ventas y anticipos registrados en el sistema.

### Flujo principal

1. El administrador abre la sección de reportes de ingresos.
2. El sistema muestra las opciones para seleccionar un periodo.
3. El administrador selecciona una fecha inicial.
4. El administrador selecciona una fecha final.
5. El administrador solicita generar el reporte.
6. El sistema busca las ventas directas y anticipos registrados dentro del periodo seleccionado.
7. El sistema calcula automáticamente el total de dinero ingresado.
8. El sistema muestra el total y el detalle correspondiente al periodo.

### Flujos alternativos

- 4a. Si la fecha final es anterior a la fecha inicial, el sistema informa el error y solicita corregir las fechas.
- 6a. Si no existen registros en el periodo seleccionado, el sistema informa que no se encontraron movimientos y muestra un total de Bs 0.

### Postcondición

El administrador obtiene el total de ingresos durante el periodo seleccionado sin realizar cálculos manuales.

---

## CU-05: Consultar resumen de ventas desde el celular

- Historia relacionada: HU-05
- Actor principal: Administrador (Marcelo)
- Precondición: El administrador posee un dispositivo móvil con navegador y conexión a Internet.

### Flujo principal

1. El administrador abre el navegador de su celular.
2. El administrador ingresa a la dirección web del sistema.
3. El sistema muestra la pantalla de inicio de sesión adaptada al celular.
4. El administrador ingresa sus datos de acceso.
5. El sistema verifica las credenciales y permite el ingreso.
6. El administrador abre la opción de resumen de ventas y pedidos.
7. El sistema obtiene la información actualizada.
8. El sistema muestra el resumen adaptado al tamaño de la pantalla móvil.

### Flujos alternativos

- 4a. Si los datos de acceso son incorrectos, el sistema informa el error y deniega el acceso.
- 8a. Si todavía no existen registros, el sistema muestra el resumen con valores en cero.

### Postcondición

El administrador puede consultar de forma segura el estado de su negocio desde el celular, aunque se encuentre fuera de la tienda.

---

## CU-06: Alerta de stock agotado

- Historia relacionada: HU-06
- Actor principal: Administrador (Marcelo) / Vendedor
- Precondición: El sistema cuenta con un registro de inventario activo.

### Flujo principal

1. El vendedor concreta la venta del último ejemplar en stock de un mueble de catálogo.
2. El sistema actualiza automáticamente la existencia del mueble a cero.
3. El sistema detecta que el stock llegó al límite mínimo o agotado.
4. El sistema genera una alerta visual destacada en la pantalla principal.
5. El administrador o vendedor visualiza la alerta con el nombre específico del mueble agotado.

### Flujos alternativos

- 3a. Si la venta se realiza sobre un pedido a medida (que no usa stock de exhibición), el sistema no activa esta alerta de catálogo.

### Postcondición

Los encargados de la tienda son notificados inmediatamente de la falta de stock para proceder a su reposición.

---

## CU-07: Generar comprobante y nota de pedido para el taller

- Historia relacionada: HU-07
- Actor principal: Vendedor
- Precondición: Se ha registrado exitosamente una venta directa o un pedido a medida.

### Flujo principal

1. El sistema procesa la confirmación de la venta o pedido.
2. El sistema genera un comprobante de pago para entregar al cliente.
3. Si la transacción incluye un pedido a medida, el sistema genera automáticamente una "nota de pedido" digital.
4. La nota de pedido detalla las medidas exactas y especificaciones del mueble.
5. El sistema envía o disponibiliza la nota para que los operarios del taller puedan consultarla.

### Flujos alternativos

- 2a. Si ocurre un fallo en la impresora o exportación digital, el sistema permite reintentar la generación del comprobante sin perder los datos de la venta.

### Postcondición

El cliente recibe su comprobante de compra/anticipo y el taller cuenta con la nota técnica de medidas lista para iniciar la fabricación sin errores.

---

## Reflexión breve

Al detallar los casos de uso para el sistema de ventas de muebles de melamina, se identificó un escenario no considerado inicialmente en los requerimientos de la Guía 3: la presencia de **fallos técnicos durante la impresión o exportación digital de comprobantes y notas de pedido (Flujo alternativo 2a de CU-07)**. Mientras que en los requerimientos iniciales solo se contempló la generación exitosa del documento, al detallar el flujo operativo real fue necesario definir un mecanismo de reintento para garantizar que la transacción no pierda consistencia ni se dupliquen registros.

---

## Desafíos opcionales

### Flujo alternativo adicional para CU-01 (Registrar una venta)

- **1a. Pérdida de conexión a internet a mitad del registro:**
  1. Si la conexión a red se interrumpe antes de confirmar la transacción, el sistema almacena un borrador local temporal con los ítems seleccionados.
  2. El sistema muestra un mensaje de advertencia notificando al vendedor sobre la interrupción de la conectividad.
  3. Una vez restablecida la señal, el sistema permite reanudar el envío de los datos sin obligar al usuario a ingresar el pedido desde cero.
