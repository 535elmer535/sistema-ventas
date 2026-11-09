-- Corrige solo el registro de recuperaciones. No cambia cuentas ni contraseñas.
BEGIN;
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
COMMIT;

SELECT
  position('v_operacion uuid' IN p.prosrc)>0 AS correccion_aplicada
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='auditar_recuperacion_mueblex';
