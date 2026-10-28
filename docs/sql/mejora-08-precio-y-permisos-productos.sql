
BEGIN;

REVOKE UPDATE ON TABLE public.productos
FROM PUBLIC, anon, authenticated;

REVOKE UPDATE (
  id_producto,
  id_categoria,
  nombre,
  precio,
  existencia,
  fecha_registro
) ON TABLE public.productos
FROM PUBLIC, anon, authenticated;

COMMIT;



SELECT
  has_table_privilege(
    'authenticated', 'public.productos', 'UPDATE'
  ) AS puede_actualizar_tabla,
  has_any_column_privilege(
    'authenticated', 'public.productos', 'UPDATE'
  ) AS puede_actualizar_columnas;