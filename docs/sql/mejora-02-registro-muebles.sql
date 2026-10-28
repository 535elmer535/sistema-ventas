
BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_mueble_seguro(
  p_nombre text,
  p_id_categoria bigint,
  p_precio_centavos bigint,
  p_existencia integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario bigint;
  v_rol text;
  v_id_producto bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  BEGIN
    SELECT u.id_usuario, u.rol
    INTO STRICT v_usuario, v_rol
    FROM public.usuarios AS u
    WHERE u.id_auth = auth.uid()
    FOR SHARE;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Tu cuenta no tiene un perfil asociado.';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Tu cuenta tiene perfiles duplicados.';
  END;

  IF v_rol IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'Solo el administrador puede registrar muebles.';
  END IF;

  IF p_nombre IS NULL
     OR btrim(p_nombre) = ''
     OR length(btrim(p_nombre)) > 200 THEN
    RAISE EXCEPTION 'Escribe un nombre de hasta 200 caracteres.';
  END IF;

  IF p_id_categoria IS NULL OR p_id_categoria <= 0 THEN
    RAISE EXCEPTION 'Selecciona una categoría válida.';
  END IF;

  PERFORM c.id_categoria
  FROM public.categorias AS c
  WHERE c.id_categoria = p_id_categoria
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La categoría seleccionada ya no existe.';
  END IF;

  IF p_precio_centavos IS NULL
     OR p_precio_centavos <= 0
     OR p_precio_centavos > 9007199254740991 THEN
    RAISE EXCEPTION 'El precio debe ser mayor que cero y estar dentro del rango permitido.';
  END IF;

  IF p_existencia IS NULL OR p_existencia < 0 THEN
    RAISE EXCEPTION 'La existencia debe ser un número entero igual o mayor que cero.';
  END IF;

  INSERT INTO public.productos (
    nombre,
    id_categoria,
    precio,
    existencia
  )
  VALUES (
    btrim(p_nombre),
    p_id_categoria,
    p_precio_centavos::numeric / 100,
    p_existencia
  )
  RETURNING id_producto INTO v_id_producto;

  RETURN jsonb_build_object(
    'id_producto', v_id_producto,
    'nombre', btrim(p_nombre)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_mueble_seguro(
  text, bigint, bigint, integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.registrar_mueble_seguro(
  text, bigint, bigint, integer
) TO authenticated;

REVOKE INSERT ON TABLE public.productos
FROM PUBLIC, anon, authenticated;

COMMIT;