
BEGIN;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS modalidad_entrega text,
  ADD COLUMN IF NOT EXISTS direccion_entrega text,
  ADD COLUMN IF NOT EXISTS referencia_entrega text,
  ADD COLUMN IF NOT EXISTS nombre_receptor text,
  ADD COLUMN IF NOT EXISTS contacto_receptor text;

COMMIT;



BEGIN;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS entrega_version bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.guardar_entrega_pedido(
  p_id_venta bigint,
  p_version bigint,
  p_modalidad text,
  p_direccion text,
  p_referencia text,
  p_nombre text,
  p_contacto text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario bigint;
  v_rol text;
  v_version bigint;
  v_estado_pago text;
  v_direccion text := nullif(btrim(p_direccion), '');
  v_referencia text := nullif(btrim(p_referencia), '');
  v_nombre text := nullif(btrim(p_nombre), '');
  v_contacto text := nullif(btrim(p_contacto), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  BEGIN
    SELECT id_usuario, rol
    INTO STRICT v_usuario, v_rol
    FROM public.usuarios
    WHERE id_auth = auth.uid()
    FOR SHARE;
  EXCEPTION
    WHEN no_data_found OR too_many_rows THEN
      RAISE EXCEPTION 'Tu cuenta necesita revisión en usuarios.';
  END;

  IF v_rol IS NULL
     OR v_rol NOT IN ('administrador', 'vendedor') THEN
    RAISE EXCEPTION 'No tienes permiso para guardar la entrega.';
  END IF;

  IF p_id_venta IS NULL OR p_id_venta <= 0
     OR p_version IS NULL OR p_version < 0 THEN
    RAISE EXCEPTION 'Abre nuevamente el detalle del pedido.';
  END IF;

  IF p_modalidad IS NULL
     OR p_modalidad NOT IN ('retiro_tienda', 'domicilio') THEN
    RAISE EXCEPTION 'Selecciona una modalidad de entrega válida.';
  END IF;

  IF v_nombre IS NULL OR v_contacto IS NULL THEN
    RAISE EXCEPTION 'Completa el nombre y teléfono de quien recibe.';
  END IF;

  IF char_length(v_nombre) > 200
     OR char_length(v_contacto) > 80
     OR char_length(v_direccion) > 500
     OR char_length(v_referencia) > 500 THEN
    RAISE EXCEPTION 'Los datos de entrega superan la longitud permitida.';
  END IF;

  IF p_modalidad = 'domicilio' AND v_direccion IS NULL THEN
    RAISE EXCEPTION 'Completa la dirección de entrega a domicilio.';
  END IF;

  SELECT entrega_version, estado_pago
  INTO v_version, v_estado_pago
  FROM public.ventas
  WHERE id_venta = p_id_venta
    AND tipo_venta = 'pedido_medida'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el pedido.';
  END IF;

  IF v_estado_pago IS NULL
     OR v_estado_pago NOT IN (
       'pendiente', 'anticipo_cobrado', 'pagado'
     ) THEN
    RAISE EXCEPTION 'Este pedido no permite modificar la entrega.';
  END IF;

  IF v_version <> p_version THEN
    RAISE EXCEPTION
      'Los datos cambiaron. Abre nuevamente el detalle antes de guardar.';
  END IF;

  UPDATE public.ventas
  SET
    modalidad_entrega = p_modalidad,
    direccion_entrega = CASE
      WHEN p_modalidad = 'domicilio' THEN v_direccion
      ELSE NULL
    END,
    referencia_entrega = CASE
      WHEN p_modalidad = 'domicilio' THEN v_referencia
      ELSE NULL
    END,
    nombre_receptor = v_nombre,
    contacto_receptor = v_contacto,
    entrega_version = entrega_version + 1
  WHERE id_venta = p_id_venta;

  RETURN jsonb_build_object(
    'id_venta', p_id_venta,
    'entrega_version', v_version + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_entrega_pedido(
  bigint, bigint, text, text, text, text, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.guardar_entrega_pedido(
  bigint, bigint, text, text, text, text, text
) TO authenticated;

COMMIT;

