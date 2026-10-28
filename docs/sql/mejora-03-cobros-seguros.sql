
BEGIN;

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS solicitud_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS pagos_solicitud_id_unico
  ON public.pagos (solicitud_id)
  WHERE solicitud_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.registrar_cobro_seguro(
  p_solicitud_id uuid,
  p_id_venta bigint,
  p_monto_centavos bigint,
  p_metodo_pago text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario bigint;
  v_rol text;
  v_venta public.ventas%ROWTYPE;
  v_existente public.pagos%ROWTYPE;
  v_cobrado numeric;
  v_monto numeric;
  v_saldo numeric;
  v_id_pago bigint;
  v_tipo_pago text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrar un cobro.';
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

  IF v_rol IS NULL
     OR v_rol NOT IN ('administrador', 'vendedor') THEN
    RAISE EXCEPTION 'Tu cuenta no está autorizada para registrar cobros.';
  END IF;

  IF p_solicitud_id IS NULL THEN
    RAISE EXCEPTION 'Falta el identificador del cobro.';
  END IF;

  IF p_id_venta IS NULL OR p_id_venta <= 0 THEN
    RAISE EXCEPTION 'Selecciona una venta o pedido válido.';
  END IF;

  IF p_monto_centavos IS NULL
     OR p_monto_centavos <= 0
     OR p_monto_centavos > 9007199254740991 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que cero y estar dentro del rango permitido.';
  END IF;

  IF p_metodo_pago IS NULL
     OR p_metodo_pago NOT IN ('efectivo', 'QR', 'transferencia') THEN
    RAISE EXCEPTION 'Selecciona un método de pago válido.';
  END IF;

  v_monto := p_monto_centavos::numeric / 100;

  -- El mismo envío no puede generar dos pagos.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_solicitud_id::text, 0)
  );

  -- Los cobros de la misma venta se procesan uno por uno.
  SELECT *
  INTO v_venta
  FROM public.ventas
  WHERE id_venta = p_id_venta
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La venta o pedido ya no existe.';
  END IF;

  IF v_venta.total IS NULL
     OR v_venta.total::text IN ('NaN', 'Infinity', '-Infinity')
     OR v_venta.total <= 0
     OR v_venta.total <> round(v_venta.total, 2)
     OR v_venta.total * 100 > 9007199254740991 THEN
    RAISE EXCEPTION 'El total registrado no es válido. Requiere revisión.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pagos p
    WHERE p.id_venta = p_id_venta
      AND (
        p.monto IS NULL
        OR p.monto::text IN ('NaN', 'Infinity', '-Infinity')
        OR p.monto <= 0
        OR p.monto <> round(p.monto, 2)
      )
  ) THEN
    RAISE EXCEPTION 'Hay pagos anteriores que requieren revisión.';
  END IF;

  SELECT COALESCE(sum(p.monto), 0)
  INTO v_cobrado
  FROM public.pagos p
  WHERE p.id_venta = p_id_venta;

  IF v_cobrado > v_venta.total THEN
    RAISE EXCEPTION 'Los cobros anteriores superan el total. Requiere revisión.';
  END IF;

  v_saldo := v_venta.total - v_cobrado;

  SELECT *
  INTO v_existente
  FROM public.pagos
  WHERE solicitud_id = p_solicitud_id;

  IF FOUND THEN
    IF v_existente.id_venta IS DISTINCT FROM p_id_venta
       OR v_existente.id_usuario IS DISTINCT FROM v_usuario
       OR v_existente.monto IS DISTINCT FROM v_monto
       OR v_existente.metodo_pago IS DISTINCT FROM p_metodo_pago THEN
      RAISE EXCEPTION 'El identificador del cobro pertenece a otra operación.';
    END IF;

    RETURN jsonb_build_object(
      'id_pago', v_existente.id_pago,
      'id_venta', p_id_venta,
      'monto', v_existente.monto,
      'total_cobrado', v_cobrado,
      'saldo', v_saldo,
      'ya_registrado', true
    );
  END IF;

  IF v_venta.tipo_venta IS NULL
     OR v_venta.tipo_venta NOT IN ('directa_stock', 'pedido_medida') THEN
    RAISE EXCEPTION 'Este tipo de operación no admite cobros.';
  END IF;

  IF v_venta.estado_pago IS NULL
     OR v_venta.estado_pago NOT IN (
       'pendiente', 'anticipo_cobrado', 'pagado'
     ) THEN
    RAISE EXCEPTION 'El estado de esta operación no permite registrar cobros.';
  END IF;

  IF v_venta.estado_pago = 'pagado' AND v_saldo > 0 THEN
    RAISE EXCEPTION 'La operación figura pagada, pero sus cobros no coinciden. Requiere revisión.';
  END IF;

  IF v_saldo <= 0 THEN
    RAISE EXCEPTION 'Esta operación ya está completamente pagada.';
  END IF;

  IF v_monto > v_saldo THEN
    RAISE EXCEPTION 'El monto supera el saldo pendiente de Bs %.', v_saldo;
  END IF;

  v_tipo_pago := CASE
    WHEN v_monto = v_saldo AND v_cobrado > 0 THEN 'saldo'
    WHEN v_monto = v_saldo THEN 'pago_total'
    ELSE 'abono'
  END;

  INSERT INTO public.pagos (
    id_venta,
    monto,
    metodo_pago,
    tipo_pago,
    id_usuario,
    solicitud_id
  )
  VALUES (
    p_id_venta,
    v_monto,
    p_metodo_pago,
    v_tipo_pago,
    v_usuario,
    p_solicitud_id
  )
  RETURNING id_pago INTO v_id_pago;

  v_cobrado := v_cobrado + v_monto;
  v_saldo := v_venta.total - v_cobrado;

  UPDATE public.ventas
  SET estado_pago = CASE
    WHEN v_saldo = 0 THEN 'pagado'
    ELSE 'anticipo_cobrado'
  END
  WHERE id_venta = p_id_venta;

  RETURN jsonb_build_object(
    'id_pago', v_id_pago,
    'id_venta', p_id_venta,
    'monto', v_monto,
    'total_cobrado', v_cobrado,
    'saldo', v_saldo,
    'ya_registrado', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_cobro_seguro(
  uuid, bigint, bigint, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.registrar_cobro_seguro(
  uuid, bigint, bigint, text
) TO authenticated;

COMMIT;