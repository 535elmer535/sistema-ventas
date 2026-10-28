-- MUEBLEX: mejora 09 - anulación de operaciones sin cobros.
-- Requiere el esquema del proyecto y las mejoras 01 a 08.
-- Las cuatro funciones se recuperaron del código exportado de Supabase.
-- Los campos, triggers y permisos se reconstruyen según los pasos aplicados.
-- Este archivo respalda la estructura y la lógica; no contiene los datos.
-- No llama a la función de anulación ni anula operaciones al ejecutarse.

BEGIN;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS estado_operacion text
    NOT NULL DEFAULT 'activa'
    CHECK (estado_operacion IN ('activa', 'anulada')),
  ADD COLUMN IF NOT EXISTS motivo_anulacion text,
  ADD COLUMN IF NOT EXISTS fecha_anulacion timestamptz,
  ADD COLUMN IF NOT EXISTS id_usuario_anulacion bigint
    REFERENCES public.usuarios(id_usuario),
  ADD COLUMN IF NOT EXISTS stock_reintegrado boolean
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS detalle_reintegro_stock jsonb
    NOT NULL DEFAULT '[]'::jsonb;


CREATE OR REPLACE FUNCTION public.verificar_venta_activa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_estado text;
BEGIN
  SELECT estado_operacion
  INTO v_estado
  FROM public.ventas
  WHERE id_venta = NEW.id_venta
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la operación.';
  END IF;

  IF v_estado IS DISTINCT FROM 'activa' THEN
    RAISE EXCEPTION
      'La operación está anulada y no permite este cambio.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verificar_entrega_venta_activa()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF OLD.estado_operacion IS DISTINCT FROM 'activa' THEN
    RAISE EXCEPTION
      'La operación está anulada y no permite modificar la entrega.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.anular_operacion_sin_cobros(p_id_venta bigint, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario bigint;
  v_rol text;
  v_venta public.ventas%ROWTYPE;
  v_motivo text := nullif(btrim(p_motivo), '');
  v_producto record;
  v_reintegros jsonb := '[]'::jsonb;
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
    WHEN no_data_found OR too_many_rows THEN
      RAISE EXCEPTION 'Tu cuenta necesita revisión en usuarios.';
  END;

  IF v_rol IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION
      'Solo el administrador puede anular operaciones.';
  END IF;

  IF p_id_venta IS NULL OR p_id_venta <= 0 THEN
    RAISE EXCEPTION 'Selecciona una operación válida.';
  END IF;

  IF v_motivo IS NULL OR char_length(v_motivo) > 500 THEN
    RAISE EXCEPTION
      'Escribe el motivo de anulación, de hasta 500 caracteres.';
  END IF;

  SELECT *
  INTO v_venta
  FROM public.ventas
  WHERE id_venta = p_id_venta
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la operación.';
  END IF;

  IF v_venta.estado_operacion = 'anulada' THEN
    RETURN jsonb_build_object(
      'id_venta', p_id_venta,
      'ya_anulada', true,
      'stock_reintegrado', v_venta.stock_reintegrado
    );
  END IF;

  IF v_venta.estado_operacion IS DISTINCT FROM 'activa'
     OR v_venta.tipo_venta IS NULL
     OR v_venta.tipo_venta NOT IN (
       'directa_stock', 'pedido_medida'
     ) THEN
    RAISE EXCEPTION 'Esta operación necesita revisión.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pagos
    WHERE id_venta = p_id_venta
  ) THEN
    RAISE EXCEPTION
      'La operación tiene cobros. Requiere gestionar la devolución.';
  END IF;

  IF v_venta.estado_pago IS DISTINCT FROM 'pendiente' THEN
    RAISE EXCEPTION
      'El estado del pago necesita revisión antes de anular.';
  END IF;

  IF v_venta.stock_reintegrado THEN
    RAISE EXCEPTION 'El inventario de esta operación necesita revisión.';
  END IF;

  IF v_venta.tipo_venta = 'pedido_medida' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.pedidos_personalizados
      WHERE id_venta = p_id_venta
    ) THEN
      RAISE EXCEPTION 'El pedido no tiene muebles registrados.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.pedidos_personalizados
      WHERE id_venta = p_id_venta
        AND (
          estado_taller IS NULL
          OR estado_taller NOT IN (
            'pendiente', 'en_fabricacion', 'listo'
          )
        )
    ) THEN
      RAISE EXCEPTION
        'El pedido está entregado o su estado necesita revisión.';
    END IF;
  ELSE
    IF NOT v_venta.stock_descontado THEN
      RAISE EXCEPTION
        'Esta venta antigua no tiene descuento de stock confirmado. Requiere revisión.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.detalle_ventas
      WHERE id_venta = p_id_venta
    ) OR EXISTS (
      SELECT 1
      FROM public.detalle_ventas
      WHERE id_venta = p_id_venta
        AND (cantidad IS NULL OR cantidad <= 0)
    ) THEN
      RAISE EXCEPTION 'Las cantidades de la venta necesitan revisión.';
    END IF;

    -- Bloquear los muebles en un orden fijo.
    PERFORM p.id_producto
    FROM public.productos AS p
    WHERE p.id_producto IN (
      SELECT d.id_producto
      FROM public.detalle_ventas AS d
      WHERE d.id_venta = p_id_venta
    )
    ORDER BY p.id_producto
    FOR UPDATE;

    FOR v_producto IN
      SELECT
        p.id_producto,
        p.existencia,
        sum(d.cantidad::bigint) AS cantidad
      FROM public.detalle_ventas AS d
      JOIN public.productos AS p
        ON p.id_producto = d.id_producto
      WHERE d.id_venta = p_id_venta
      GROUP BY p.id_producto, p.existencia
      ORDER BY p.id_producto
    LOOP
      IF v_producto.existencia IS NULL
         OR v_producto.existencia < 0
         OR v_producto.existencia::numeric
            + v_producto.cantidad > 2147483647 THEN
        RAISE EXCEPTION
          'La existencia no permite completar el reintegro.';
      END IF;

      UPDATE public.productos
      SET existencia = (
        v_producto.existencia + v_producto.cantidad
      )::integer
      WHERE id_producto = v_producto.id_producto;

      v_reintegros := v_reintegros || jsonb_build_array(
        jsonb_build_object(
          'id_producto', v_producto.id_producto,
          'cantidad', v_producto.cantidad,
          'existencia_anterior', v_producto.existencia,
          'existencia_nueva',
            v_producto.existencia + v_producto.cantidad
        )
      );
    END LOOP;
  END IF;

  UPDATE public.ventas
  SET
    estado_operacion = 'anulada',
    motivo_anulacion = v_motivo,
    fecha_anulacion = now(),
    id_usuario_anulacion = v_usuario,
    stock_reintegrado = (tipo_venta = 'directa_stock'),
    detalle_reintegro_stock = v_reintegros
  WHERE id_venta = p_id_venta;

  RETURN jsonb_build_object(
    'id_venta', p_id_venta,
    'ya_anulada', false,
    'stock_reintegrado',
      v_venta.tipo_venta = 'directa_stock',
    'reintegros', v_reintegros
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consultar_resumen_negocio(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS verificar_venta_activa_al_cobrar
ON public.pagos;

CREATE TRIGGER verificar_venta_activa_al_cobrar
BEFORE INSERT ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.verificar_venta_activa();

DROP TRIGGER IF EXISTS verificar_venta_activa_en_taller
ON public.pedidos_personalizados;

CREATE TRIGGER verificar_venta_activa_en_taller
BEFORE UPDATE OF estado_taller
ON public.pedidos_personalizados
FOR EACH ROW
EXECUTE FUNCTION public.verificar_venta_activa();

DROP TRIGGER IF EXISTS verificar_entrega_activa
ON public.ventas;

CREATE TRIGGER verificar_entrega_activa
BEFORE UPDATE OF
  modalidad_entrega,
  direccion_entrega,
  referencia_entrega,
  nombre_receptor,
  contacto_receptor,
  entrega_version
ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION public.verificar_entrega_venta_activa();

REVOKE ALL ON FUNCTION public.verificar_venta_activa()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.verificar_entrega_venta_activa()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.anular_operacion_sin_cobros(bigint, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.anular_operacion_sin_cobros(bigint, text)
TO authenticated;

REVOKE ALL ON FUNCTION public.consultar_resumen_negocio(date, date)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.consultar_resumen_negocio(date, date)
TO authenticated;

COMMIT;
