-- MUEBLEX: ventas y pedidos mediante funciones seguras.
-- Respaldo del codigo exportado de Supabase el 2026-10-27.
-- Requiere las tablas existentes del proyecto y Supabase Auth.
-- No es un respaldo de datos ni crea la base de datos completa.
-- Guardar en docs/sql/mejora-01-ventas-pedidos-seguros.sql.
-- La copia local no se ejecuta automaticamente desde la pagina.
-- Las ventas antiguas no se recalculan ni descuentan stock retroactivamente.
-- Las ventas de stock se registran pendientes de cobro: el cobro se implementara aparte.

BEGIN;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS solicitud_id uuid,
  ADD COLUMN IF NOT EXISTS solicitud_datos jsonb,
  ADD COLUMN IF NOT EXISTS stock_descontado boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS ventas_solicitud_id_unico
  ON public.ventas (solicitud_id)
  WHERE solicitud_id IS NOT NULL;

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS id_usuario bigint
  REFERENCES public.usuarios(id_usuario);

CREATE OR REPLACE FUNCTION public.registrar_venta_stock(p_solicitud_id uuid, p_detalles jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_auth uuid := auth.uid();
  v_usuario bigint;
  v_rol text;
  v_existente public.ventas%ROWTYPE;
  v_item jsonb;
  v_linea record;
  v_cantidad_lineas integer;
  v_productos_encontrados integer;
  v_total numeric := 0;
  v_id_venta bigint;
BEGIN
  -- La identidad se obtiene de la sesión, no del navegador.
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrar una venta.';
  END IF;

  BEGIN
    SELECT u.id_usuario, u.rol
    INTO STRICT v_usuario, v_rol
    FROM public.usuarios AS u
    WHERE u.id_auth = v_auth
    FOR SHARE;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Tu cuenta no tiene un perfil asociado.';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Tu cuenta tiene perfiles duplicados. Consulta al administrador.';
  END;

  IF v_rol IS NULL
     OR v_rol NOT IN ('administrador', 'vendedor') THEN
    RAISE EXCEPTION 'Tu cuenta no está autorizada para registrar ventas.';
  END IF;

  IF p_solicitud_id IS NULL THEN
    RAISE EXCEPTION 'Falta el identificador del envío.';
  END IF;

  IF jsonb_typeof(p_detalles) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'La lista de muebles no es válida.';
  END IF;

  v_cantidad_lineas := jsonb_array_length(p_detalles);

  IF v_cantidad_lineas < 1 OR v_cantidad_lineas > 100 THEN
    RAISE EXCEPTION 'La venta debe contener entre 1 y 100 muebles diferentes.';
  END IF;

  -- Validar los datos antes de convertirlos a números.
  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_detalles)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Una línea de la venta no es válida.';
    END IF;

    IF jsonb_typeof(v_item -> 'id_producto') IS DISTINCT FROM 'number'
       OR COALESCE(v_item ->> 'id_producto', '') !~ '^[1-9][0-9]*$'
       OR jsonb_typeof(v_item -> 'cantidad') IS DISTINCT FROM 'number'
       OR COALESCE(v_item ->> 'cantidad', '') !~ '^[1-9][0-9]*$'
       OR jsonb_typeof(v_item -> 'precio_centavos') IS DISTINCT FROM 'number'
       OR COALESCE(v_item ->> 'precio_centavos', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Cada mueble debe tener producto, cantidad y precio válidos.';
    END IF;

    IF (v_item ->> 'id_producto')::numeric > 9007199254740991
       OR (v_item ->> 'cantidad')::numeric > 2147483647
       OR (v_item ->> 'precio_centavos')::numeric > 9007199254740991 THEN
      RAISE EXCEPTION 'Un valor supera el rango permitido.';
    END IF;
  END LOOP;

  IF (
    SELECT count(DISTINCT x.id_producto)
    FROM jsonb_to_recordset(p_detalles)
      AS x(id_producto bigint, cantidad integer, precio_centavos bigint)
  ) <> v_cantidad_lineas THEN
    RAISE EXCEPTION 'La lista contiene productos repetidos.';
  END IF;

  -- Serializar los reintentos del mismo envío.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_solicitud_id::text, 0)
  );

  SELECT *
  INTO v_existente
  FROM public.ventas
  WHERE solicitud_id = p_solicitud_id;

  IF FOUND THEN
    IF v_existente.id_usuario IS DISTINCT FROM v_usuario
       OR v_existente.tipo_venta IS DISTINCT FROM 'directa_stock'
       OR v_existente.solicitud_datos IS DISTINCT FROM p_detalles THEN
      RAISE EXCEPTION 'El identificador del envío ya pertenece a otra operación.';
    END IF;

    RETURN jsonb_build_object(
      'id_venta', v_existente.id_venta,
      'total', v_existente.total,
      'ya_registrada', true
    );
  END IF;

  -- Bloquear los productos en un orden fijo durante el guardado.
  PERFORM p.id_producto
  FROM public.productos AS p
  JOIN jsonb_to_recordset(p_detalles)
    AS x(id_producto bigint, cantidad integer, precio_centavos bigint)
    ON x.id_producto = p.id_producto
  ORDER BY p.id_producto
  FOR UPDATE OF p;

  SELECT count(*)
  INTO v_productos_encontrados
  FROM public.productos AS p
  JOIN jsonb_to_recordset(p_detalles)
    AS x(id_producto bigint, cantidad integer, precio_centavos bigint)
    ON x.id_producto = p.id_producto;

  IF v_productos_encontrados <> v_cantidad_lineas THEN
    RAISE EXCEPTION 'Uno de los muebles ya no existe. Actualiza el inventario.';
  END IF;

  FOR v_linea IN
    SELECT
      p.nombre,
      p.precio,
      p.existencia,
      x.cantidad,
      x.precio_centavos
    FROM public.productos AS p
    JOIN jsonb_to_recordset(p_detalles)
      AS x(id_producto bigint, cantidad integer, precio_centavos bigint)
      ON x.id_producto = p.id_producto
  LOOP
    IF v_linea.precio IS NULL
       OR v_linea.precio::text IN ('NaN', 'Infinity', '-Infinity')
       OR v_linea.precio <= 0
       OR v_linea.precio <> round(v_linea.precio, 2) THEN
      RAISE EXCEPTION 'El mueble % tiene un precio inválido.', v_linea.nombre;
    END IF;

    IF v_linea.precio * 100 <> v_linea.precio_centavos THEN
      RAISE EXCEPTION 'Cambió el precio de %. Actualiza la lista antes de confirmar.',
        v_linea.nombre;
    END IF;

    IF v_linea.existencia IS NULL
       OR v_linea.existencia < v_linea.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %.',
        v_linea.nombre, v_linea.existencia;
    END IF;

    v_total := v_total + v_linea.precio * v_linea.cantidad;
  END LOOP;

  IF v_total * 100 > 9007199254740991 THEN
    RAISE EXCEPTION 'El total supera el rango permitido.';
  END IF;

  INSERT INTO public.ventas (
    id_usuario,
    tipo_venta,
    total,
    estado_pago,
    solicitud_id,
    solicitud_datos,
    stock_descontado
  )
  VALUES (
    v_usuario,
    'directa_stock',
    v_total,
    'pendiente',
    p_solicitud_id,
    p_detalles,
    true
  )
  RETURNING id_venta INTO v_id_venta;

  INSERT INTO public.detalle_ventas (
    id_venta,
    id_producto,
    cantidad,
    precio_unitario,
    subtotal
  )
  SELECT
    v_id_venta,
    p.id_producto,
    x.cantidad,
    p.precio,
    p.precio * x.cantidad
  FROM public.productos AS p
  JOIN jsonb_to_recordset(p_detalles)
    AS x(id_producto bigint, cantidad integer, precio_centavos bigint)
    ON x.id_producto = p.id_producto;

  UPDATE public.productos AS p
  SET existencia = p.existencia - x.cantidad
  FROM jsonb_to_recordset(p_detalles)
    AS x(id_producto bigint, cantidad integer, precio_centavos bigint)
  WHERE p.id_producto = x.id_producto;

  RETURN jsonb_build_object(
    'id_venta', v_id_venta,
    'total', v_total,
    'ya_registrada', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_pedido_seguro(p_solicitud_id uuid, p_id_cliente bigint, p_detalles jsonb, p_recibido_centavos bigint, p_metodo_pago text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_auth uuid := auth.uid();
  v_usuario bigint;
  v_rol text;
  v_existente public.ventas%ROWTYPE;
  v_solicitud jsonb;
  v_item jsonb;
  v_cantidad integer;
  v_precio_centavos numeric;
  v_total_centavos numeric := 0;
  v_fecha date;
  v_hoy date := (now() AT TIME ZONE 'America/La_Paz')::date;
  v_estado text;
  v_metodo text;
  v_id_venta bigint;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrar un pedido.';
  END IF;

  BEGIN
    SELECT u.id_usuario, u.rol
    INTO STRICT v_usuario, v_rol
    FROM public.usuarios AS u
    WHERE u.id_auth = v_auth
    FOR SHARE;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Tu cuenta no tiene un perfil asociado.';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Tu cuenta tiene perfiles duplicados. Consulta al administrador.';
  END;

  IF v_rol IS NULL
     OR v_rol NOT IN ('administrador', 'vendedor') THEN
    RAISE EXCEPTION 'Tu cuenta no está autorizada para registrar pedidos.';
  END IF;

  IF p_solicitud_id IS NULL THEN
    RAISE EXCEPTION 'Falta el identificador del envío.';
  END IF;

  IF p_id_cliente IS NULL OR p_id_cliente <= 0 THEN
    RAISE EXCEPTION 'Selecciona un cliente válido.';
  END IF;

  IF jsonb_typeof(p_detalles) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'La lista de muebles no es válida.';
  END IF;

  IF jsonb_array_length(p_detalles) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'El pedido debe contener entre 1 y 100 líneas.';
  END IF;

  IF p_recibido_centavos IS NULL OR p_recibido_centavos < 0 THEN
    RAISE EXCEPTION 'El importe recibido no puede ser negativo.';
  END IF;

  v_metodo := CASE
    WHEN p_recibido_centavos = 0 THEN NULL
    ELSE p_metodo_pago
  END;

  IF p_recibido_centavos > 0
     AND (
       v_metodo IS NULL
       OR v_metodo NOT IN ('efectivo', 'QR', 'transferencia')
     ) THEN
    RAISE EXCEPTION 'Selecciona un método de pago válido.';
  END IF;

  v_solicitud := jsonb_build_object(
    'id_cliente', p_id_cliente,
    'detalles', p_detalles,
    'recibido_centavos', p_recibido_centavos,
    'metodo_pago', v_metodo
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_solicitud_id::text, 0)
  );

  SELECT *
  INTO v_existente
  FROM public.ventas
  WHERE solicitud_id = p_solicitud_id;

  IF FOUND THEN
    IF v_existente.id_usuario IS DISTINCT FROM v_usuario
       OR v_existente.tipo_venta IS DISTINCT FROM 'pedido_medida'
       OR v_existente.solicitud_datos IS DISTINCT FROM v_solicitud THEN
      RAISE EXCEPTION 'El identificador del envío ya pertenece a otra operación.';
    END IF;

    RETURN jsonb_build_object(
      'id_venta', v_existente.id_venta,
      'total', v_existente.total,
      'recibido', p_recibido_centavos::numeric / 100,
      'saldo', v_existente.total - p_recibido_centavos::numeric / 100,
      'ya_registrada', true
    );
  END IF;

  -- Verificar que el cliente existe y tiene contacto.
  PERFORM c.id_cliente
  FROM public.clientes AS c
  WHERE c.id_cliente = p_id_cliente
    AND btrim(c.contacto) <> ''
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selecciona un cliente registrado que tenga contacto.';
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_detalles)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Una línea del pedido no es válida.';
    END IF;

    IF jsonb_typeof(v_item -> 'descripcion') IS DISTINCT FROM 'string'
       OR jsonb_typeof(v_item -> 'medidas') IS DISTINCT FROM 'string'
       OR jsonb_typeof(v_item -> 'color') IS DISTINCT FROM 'string'
       OR btrim(COALESCE(v_item ->> 'descripcion', '')) = ''
       OR btrim(COALESCE(v_item ->> 'medidas', '')) = ''
       OR btrim(COALESCE(v_item ->> 'color', '')) = '' THEN
      RAISE EXCEPTION 'Completa descripción, medidas y color de cada mueble.';
    END IF;

    IF length(v_item ->> 'descripcion') > 2000
       OR length(v_item ->> 'medidas') > 2000
       OR length(v_item ->> 'color') > 200 THEN
      RAISE EXCEPTION 'La descripción, medidas o color superan la longitud permitida.';
    END IF;

    IF jsonb_typeof(v_item -> 'cantidad') IS DISTINCT FROM 'number'
       OR COALESCE(v_item ->> 'cantidad', '') !~ '^[1-9][0-9]*$'
       OR jsonb_typeof(v_item -> 'precio_centavos') IS DISTINCT FROM 'number'
       OR COALESCE(v_item ->> 'precio_centavos', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'La cantidad y el precio de cada mueble deben ser válidos.';
    END IF;

    IF (v_item ->> 'cantidad')::numeric > 2147483647
       OR (v_item ->> 'precio_centavos')::numeric > 9007199254740991 THEN
      RAISE EXCEPTION 'La cantidad o el precio superan el rango permitido.';
    END IF;

    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_precio_centavos := (v_item ->> 'precio_centavos')::numeric;

    IF jsonb_typeof(v_item -> 'fecha_entrega') IS DISTINCT FROM 'string'
       OR COALESCE(v_item ->> 'fecha_entrega', '')
          !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'La fecha de entrega no es válida.';
    END IF;

    BEGIN
      v_fecha := (v_item ->> 'fecha_entrega')::date;
    EXCEPTION
      WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RAISE EXCEPTION 'La fecha de entrega no es válida.';
    END;

    IF v_fecha < v_hoy THEN
      RAISE EXCEPTION 'La fecha de entrega no puede ser anterior a hoy.';
    END IF;

    v_total_centavos :=
      v_total_centavos + v_precio_centavos * v_cantidad;
  END LOOP;

  IF v_total_centavos > 9007199254740991 THEN
    RAISE EXCEPTION 'El total del pedido supera el rango permitido.';
  END IF;

  IF p_recibido_centavos > v_total_centavos THEN
    RAISE EXCEPTION 'El importe recibido no puede superar el total del pedido.';
  END IF;

  v_estado := CASE
    WHEN p_recibido_centavos = 0 THEN 'pendiente'
    WHEN p_recibido_centavos = v_total_centavos THEN 'pagado'
    ELSE 'anticipo_cobrado'
  END;

  INSERT INTO public.ventas (
    id_usuario,
    id_cliente,
    tipo_venta,
    total,
    estado_pago,
    solicitud_id,
    solicitud_datos,
    stock_descontado
  )
  VALUES (
    v_usuario,
    p_id_cliente,
    'pedido_medida',
    v_total_centavos / 100,
    v_estado,
    p_solicitud_id,
    v_solicitud,
    false
  )
  RETURNING id_venta INTO v_id_venta;

  INSERT INTO public.pedidos_personalizados (
    id_venta,
    descripcion_mueble,
    medidas,
    color_melamina,
    estado_taller,
    fecha_entrega_estimada,
    cantidad,
    precio_unitario,
    subtotal
  )
  SELECT
    v_id_venta,
    btrim(x.descripcion),
    btrim(x.medidas),
    btrim(x.color),
    'pendiente',
    x.fecha_entrega::date,
    x.cantidad,
    x.precio_centavos::numeric / 100,
    x.precio_centavos::numeric * x.cantidad / 100
  FROM jsonb_to_recordset(p_detalles) AS x(
    descripcion text,
    medidas text,
    color text,
    fecha_entrega text,
    cantidad integer,
    precio_centavos bigint
  );

  IF p_recibido_centavos > 0 THEN
    INSERT INTO public.pagos (
      id_venta,
      monto,
      metodo_pago,
      tipo_pago,
      id_usuario
    )
    VALUES (
      v_id_venta,
      p_recibido_centavos::numeric / 100,
      v_metodo,
      CASE
        WHEN p_recibido_centavos = v_total_centavos THEN 'pago_total'
        ELSE 'anticipo'
      END,
      v_usuario
    );
  END IF;

  RETURN jsonb_build_object(
    'id_venta', v_id_venta,
    'total', v_total_centavos / 100,
    'recibido', p_recibido_centavos::numeric / 100,
    'saldo', (v_total_centavos - p_recibido_centavos) / 100,
    'ya_registrada', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.registrar_venta_stock(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta_stock(uuid, jsonb)
  TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_pedido_seguro(uuid, bigint, jsonb, bigint, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pedido_seguro(uuid, bigint, jsonb, bigint, text)
  TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON TABLE public.ventas, public.detalle_ventas,
  public.pedidos_personalizados, public.pagos
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.ventas, public.detalle_ventas,
  public.pedidos_personalizados, public.pagos
TO authenticated;

COMMIT;
