# Guía 3 — Análisis de requerimientos

## Requerimientos funcionales (RF)

- **RF-01:** El sistema debe permitir registrar los muebles ya armados (ej. roperos, escritorios) con nombre, precio y cantidad en exhibición/tienda.
- **RF-02:** El sistema debe permitir consultar la disponibilidad de un modelo de mueble específico antes de ofrecerlo al cliente.
- **RF-03:** El sistema debe permitir registrar la venta directa de un mueble en stock, o registrar un "pedido a medida" con un anticipo de dinero.
- **RF-04:** El sistema debe permitir consultar el total de dinero ingresado en el día (por ventas directas y por anticipos de pedidos).
- **RF-05:** El sistema debe permitir a Marcelo ver el resumen de ventas y pedidos desde su celular.
- **RF-06:** El sistema debe mostrar una alerta cuando un mueble muy popular (de catálogo) se quede sin stock en la tienda.
- **RF-07:** El sistema debe generar un comprobante para el cliente y una "nota de pedido" con las medidas para que los operarios del taller empiecen a fabricarlo.

## Requerimientos no funcionales (RNF)

- **RNF-01** (Usabilidad): cualquier vendedor debe poder registrar una venta o pedido sin capacitación extensa.
- **RNF-02** (Disponibilidad): el sistema debe funcionar en cualquier navegador moderno, sin instalar nada.
- **RNF-03** (Seguridad): solo Marcelo y sus vendedores autorizados deben poder acceder al sistema.
- **RNF-04** (Compatibilidad): el sistema debe verse y funcionar bien tanto en la computadora de la tienda como en los celulares.

## Restricciones

- Debe construirse únicamente con HTML, CSS, JavaScript y Supabase.
- Debe usarse el plan gratuito de Supabase (sin presupuesto para servicios pagos).
- Debe funcionar en el navegador, sin instalar aplicaciones adicionales.

## Priorización (MoSCoW)

- **Debe tener:** RF-01, RF-02, RF-03
- **Debería tener:** RF-04, RF-05
- **Podría tener:** RF-06, RF-07
- **No por ahora:** Control de inventario de las herramientas y materiales dentro del taller (tornillos, cortes de planchas exactos). Por ahora, el sistema solo controlará las ventas y pedidos de la tienda.

## Reflexión breve

Si solo se construyeran los requerimientos marcados como "Debe tener" (registrar muebles, consultar disponibilidad y registrar ventas o pedidos), el sistema seguiría siendo sumamente útil para la tienda. Esto se debe a que resuelve el problema principal y más crítico: evitar vender algo que no hay, ordenar la entrada de dinero y dejar de usar papeles sueltos para los pedidos, cubriendo la necesidad básica de control que frena el negocio hoy en día.
