# Notificaciones de nuevas solicitudes

La app avisa al dueño de cada solicitud nueva (web o ingreso manual):

- **App abierta:** aparece el aviso en el encabezado y la lista se actualiza al instante (Supabase Realtime).
- **App cerrada:** notificación push (Expo Push → APNs en iPhone, FCM en Android).

## Pasos únicos (los haces tú)

1. **Base de datos:** en Supabase → SQL Editor, ejecuta `supabase/migrations/20261012_push_notifications.sql`.
2. **Función:** `supabase functions deploy notify-new-request --no-verify-jwt` y
   `supabase secrets set WEBHOOK_SECRET=<texto-largo-aleatorio>`.
3. **Webhooks:** Supabase → Database → Webhooks → crear dos, tipo *Supabase Edge Functions*, evento **Insert**:
   tabla `leads` y tabla `work_orders`, función `notify-new-request`, y encabezado
   `x-webhook-secret: <el mismo texto>`.
4. **iPhone (APNs):** `eas credentials` → iOS → Push Notifications (genera/sube la clave .p8). La app ya tiene `aps-environment: production`.
5. **Android (FCM):** crea el proyecto en Firebase, descarga `google-services.json` y súbelo con
   `eas credentials` → Android → FCM V1. Sin esto Android solo recibe avisos con la app abierta.
6. Compilar una versión nativa nueva (los cambios de permisos/notificaciones no llegan por EAS Update).

El dueño debe abrir la app una vez con sesión de administrador para registrar su dispositivo.

# Trabajadores con contraseña

La app envía `password` (opcional) en la acción `worker`. El sitio debe crear el usuario en
Supabase Auth con la clave de servicio; ver `docs/sitio-trabajador-password.md`.
