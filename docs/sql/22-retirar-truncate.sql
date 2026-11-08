-- Ajuste aplicado por el usuario y verificado con la consulta de permisos.
BEGIN;
REVOKE TRUNCATE ON TABLE
  public.categorias,
  public.clientes,
  public.productos,
  public.usuarios
FROM PUBLIC, anon, authenticated;
COMMIT;
