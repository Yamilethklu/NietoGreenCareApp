# Inicio de sesión con Google en la app

La app usa el proveedor Google existente de Supabase, PKCE y el navegador del sistema. No requiere copiar un secreto de Google a Android.

En Supabase → Authentication → URL Configuration → Redirect URLs, agregar exactamente:

```
nietogreencare://admin
nietogreencare://admin/
nietogreencare:///admin
nietogreencare://
nietogreencare://auth/callback
nietogreencare://auth/callback/
```

La app usa `nietogreencare://admin` como `redirectTo` (ver `authRedirect` en `services/auth.ts`); las demás entradas son compatibilidad para Android/iOS cuando el sistema normaliza el deep link con `/` o ruta. En Google Cloud, el URI autorizado es `https://<proyecto>.supabase.co/auth/v1/callback`.

Conservar Site URL, las direcciones del sitio web y las credenciales existentes.

El botón está disponible en los dos accesos. El panel administrador valida `is_admin()`; el panel trabajador requiere una fila activa con el correo de la sesión en `crew_members`. Elegir un botón no otorga permisos. Las políticas existentes de Supabase continúan aplicándose.

La sesión se conserva con Expo SecureStore. Los valores cifrados se excluyen del respaldo de Android. Se mantiene el acceso por contraseña como alternativa.

Verificación en dispositivo: instalar la APK nueva, elegir el panel correspondiente, pulsar Continuar con Google y elegir una cuenta autorizada. Debe volver a la app; comprobar cerrar/reabrir y cerrar sesión. Repetir con un trabajador autorizado y comprobar que solo ve su agenda. Una cuenta sin autorización debe mostrar un mensaje de acceso denegado.

La contraseña de Google no es necesariamente una contraseña de Supabase. Ante Invalid login credentials, usar Google si ese fue el método de registro.

## Flujo y rol persistido

El rol elegido (admin/trabajador) se guarda en SecureStore (localStorage en web) antes de abrir Google y se restaura al volver o reabrir la app; se borra al cerrar sesión o pulsar "Cambiar acceso". El código de OAuth se canjea una sola vez (`finishGoogleSignIn` deduplica por código) y el cliente Supabase es único (`services/auth.ts`). La pantalla principal también escucha `Linking` para completar el callback cuando Android/iOS entregan el regreso fuera de `openAuthSessionAsync`.

## Builds y actualizaciones

Los cambios de JavaScript se envían por EAS Update al canal `production` con runtime `1.1.9`, que coincide con TestFlight `1.1.9 (14)`. Los workflows nativos de iPhone y APK quedan manuales para evitar crear versiones nuevas por cada ajuste de autenticación; solo se ejecutan cuando explícitamente se requiere una nueva compilación nativa.

## Lista de verificación manual

- Admin → Google → regreso → panel administrador autorizado.
- Trabajador autorizado → Google → agenda visible.
- Cuenta no autorizada → mensaje de acceso denegado.
- Cerrar sesión → vuelve a "Selecciona tu acceso".
- Correo/contraseña sigue funcionando.
- Reabrir la app conserva sesión y panel.

## Archivos locales

`android/app/debug.keystore` y `supabase/.temp/` ya no se versionan (ver `.gitignore`).
