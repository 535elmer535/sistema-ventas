# Guía 16: Reportes de ventas

## Objetivo

Consultar las ventas de la mueblería por fechas, calcular el total
vendido e identificar los muebles de catálogo más vendidos.

## 1. Consulta de ventas con sus detalles

Se utilizó esta consulta anidada en JavaScript:

```javascript
clientesupabase
  .from("ventas")
  .select("*, detalle_ventas(*, productos(*))")
  .order("fecha_venta", { ascending: false });
```

La consulta obtiene cada venta junto con sus detalles y la información
de los productos relacionados.

Se comprobó que la venta 4 tiene estos detalles:

- Un ropero: Bs 1200.
- Dos escritorios: Bs 1000.
- Total de la venta: Bs 2200.

Los pedidos a medida se registran por separado y pueden no tener
registros en detalle_ventas.

## 2. Reporte por fechas

Se agregaron los campos Desde y Hasta y el botón Consultar ventas.

El reporte muestra:

- Cantidad de ventas.
- Total vendido.
- Listado de ventas con fecha e importe.
- Un mensaje cuando no hay resultados.

Las fechas se interpretan en horario de Bolivia. Se incluye desde
el inicio del primer día hasta antes del inicio del día siguiente
a la fecha final.

Si Desde es posterior a Hasta, se muestra un mensaje de validación.
Si ambos campos están vacíos, se consulta sin filtro de fechas.

## 3. Comparación del total con SQL

Se ejecutó esta consulta en SQL Editor:

```sql
SELECT
  COUNT(*) AS cantidad_ventas,
  COALESCE(SUM(total), 0) AS total_vendido
FROM public.ventas
WHERE fecha_venta >= TIMESTAMPTZ '2026-10-07 00:00:00-04:00'
  AND fecha_venta < TIMESTAMPTZ '2026-10-08 00:00:00-04:00';
```

Resultados comprobados:

| Consulta                        | Cantidad de ventas | Total vendido |
| ------------------------------- | -----------------: | ------------: |
| Página: 07/10/2026 a 07/10/2026 |                  4 |    Bs 5900.00 |
| SQL: mismo período              |                  4 |    Bs 5900.00 |
| Página: 08/10/2026 a 08/10/2026 |                  0 |       Bs 0.00 |

El total del 7 de octubre coincide con la suma manual:

1500 + 2200 + 1000 + 1200 = Bs 5900.

Este importe representa el valor de las ventas, incluidos los pedidos
a medida. No representa necesariamente el dinero cobrado, porque
pueden existir saldos pendientes.

### Evidencia SQL

![Total de ventas en SQL](/diagramas/guia16-total-sql.png)

![Total de ventas en la página](/diagramas/guia16-total-web.png)

## 4. Muebles de catálogo más vendidos

Se consultó detalle_ventas junto con el nombre de cada producto.
En JavaScript se agruparon los registros por id_producto, se sumaron
las cantidades y se ordenaron de mayor a menor.

Para comprobarlo se ejecutó:

```sql
SELECT
  p.id_producto,
  p.nombre,
  SUM(d.cantidad) AS unidades_vendidas
FROM public.detalle_ventas AS d
JOIN public.productos AS p
  ON p.id_producto = d.id_producto
GROUP BY p.id_producto, p.nombre
ORDER BY unidades_vendidas DESC, p.nombre;
```

| Mueble     | Unidades en la página | Unidades en SQL |
| ---------- | --------------------: | --------------: |
| Escritorio |                     4 |               4 |
| Ropero     |                     2 |               2 |

Ambos resultados coinciden. El escritorio es el mueble con más
unidades vendidas en los datos consultados.

Este reporte consulta todo el historial de muebles de catálogo,
sin aplicar el filtro de fechas del reporte de ventas.
Los pedidos a medida quedan fuera de este conteo.

### Evidencias

![Unidades vendidas en SQL](/diagramas/guia16-unidades-sql.png)

![Unidades vendidas en la página](/diagramas/guia16-unidades-web.png)

## 5. Mejoras implementadas

- Cantidad de ventas junto al total.
- Identificación del mueble más vendido, contemplando empates.
- Carga de ambos reportes al mostrar la aplicación después de autenticar.
- Botones para volver a consultar los resultados.
- Mensajes de carga, ausencia de datos y errores.
- Cálculo del total en centavos para reducir errores de decimales.
- Protección de los textos insertados en HTML mediante escaparHTML.

## 6. Reflexión

Una consulta simple obtiene información de una tabla. Una consulta
anidada también permite obtener registros relacionados mediante
las claves foráneas, como una venta, sus detalles y sus productos.

El reporte por fechas ayuda a conocer el valor de las ventas de
un período. El reporte por unidades permite identificar qué muebles
del catálogo tienen mayor demanda.

Comparar JavaScript con SQL permite comprobar que los cálculos
coinciden para los datos consultados. También es necesario usar
el mismo período y horario en ambas consultas.

Los reportes se actualizan al cargarlos o pulsar sus botones;
no se actualizan automáticamente en tiempo real.

## 7. Alcance de las pruebas

Las pruebas se realizaron con cuatro ventas y cuatro líneas de detalle.
Para un historial grande será necesario incorporar paginación o
agregaciones en la base de datos, para que los reportes no dependan
del límite de filas que devuelve la API.
