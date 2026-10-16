# Guía 14 — Autenticación de usuarios

## Actividad A — Cuentas de prueba

Conservé la cuenta de prueba que ya utilizaba y creé
una segunda cuenta en Supabase Authentication → Users.

Correos de las cuentas:

- elmersanchez535@gmail.com
- elmermelamina535@gmail.com

Al crear la segunda cuenta dejé Auto confirm user activado.
Las contraseñas no se incluyen en el proyecto ni en este documento.

Las pruebas de inicio y cierre de sesión están pendientes.

## Actividad C — Prueba de RLS

Ejecuté la misma consulta de productos desde la consola,
primero sin sesión y después con sesión iniciada.

- Sin sesión: data fue [] y error fue null.
- Con sesión: data devolvió dos productos y error fue null.

La consulta sin sesión no mostró productos.
Al iniciar sesión, pude consultar los dos registros.

Esta prueba comprueba la lectura de productos;
no prueba las operaciones de escritura ni las otras tablas.

### Sin sesión

![Consulta sin sesión](/diagramas/guia14-rls-sin-sesion.png)

### Con sesión

![Consulta con sesión](/diagramas/guia14-rls-con-sesion.png)

## 3.5 — Cambiar contraseña

Agregué un formulario para cambiar la contraseña de la
cuenta con sesión iniciada.

El formulario comprueba:

- Que la nueva contraseña tenga al menos 12 caracteres.
- Que los dos campos coincidan.

Utilicé clientesupabase.auth.updateUser({
password: nueva
}) para actualizarla.

### Prueba realizada

La página mostró “Contraseña actualizada correctamente”.
Cerré sesión y pude volver a entrar con el mismo correo
y la contraseña nueva.

No guardé ninguna contraseña en el código ni en este documento.

### Comparación con el inicio de sesión

Reutilicé el patrón de formulario, evento submit,
preventDefault(), lectura de campos y manejo de errores.

La llamada principal cambió de signInWithPassword()
a updateUser({ password: nueva }).

### Captura

![Contraseña actualizada](/diagramas/guia14-password-actualizada.png)

## 3.7 — Reflexión breve

La función iniciar() consulta si hay una sesión guardada
mediante clientesupabase.auth.getSession().

session contiene los datos de la sesión, incluido el usuario
autenticado. Si no hay sesión, su valor es null.

Si existe una sesión, mostramos el sistema y cargamos los datos.
Si no existe, mostramos el formulario de inicio de sesión.

En esta instrucción:

const {
data: { session },
error
} = await clientesupabase.auth.getSession();

se utiliza destructuring anidado porque session está dentro
del objeto data. En cambio, error está en el nivel principal
de la respuesta.

Esto permite obtener session y error en una sola instrucción.

### 3.8. Saludo con el nombre del usuario

Se agregó un saludo que consulta la tabla `usuarios` y busca el
nombre asociado al correo de la sesión activa.

Se probó el inicio y cierre de sesión con ambas cuentas:

- La cuenta de Elmer muestra «Bienvenido, elmer».
- La cuenta del vendedor muestra «Bienvenido, vendedor de prueba».

El saludo cambia correctamente al ingresar con otra cuenta.

![Saludo de Elmer](/diagramas/guia14-saludo-elmer.png)

![Saludo del vendedor](/diagramas/guia14-saludo-vendedor.png)
