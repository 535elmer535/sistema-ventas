
-- Guia 15: vinculacion de usuarios y permisos por rol.
-- Ejecutar una sola vez sobre el estado anterior a esta guia.
-- Estos cambios ya se aplicaron en nuestro proyecto.

BEGIN;

-- 1. Vincular usuarios con Authentication.
ALTER TABLE public.usuarios
ADD COLUMN id_auth uuid REFERENCES auth.users(id);

-- Asignar las cuentas usando los correos registrados.
UPDATE public.usuarios AS u
SET id_auth = a.id
FROM auth.users AS a
WHERE u.correo = a.email
  AND u.id_usuario IN (1, 4);

-- 2. Permisos de productos.
DROP POLICY "solo autenticados" ON public.productos;

CREATE POLICY "Autenticados consultan productos"
ON public.productos
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Autenticados crean productos"
ON public.productos
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Autenticados editan productos"
ON public.productos
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Solo administradores eliminan productos"
ON public.productos
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE usuarios.id_auth = auth.uid()
      AND usuarios.rol = 'administrador'
  )
);

-- 3. Permisos de clientes.
DROP POLICY "solo autenticados" ON public.clientes;

CREATE POLICY "Autenticados consultan clientes"
ON public.clientes
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Autenticados crean clientes"
ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Autenticados editan clientes"
ON public.clientes
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Solo administradores eliminan clientes"
ON public.clientes
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE usuarios.id_auth = auth.uid()
      AND usuarios.rol = 'administrador'
  )
);

-- 4. Proteger los roles: usuarios solo se consulta desde la app.
DROP POLICY "solo autenticados" ON public.usuarios;

CREATE POLICY "Autenticados consultan usuarios"
ON public.usuarios
FOR SELECT TO authenticated
USING (true);

COMMIT;