# Conectar Expo sin publicar claves

1. En GitHub, abrir Yamilethklu/NietoGreenCareApp → Settings → Secrets and variables → Actions → New repository secret.
2. Nombre: `EXPO_TOKEN`. Valor: el token personal de Expo de la cuenta con acceso al proyecto existente. No ponerlo en app.json, EXPO_PUBLIC_*, Vercel ni archivos versionados.
3. En Actions, ejecutar `Verify Expo access` sobre main. Comprueba identidad y acceso sin crear una compilación ni cambiar credenciales.

Android tiene un workflow manual que solicita un build APK `preview` en EAS, pero no descarga ni publica automáticamente el APK en GitHub Releases. El release publicado debe actualizarse manualmente después de verificar el archivo.

Para iPhone, primero hace falta Apple Developer activo, configurar certificados/perfiles en EAS y registrar los dispositivos para distribución interna. Después se puede ejecutar `iPhone build (Apple credentials required)`. Ese workflow no se ejecuta con cada commit; verifica su estado más reciente en Actions y la disponibilidad de la app en App Store Connect/TestFlight.

El token Expo no sustituye a una cuenta Apple Developer ni a las credenciales FCM/APNs. Tampoco configura el correo de facturas: el sitio requiere RESEND_API_KEY y EMAIL_FROM de un remitente autorizado, o SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS y EMAIL_FROM en Vercel Production.

Para Google, conservar en Supabase Authentication → URL Configuration la dirección de retorno `nietogreencare://` junto a las direcciones existentes del sitio.
