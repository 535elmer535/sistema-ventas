-- MUEBLEX: recuperación asistida. Ejecutar completa antes de las funciones Edge.
-- Transacción completa: cualquier incompatibilidad deshace la instalación.
BEGIN;

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS whatsapp_recuperacion text;
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_whatsapp_recuperacion_formato;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_whatsapp_recuperacion_formato
  CHECK (whatsapp_recuperacion IS NULL OR whatsapp_recuperacion ~ '^[1-9][0-9]{7,14}$');

-- Las cuentas existentes NO se marcan para cambiar contraseña al instalar.
-- La marca solo la establece el servidor cuando un administrador restablece acceso.
CREATE TABLE IF NOT EXISTS public.historial_recuperaciones_mueblex (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha timestamptz NOT NULL DEFAULT now(),
  operacion uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('restablecimiento','cambio_completado')),
  id_cuenta uuid NOT NULL,
  nombre_cuenta text NOT NULL,
  correo_cuenta text NOT NULL,
  id_responsable uuid NOT NULL,
  nombre_responsable text NOT NULL,
  UNIQUE (operacion,tipo)
);
ALTER TABLE public.historial_recuperaciones_mueblex ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historial_recuperaciones_mueblex FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historial_recuperaciones_mueblex TO service_role;

-- Conserva los permisos de lectura actuales; perfiles escritos solo desde servidor.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.usuarios FROM PUBLIC, anon, authenticated;
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT attname FROM pg_attribute
    WHERE attrelid='public.usuarios'::regclass AND attnum>0 AND NOT attisdropped
  LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I), REFERENCES (%I) ON public.usuarios FROM PUBLIC, anon, authenticated',c.attname,c.attname,c.attname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.administradores_recuperacion_mueblex()
RETURNS TABLE(nombre text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT u.nombre::text,u.whatsapp_recuperacion FROM public.usuarios u
  JOIN auth.users a ON a.id=u.id_auth
  WHERE u.rol='administrador' AND u.whatsapp_recuperacion IS NOT NULL
    AND coalesce(a.raw_app_meta_data->>'mueblex_cambio_pendiente','false')='false'
  ORDER BY u.nombre,u.id_usuario
$$;
REVOKE ALL ON FUNCTION public.administradores_recuperacion_mueblex() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.administradores_recuperacion_mueblex() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.acceso_operativo_mueblex()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users a JOIN public.usuarios u ON u.id_auth=a.id
    WHERE a.id=auth.uid()
      AND coalesce(a.raw_app_meta_data->>'mueblex_cambio_pendiente','false')='false'
      AND coalesce((auth.jwt()->>'iat')::bigint,0) >=
          coalesce((a.raw_app_meta_data->>'mueblex_restablecido_desde')::bigint,0))
$$;
REVOKE ALL ON FUNCTION public.acceso_operativo_mueblex() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acceso_operativo_mueblex() TO authenticated;

CREATE OR REPLACE FUNCTION public.exigir_acceso_mueblex()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.acceso_operativo_mueblex() THEN
    RAISE EXCEPTION 'Inicia sesión y completa el cambio de contraseña para continuar.' USING ERRCODE='42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.exigir_acceso_mueblex() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exigir_acceso_mueblex() TO authenticated;

CREATE OR REPLACE FUNCTION public.estado_recuperacion_mueblex()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a auth.users%ROWTYPE; perfil public.usuarios%ROWTYPE;
BEGIN
  SELECT * INTO a FROM auth.users WHERE id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Inicia sesión.' USING ERRCODE='42501'; END IF;
  IF coalesce((auth.jwt()->>'iat')::bigint,0) <
     coalesce((a.raw_app_meta_data->>'mueblex_restablecido_desde')::bigint,0) THEN
    RAISE EXCEPTION 'Vuelve a iniciar sesión después del restablecimiento.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO STRICT perfil FROM public.usuarios WHERE id_auth=a.id;
  RETURN jsonb_build_object('requiere_cambio',coalesce(a.raw_app_meta_data->>'mueblex_cambio_pendiente','false')<>'false');
END $$;
REVOKE ALL ON FUNCTION public.estado_recuperacion_mueblex() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estado_recuperacion_mueblex() TO authenticated;

-- El bloqueo funciona también con llamadas directas a tablas y JWT anteriores.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['usuarios','categorias','productos','clientes','ventas',
    'detalle_ventas','pagos','pedidos_personalizados','movimientos_stock',
    'historial_estados_pedidos','devoluciones']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'La tabla % falta o no tiene RLS activo. Revisa la instalación.',t;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS mueblex_password_obligatoria ON public.%I',t);
    EXECUTE format('CREATE POLICY mueblex_password_obligatoria ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.acceso_operativo_mueblex())) WITH CHECK ((SELECT public.acceso_operativo_mueblex()))',t);
  END LOOP;
END $$;

-- Las RPC SECURITY DEFINER pueden evitar RLS: también se añade el control allí.
-- Se conservan firma, cuerpo previo, propietario y permisos de cada función.
CREATE SCHEMA IF NOT EXISTS mueblex_respaldo;
REVOKE ALL ON SCHEMA mueblex_respaldo FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS mueblex_respaldo.funciones_recuperacion (
  firma text PRIMARY KEY, definicion text NOT NULL, fecha timestamptz DEFAULT now()
);
ALTER TABLE mueblex_respaldo.funciones_recuperacion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mueblex_respaldo.funciones_recuperacion FROM PUBLIC,anon,authenticated;
DO $$
DECLARE nombre text; f record; cuerpo text; definicion text; encontrados integer;
BEGIN
  FOREACH nombre IN ARRAY ARRAY['registrar_venta_stock','registrar_pedido_seguro',
    'registrar_mueble_seguro','registrar_cobro_seguro','consultar_resumen_negocio',
    'avanzar_estado_pedido','guardar_entrega_pedido','reponer_stock_seguro',
    'actualizar_precio_mueble','anular_operacion_sin_cobros',
    'anular_operacion_con_devolucion','guardar_categoria_segura']
  LOOP
    encontrados:=0;
    FOR f IN SELECT p.oid,p.prosrc,l.lanname FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
      WHERE n.nspname='public' AND p.proname=nombre AND p.prokind='f'
    LOOP
      encontrados:=encontrados+1;
      IF f.lanname<>'plpgsql' THEN RAISE EXCEPTION 'Revisa la función %: lenguaje inesperado.',nombre; END IF;
      IF position('PERFORM public.exigir_acceso_mueblex();' IN f.prosrc)=0 THEN
        definicion:=pg_get_functiondef(f.oid);
        INSERT INTO mueblex_respaldo.funciones_recuperacion(firma,definicion)
          VALUES(f.oid::regprocedure::text,definicion) ON CONFLICT DO NOTHING;
        cuerpo:=regexp_replace(f.prosrc,'\mBEGIN\M',E'BEGIN\n  PERFORM public.exigir_acceso_mueblex();','i');
        IF cuerpo=f.prosrc THEN RAISE EXCEPTION 'No se pudo adaptar %.',nombre; END IF;
        -- Sustituye exactamente el cuerpo, sin reconstruir su firma ni sus opciones.
        definicion:=replace(definicion,f.prosrc,cuerpo);
        EXECUTE definicion;
      END IF;
    END LOOP;
    IF encontrados=0 THEN RAISE EXCEPTION 'Falta la función %. No se ha aplicado ningún cambio.',nombre; END IF;
  END LOOP;
END $$;

-- Supabase guarda contraseña y app_metadata dentro de una transacción, en updates
-- separados. Este trigger DIFERIDO comprueba el estado FINAL y registra el cambio
-- en esa misma transacción. Si falla el historial, se revierte la contraseña.
CREATE OR REPLACE FUNCTION public.auditar_recuperacion_mueblex()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actual auth.users%ROWTYPE; actor public.usuarios%ROWTYPE;
  cuenta public.usuarios%ROWTYPE; v_operacion uuid; v_responsable uuid;
BEGIN
  SELECT * INTO actual FROM auth.users WHERE id=NEW.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO cuenta FROM public.usuarios WHERE id_auth=actual.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF actual.raw_app_meta_data->>'mueblex_restablecimiento_id' IS DISTINCT FROM
      OLD.raw_app_meta_data->>'mueblex_restablecimiento_id'
     AND actual.raw_app_meta_data->>'mueblex_cambio_pendiente'='true' THEN
    v_operacion:=(actual.raw_app_meta_data->>'mueblex_restablecimiento_id')::uuid;
    v_responsable:=(actual.raw_app_meta_data->>'mueblex_restablecido_por')::uuid;
    SELECT u.* INTO STRICT actor FROM public.usuarios u JOIN auth.users a ON a.id=u.id_auth
      WHERE u.id_auth=v_responsable AND u.rol='administrador'
        AND coalesce(a.raw_app_meta_data->>'mueblex_cambio_pendiente','false')='false';
    IF v_responsable=actual.id THEN RAISE EXCEPTION 'Usa Cambiar contraseña para tu propia cuenta.'; END IF;
    INSERT INTO public.historial_recuperaciones_mueblex
      (operacion,tipo,id_cuenta,nombre_cuenta,correo_cuenta,id_responsable,nombre_responsable)
      VALUES(v_operacion,'restablecimiento',actual.id,cuenta.nombre,actual.email,v_responsable,actor.nombre)
      ON CONFLICT (operacion,tipo) DO NOTHING;
  ELSIF OLD.raw_app_meta_data->>'mueblex_cambio_pendiente'='true'
    AND actual.raw_app_meta_data->>'mueblex_cambio_pendiente'='false' THEN
    IF actual.raw_app_meta_data->>'mueblex_completar_version' IS DISTINCT FROM
       OLD.raw_app_meta_data->>'mueblex_restablecimiento_id' THEN
      RAISE EXCEPTION 'La contraseña temporal cambió. Vuelve a iniciar sesión.';
    END IF;
    v_operacion:=(OLD.raw_app_meta_data->>'mueblex_restablecimiento_id')::uuid;
    INSERT INTO public.historial_recuperaciones_mueblex
      (operacion,tipo,id_cuenta,nombre_cuenta,correo_cuenta,id_responsable,nombre_responsable)
      VALUES(v_operacion,'cambio_completado',actual.id,cuenta.nombre,actual.email,actual.id,cuenta.nombre)
      ON CONFLICT (operacion,tipo) DO NOTHING;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.auditar_recuperacion_mueblex() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS mueblex_auditar_recuperacion ON auth.users;
CREATE CONSTRAINT TRIGGER mueblex_auditar_recuperacion AFTER UPDATE ON auth.users
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION public.auditar_recuperacion_mueblex();

COMMIT;

-- Comprobación: deben aparecer 12 nombres; sus cuerpos incluyen el control.
SELECT p.proname AS funcion,
  position('PERFORM public.exigir_acceso_mueblex();' IN p.prosrc)>0 AS protegida
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'registrar_venta_stock','registrar_pedido_seguro','registrar_mueble_seguro',
  'registrar_cobro_seguro','consultar_resumen_negocio','avanzar_estado_pedido',
  'guardar_entrega_pedido','reponer_stock_seguro','actualizar_precio_mueble',
  'anular_operacion_sin_cobros','anular_operacion_con_devolucion','guardar_categoria_segura'
)
ORDER BY p.proname;
