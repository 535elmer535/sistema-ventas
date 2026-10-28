
BEGIN;

CREATE OR REPLACE FUNCTION public.consultar_resumen_negocio(
  p_desde date DEFAULT NULL,
  p_hasta date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_usuario bigint;
  v_rol text;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para consultar reportes.';
  END IF;

  BEGIN
    SELECT u.id_usuario, u.rol
    INTO STRICT v_usuario, v_rol
    FROM public.usuarios u
    WHERE u.id_auth = auth.uid();
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Tu cuenta no tiene un perfil asociado.';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Tu cuenta tiene perfiles duplicados.';
  END;

  IF v_rol IS NULL
     OR v_rol NOT IN ('administrador', 'vendedor') THEN
    RAISE EXCEPTION 'Tu cuenta no está autorizada para consultar reportes.';
  END IF;

  IF p_desde IS NOT NULL
     AND p_hasta IS NOT NULL
     AND p_desde > p_hasta THEN
    RAISE EXCEPTION 'La fecha Desde no puede ser posterior a Hasta.';
  END IF;

  v_inicio := CASE
    WHEN p_desde IS NULL THEN '-infinity'::timestamptz
    ELSE p_desde::timestamp AT TIME ZONE 'America/La_Paz'
  END;

  v_fin := CASE
    WHEN p_hasta IS NULL THEN 'infinity'::timestamptz
    ELSE (p_hasta + 1)::timestamp AT TIME ZONE 'America/La_Paz'
  END;

  WITH ventas_periodo AS (
    SELECT v.total
    FROM public.ventas v
    WHERE v.fecha_venta >= v_inicio
      AND v.fecha_venta < v_fin
      AND v.tipo_venta IN ('directa_stock', 'pedido_medida')
      AND v.estado_operacion = 'activa'
  ),
  cobros_periodo AS (
    SELECT p.monto, p.metodo_pago
    FROM public.pagos p
    JOIN public.ventas v ON v.id_venta = p.id_venta
    WHERE p.fecha_pago >= v_inicio
      AND p.fecha_pago < v_fin
      AND v.tipo_venta IN ('directa_stock', 'pedido_medida')
  )
  SELECT jsonb_build_object(
    'cantidad_ventas',
      (SELECT count(*) FROM ventas_periodo),
    'total_vendido',
      (SELECT COALESCE(sum(total), 0)::text FROM ventas_periodo),
    'cantidad_cobros',
      (SELECT count(*) FROM cobros_periodo),
    'total_cobrado',
      (SELECT COALESCE(sum(monto), 0)::text FROM cobros_periodo),
    'cobrado_efectivo',
      (
        SELECT COALESCE(sum(monto), 0)::text
        FROM cobros_periodo
        WHERE metodo_pago = 'efectivo'
      ),
    'cobrado_qr',
      (
        SELECT COALESCE(sum(monto), 0)::text
        FROM cobros_periodo
        WHERE metodo_pago = 'QR'
      ),
    'cobrado_transferencia',
      (
        SELECT COALESCE(sum(monto), 0)::text
        FROM cobros_periodo
        WHERE metodo_pago = 'transferencia'
      ),
    'cobrado_otros',
      (
        SELECT COALESCE(sum(monto), 0)::text
        FROM cobros_periodo
        WHERE metodo_pago IS NULL
           OR metodo_pago NOT IN ('efectivo', 'QR', 'transferencia')
      )
  )
  INTO v_resultado;

  RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_resumen_negocio(date, date)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.consultar_resumen_negocio(date, date)
TO authenticated;

COMMIT;