# Recuperación asistida de acceso

## Estado actual — 9 de noviembre de 2026

Instalada en el Supabase del usuario y probada desde Live Server. La recuperación
por WhatsApp, el restablecimiento, el cambio obligatorio y el historial fueron
comprobados con una cuenta de vendedor de prueba. La interfaz se publicó posteriormente en Netlify según la Guía 23.
No se registró una repetición completa del flujo de recuperación en producción. Las pruebas adicionales sin ejecutar se conservan abajo.

## Funcionamiento

La persona solicita ayuda seleccionando un contacto publicado. La aplicación
prepara un enlace `wa.me` con correo y destinatario, sin consultar si la cuenta
existe. WhatsApp requiere que la persona pulse Enviar.

El administrador verifica la identidad por un medio conocido y establece una
contraseña temporal desde Administración. No puede recuperar la contraseña
anterior. El usuario debe cambiar la temporal por una contraseña propia antes de
acceder al negocio y volver a iniciar sesión después del cambio.

## Decisiones de implementación

- Módulo separado `js/recuperacion-mueblex.js`; `app.js` se conserva.
- `auth.js` consulta el estado en Supabase antes de cargar la aplicación.
- Solo se añade `whatsapp_recuperacion` a los perfiles existentes.
- Los teléfonos publicados son de ayuda, no se reutilizan automáticamente los
  contactos privados registrados al crear una cuenta.
- `gestionar-recuperacion` valida JWT consultando Auth y perfil administrador
  en cada operación administrativa. Usa una lista cerrada de acciones y campos.
- Un usuario con cambio pendiente solo puede completar su propio cambio mediante
  esa función; debe demostrar que conoce la contraseña temporal vigente.
- Las marcas están en `auth.users.raw_app_meta_data`, administradas por el servidor.
  La aplicación no confía en `user_metadata` ni en una bandera guardada en el navegador.
- La base consulta la marca actual y la fecha de emisión del JWT. Las políticas
  restrictivas bloquean las 11 tablas conocidas y se añade un control a las 12
  RPC del negocio, incluidas las SECURITY DEFINER que evitan RLS.
- Las definiciones previas de las RPC se respaldan en un esquema privado antes de
  introducir el control. La instalación se revierte si falta una función esperada.
- Un trigger de contraseña diferido registra el resultado final de la transacción
  Auth. El historial y la contraseña se confirman o revierten juntos. El historial
  solo contiene fecha, cuenta, tipo de acción y responsable; nunca contraseñas.
- La finalización identifica la versión del restablecimiento para rechazar una
  contraseña que otro administrador haya sustituido mientras se completaba el cambio.
- El límite de contraseña del flujo nuevo es mínimo 12 unidades de texto JS y
  máximo 72 bytes UTF-8, para evitar truncamiento de contraseñas largas.
- Este flujo no sustituye la configuración de MFA. Si la cuenta tiene un factor
  verificado, debe intervenir el responsable de Supabase.

## Pruebas reales comprobadas

- [x] SQL aplicado: el CSV del usuario muestra 12 funciones protegidas.
- [x] `gestionar-recuperacion` desplegada y `registrar-usuario` actualizada.
- [x] Administrador publica un número de ayuda; el usuario confirma apertura de
      WhatsApp y envío del mensaje al contacto elegido.
- [x] Restablecimiento de «Vendedor prueba Guía 22» registrado con responsable.
- [x] La contraseña temporal muestra «Crea tu nueva contraseña» y oculta el panel.
- [x] El usuario completa el cambio y entra con la contraseña nueva.
- [x] El usuario confirma que la contraseña temporal anterior fue rechazada.
- [x] Historial con «Contraseña temporal establecida» y «Cambio obligatorio completado».
- [x] Panel de recuperación oculto al vendedor; consulta directa `accion: listar`
      rechazada con HTTP 403, resultado null y mensaje de autorización.
- [x] Formulario de contacto utilizable en vista de 390 × 844.
- [x] Usuarios e historial adaptados a tarjetas en móvil, con datos y acciones visibles.
- [x] El usuario confirma que el formulario de restablecimiento se utiliza sin fallas
      en la vista móvil.

## Comprobaciones adicionales aún no ejecutadas en la instalación real

- [ ] Selección entre dos administradores publicados: la prueba real mostró un
      administrador; el caso de dos contactos se verificó solamente en simulación.
- [ ] Retirada de un contacto de la lista pública.
- [ ] Llamada directa a la función de gestión sin sesión.
- [ ] Consulta directa del historial por vendedor.
- [ ] Llamada directa a una RPC y lectura de tablas mientras la cuenta está temporal.
- [ ] Acceso con una sesión anterior al restablecimiento.
- [x] Revisión de carga de inventario, ventas, pedidos, clientes y reportes tras

  las nuevas protecciones. No se repitieron operaciones de negocio por esta mejora.

La ocultación del panel temporal se comprobó visualmente; eso no sustituye las
pruebas pendientes de llamadas directas. Los controles correspondientes existen
en el servidor y SQL, pero no se presentan como pruebas reales ya ejecutadas.

## Fuentes técnicas

- Actualización administrativa de cuentas:
  https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
- Autorización de funciones del servidor:
  https://supabase.com/docs/guides/functions/auth
- Semántica de transacciones de contraseña y metadatos:
  https://github.com/supabase/auth/blob/master/internal/api/admin.go
- Sesiones y duración de JWT:
  https://supabase.com/docs/guides/auth/sessions

## Corrección del historial durante las pruebas reales

Se observó un rechazo HTTP 409 al restablecer una cuenta de prueba. La revisión
detectó una variable `operacion` con el mismo nombre que la columna usada en
`ON CONFLICT`. Se renombraron las variables internas a `v_operacion` y
`v_responsable`, conservando las columnas y el resto de la función.
No se obtuvo el log interno del primer 409. Después de aplicar esta corrección,
la prueba real pasó: el restablecimiento y el cambio obligatorio quedaron
registrados correctamente en el historial.

Para una instalación existente, aplicar solo
`sql/mejora-11b-corregir-historial-recuperacion.sql`. El SQL completo también
incorpora la corrección para instalaciones futuras. No se necesita desplegar
de nuevo las funciones Edge ni sustituir la página por esta corrección.

## Ajuste móvil

Se sustituyó el desplazamiento horizontal de las dos tablas por tarjetas solo en
pantallas de hasta 699 píxeles. Las capturas del usuario muestran los datos y
botones visibles a 390 × 844. Se conserva la presentación de tablas en escritorio.

## Archivos y base sincronizados

El SQL completo incorpora RLS explícito para el respaldo y la corrección de
variables del historial. `mejora-11b-corregir-historial-recuperacion.sql` conserva
la corrección aplicada por separado. La copia `SQL-Recuperacion-MUEBLEX.sql` del
proyecto tiene el mismo contenido corregido; no es otra migración ni se debe
volver a ejecutar por duplicado.
