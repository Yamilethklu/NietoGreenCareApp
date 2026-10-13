# Distribución móvil y notificaciones

Android: el workflow Android APK publica app-release.apk en la release existente al recibir cambios en main. Mantiene el mismo enlace de descarga.

iPhone: no instala archivos APK. Este proyecto tiene perfiles EAS para distribución interna en dispositivos registrados (`eas build --platform ios --profile preview`) y distribución por TestFlight/App Store (`eas build --platform ios --profile production`). Se requiere acceso autorizado a Expo y Apple Developer, certificado y perfil de aprovisionamiento. No publicar una IPA sin firmar como si fuera instalable.

El recordatorio local se activa desde el botón de la agenda, pide permiso y recuerda revisar los trabajos a las 6:00 del teléfono. No es una notificación push de nuevas solicitudes. Para avisar cambios mientras la app está cerrada hacen falta FCM en Android y APNs en iOS, registro de dispositivos y un emisor en el servidor. Estas credenciales no se han creado ni modificado.

La agenda recurrente se genera en Supabase con el trabajo cron existente. La app consulta la agenda al iniciar, al volver al primer plano y cada minuto mientras está abierta. Usa la fecha de Texas y cambia a la fecha actual al cruzar la medianoche. Los cambios de estado/pago usan las mismas validaciones del sitio, y solo se reflejan como guardados después de la respuesta exitosa.

El trabajador solo dispone de la agenda asignada, finalizar trabajo y registrar pago. El dueño conserva los demás apartados. Esta actualización no certifica equivalencia funcional completa de todos los módulos heredados del panel: las pantallas de galería, editor y gestión de trabajadores requieren una revisión separada.
