# Inicio de sesión con Google en la app

La app usa el proveedor Google existente de Supabase, PKCE y el navegador del sistema. No requiere copiar un secreto de Google a Android.

En Supabase → Authentication → URL Configuration → Redirect URLs, agregar exactamente:

```
nietogreencare://
```

Conservar Site URL, las direcciones del sitio web y las credenciales existentes.

El botón está disponible en los dos accesos. El panel administrador valida `is_admin()`; el panel trabajador requiere una fila activa con el correo de la sesión en `crew_members`. Elegir un botón no otorga permisos. Las políticas existentes de Supabase continúan aplicándose.

La sesión se conserva con Expo SecureStore. Los valores cifrados se excluyen del respaldo de Android. Se mantiene el acceso por contraseña como alternativa.

Verificación en dispositivo: instalar la APK nueva, elegir el panel correspondiente, pulsar Continuar con Google y elegir una cuenta autorizada. Debe volver a la app; comprobar cerrar/reabrir y cerrar sesión. Repetir con un trabajador autorizado y comprobar que solo ve su agenda. Una cuenta sin autorización debe mostrar un mensaje de acceso denegado.

La contraseña de Google no es necesariamente una contraseña de Supabase. Ante Invalid login credentials, usar Google si ese fue el método de registro.
