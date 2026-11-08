-- MUEBLEX: creación y edición de nombres de categorías solo para administradores.
-- La descripción y los identificadores de las categorías existentes se conservan.
BEGIN;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.categorias FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id_categoria, nombre, descripcion),
       UPDATE (id_categoria, nombre, descripcion),
       REFERENCES (id_categoria, nombre, descripcion)
ON TABLE public.categorias FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.categorias TO authenticated;

DROP POLICY IF EXISTS "solo autenticados" ON public.categorias;
DROP POLICY IF EXISTS categorias_lectura ON public.categorias;
CREATE POLICY categorias_lectura ON public.categorias
FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.guardar_categoria_segura(
  p_nombre text,
  p_id_categoria bigint DEFAULT NULL,
  p_nombre_anterior text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_usuario bigint;
  v_rol text;
  v_nombre text := btrim(p_nombre);
  v_id bigint;
  v_nombre_actual text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  BEGIN
    SELECT u.id_usuario, u.rol INTO STRICT v_usuario, v_rol
    FROM public.usuarios AS u
    WHERE u.id_auth = auth.uid()
    FOR SHARE;
  EXCEPTION
    WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Tu cuenta necesita un perfil válido.';
  END;

  IF v_rol IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'Solo el administrador puede crear o editar categorías.';
  END IF;

  IF v_nombre IS NULL OR v_nombre !~ '[^[:space:]]' THEN
    RAISE EXCEPTION 'Escribe un nombre para la categoría.';
  END IF;

  IF p_id_categoria IS NOT NULL AND p_id_categoria <= 0 THEN
    RAISE EXCEPTION 'Selecciona una categoría válida.';
  END IF;

  -- Serializa las altas y los cambios de nombre para evitar duplicados concurrentes.
  -- Las consultas del catálogo pueden seguir leyendo durante esta operación breve.
  LOCK TABLE public.categorias IN SHARE ROW EXCLUSIVE MODE;

  IF p_id_categoria IS NULL THEN
    SELECT c.id_categoria, c.nombre INTO v_id, v_nombre_actual
    FROM public.categorias AS c
    WHERE lower(btrim(c.nombre)) = lower(v_nombre)
    ORDER BY c.id_categoria
    LIMIT 1;

    -- Repetir la misma creación devuelve la categoría existente.
    IF FOUND THEN
      RETURN jsonb_build_object(
        'id_categoria', v_id, 'nombre', v_nombre_actual, 'accion', 'existente'
      );
    END IF;

    INSERT INTO public.categorias (nombre) VALUES (v_nombre)
    RETURNING id_categoria INTO v_id;
    RETURN jsonb_build_object(
      'id_categoria', v_id, 'nombre', v_nombre, 'accion', 'creada'
    );
  END IF;

  SELECT c.nombre INTO v_nombre_actual
  FROM public.categorias AS c
  WHERE c.id_categoria = p_id_categoria
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La categoría ya no existe. Actualiza la lista.';
  END IF;

  IF v_nombre_actual IS NOT DISTINCT FROM v_nombre THEN
    RETURN jsonb_build_object(
      'id_categoria', p_id_categoria, 'nombre', v_nombre_actual, 'accion', 'sin_cambios'
    );
  END IF;

  IF v_nombre_actual IS DISTINCT FROM p_nombre_anterior THEN
    RAISE EXCEPTION 'La categoría cambió en otra sesión. Actualiza la lista antes de editarla.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.categorias AS c
    WHERE c.id_categoria <> p_id_categoria
      AND lower(btrim(c.nombre)) = lower(v_nombre)
  ) THEN
    RAISE EXCEPTION 'Ya existe otra categoría con ese nombre.';
  END IF;

  UPDATE public.categorias SET nombre = v_nombre
  WHERE id_categoria = p_id_categoria;

  RETURN jsonb_build_object(
    'id_categoria', p_id_categoria, 'nombre', v_nombre, 'accion', 'actualizada'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_categoria_segura(text, bigint, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_categoria_segura(text, bigint, text)
TO authenticated;

COMMIT;

-- Comprobación de permisos de escritura directa y ejecución de la función.
SELECT r.rolname AS rol,
  has_any_column_privilege(r.oid, 'public.categorias', 'INSERT') AS crear_directamente,
  has_any_column_privilege(r.oid, 'public.categorias', 'UPDATE') AS editar_directamente,
  has_table_privilege(r.oid, 'public.categorias', 'DELETE') AS eliminar_directamente,
  has_function_privilege(r.oid,
    'public.guardar_categoria_segura(text,bigint,text)', 'EXECUTE') AS llamar_funcion
FROM pg_roles AS r
WHERE r.rolname IN ('anon', 'authenticated')
ORDER BY r.rolname;
