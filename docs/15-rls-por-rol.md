# Guía 15 — Permisos por rol

## Vinculación de usuarios con Authentication

Se agregó la columna `id_auth` a la tabla `usuarios`, como clave
foránea hacia `auth.users(id)`.

Se vinculó cada cuenta con su usuario:

- elmer: administrador.
- vendedor de prueba: vendedor.

Se verificaron los datos con:

SELECT \* FROM public.usuarios;

![Usuarios vinculados](/diagramas/guia15-usuarios-vinculados.png)

## Políticas de productos

Se reemplazó la política general `solo autenticados` por cuatro
políticas, una para cada operación:

- SELECT: permite consultar a usuarios autenticados.
- INSERT: permite crear a usuarios autenticados.
- UPDATE: permite editar a usuarios autenticados.
- DELETE: permite eliminar solo a administradores.

Se usaron políticas separadas porque PostgreSQL no admite
`FOR SELECT, INSERT, UPDATE` en una sola política.

![Políticas de productos](/diagramas/guia15-politicas-productos.png)

## Prueba con el vendedor

Desde la aplicación, se inició sesión como vendedor y se intentó
eliminar el producto PRUEBA RLS.

La aplicación mostró que no se pudo confirmar la eliminación.
El producto permaneció en la tabla, incluso después de actualizar
la página con F5.

![Vendedor no elimina](/diagramas/guia15-vendedor-no-elimina.png)

## Prueba con el administrador

Se cerró la sesión del vendedor y se ingresó como administrador.
Se eliminó el mismo producto PRUEBA RLS.

La aplicación confirmó la eliminación y el producto dejó de aparecer,
incluso después de actualizar la página con F5.

![Administrador elimina](/diagramas/guia15-administrador-elimina.png)

## 3.5. Eliminación de clientes por rol

Se reemplazó la política general de clientes por políticas separadas
para SELECT, INSERT, UPDATE y DELETE.

Consultar, registrar y editar siguen disponibles para usuarios
autenticados. Eliminar requiere el rol administrador.

![Políticas de clientes](/diagramas/guia15-politicas-clientes.png)

### Prueba con vendedor

Se intentó eliminar CLIENTE PRUEBA RLS desde la aplicación.
No se pudo confirmar la eliminación y el cliente permaneció
en la tabla, incluso después de actualizar con F5.

![Vendedor no elimina cliente](/diagramas/guia15-vendedor-no-elimina-cliente.png)

### Prueba con administrador

Se ingresó con la cuenta del administrador y se eliminó el mismo
cliente. La aplicación confirmó la eliminación y el cliente
siguió sin aparecer después de actualizar con F5.

![Administrador elimina cliente](/diagramas/guia15-administrador-elimina-cliente.png)

### SQL de la política de eliminación de clientes

```sql
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
```

Se aplicó el mismo patrón utilizado en productos, cambiando la tabla
a `clientes` y el nombre de la política.

También se eliminó la política general `solo autenticados`, que
permitía todas las operaciones, y se crearon políticas separadas
para SELECT, INSERT y UPDATE. Así, la política general ya no
permite eliminar a los vendedores.

## 3.7. Reflexión

```sql
WHERE usuarios.id_auth = auth.uid()
```

`auth.uid()` representa el identificador de Authentication de la
persona que está haciendo la solicitud desde la aplicación.

La política lo compara con `usuarios.id_auth` para encontrar
el usuario correspondiente y comprobar si su rol es administrador.

No se compara con `id_usuario`, porque ese es el identificador
numérico de nuestra tabla. Por ejemplo, elmer tiene `id_usuario = 4`,
pero su cuenta de Authentication tiene un identificador UUID distinto.

## Protección de los roles de usuarios

Como mejora adicional, se reemplazó la política ALL de `usuarios`
por una política de consulta. Así, las cuentas de la aplicación
no pueden modificar el rol ni la vinculación con Authentication.
Los usuarios se administran desde Supabase.

```sql
BEGIN;

DROP POLICY "solo autenticados" ON public.usuarios;

CREATE POLICY "Autenticados consultan usuarios"
ON public.usuarios
FOR SELECT TO authenticated
USING (true);

COMMIT;
```

Después del cambio se actualizó la aplicación y se comprobó que
el saludo, los productos y los clientes siguen cargando normalmente.

![Política de usuarios](/diagramas/guia15-politicas-usuarios.png)

## 3.8. Botones de eliminar según el rol

Se modificó `js/app.js` para consultar el nombre y el rol del usuario
mediante `id_auth`, usando el identificador de la sesión activa.

La variable `usuarioEsAdministrador` determina si se muestran
los botones Eliminar en las tablas de productos y clientes.

Se comprobó con ambas cuentas:

- Vendedor: ve Editar, pero no Eliminar.
- Administrador: ve Editar y Eliminar.

Ocultar los botones mejora la interfaz. Las políticas RLS siguen
controlando el permiso real de eliminación en la base de datos.

### Vista del vendedor

![Productos del vendedor](/diagramas/guia15-vendedor-sin-boton-productos.png)

![Clientes del vendedor](/diagramas/guia15-vendedor-sin-boton-clientes.png)

### Vista del administrador

![Productos del administrador](/diagramas/guia15-admin-con-boton-productos.png)

![Clientes del administrador](/diagramas/guia15-admin-con-boton-clientes.png)
