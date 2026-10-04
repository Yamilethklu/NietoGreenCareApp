# Distribución móvil y notificaciones

Android: el workflow Android APK publica una APK firmada en GitHub Releases al recibir cambios en main. Configura `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD` como secretos de Actions; el keystore no debe versionarse. Mantén la misma clave para todas las versiones publicadas para que Android permita actualizar la aplicación. Las APK antiguas firmadas con la clave de depuración requieren desinstalarse antes de instalar la primera APK firmada con la clave de producción.

iPhone: no instala archivos APK. Este proyecto tiene perfiles EAS para distribución interna en dispositivos registrados (`eas build --platform ios --profile preview`) y distribución por TestFlight/App Store (`eas build --platform ios --profile production`). Se requiere acceso autorizado a Expo y Apple Developer, certificado y perfil de aprovisionamiento. No publicar una IPA sin firmar como si fuera instalable.

El recordatorio local se activa desde el botón de la agenda, pide permiso y recuerda revisar los trabajos a las 6:00 del teléfono. No es una notificación push de nuevas solicitudes. Para avisar cambios mientras la app está cerrada hacen falta FCM en Android y APNs en iOS, registro de dispositivos y un emisor en el servidor. Estas credenciales no se han creado ni modificado.

La agenda recurrente se genera en Supabase con el trabajo cron existente. La app consulta la agenda al iniciar, al volver al primer plano y cada minuto mientras está abierta. Usa la fecha de Texas y cambia a la fecha actual al cruzar la medianoche. Los cambios de estado/pago usan las mismas validaciones del sitio, y solo se reflejan como guardados después de la respuesta exitosa.

El trabajador solo dispone de la agenda asignada, finalizar trabajo y registrar pago. El dueño conserva los demás apartados. Esta actualización no certifica equivalencia funcional completa de todos los módulos heredados del panel: las pantallas de galería, editor y gestión de trabajadores requieren una revisión separada.
