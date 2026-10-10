# Distribución móvil y notificaciones

## APK para Android

El workflow `.github/workflows/android-apk.yml` solo se ejecuta manualmente desde **Actions → Android APK**. Escribe `YES` en el campo de confirmación. Requiere `EXPO_TOKEN` y la configuración pública existente de Supabase en GitHub Actions. El job corre typecheck y pruebas, solicita `eas build --platform android --profile preview --no-interactive --no-wait` y termina; no espera a que EAS compile, no descarga el archivo y no publica una GitHub Release.

Cuando termine el build en EAS:

1. Abre el build Android `preview` en [EAS Builds](https://expo.dev/) o consúltalo con `eas build:list --platform android --profile preview`.
2. Descarga el APK desde el detalle de ese build y confirma su versión/runtime antes de distribuirlo.
3. Publica el archivo solo después de comprobarlo. Para crear un release nuevo, por ejemplo:

   ```bash
   gh release create app-v1.1.9 /ruta/NietoGreenCare-Android.apk \
     --title "Nieto Green Care Android 1.1.9" \
     --notes "APK Android 1.1.9"
   ```

   Para una versión posterior, usa un tag nuevo (por ejemplo `app-v1.2.0`). No sobrescribas una release existente.
4. Actualiza el enlace de descarga del README únicamente cuando el release y su APK estén publicados.

El único release comprobado actualmente es `app-v1.1.0`; no hay una APK `app-v1.1.9` publicada en GitHub Releases. Confirma en EAS si el build solicitado ya terminó y, si no existe un APK listo, genera uno antes de publicarlo manualmente. El build preview es un APK de distribución interna, no un AAB para Google Play.

## OTA y builds nativos

El workflow `.github/workflows/eas-update.yml` publica OTA al canal `production` para iOS y Android y al canal `preview` para Android cuando hay cambios en sus rutas observadas en `main` (o si se ejecuta manualmente). Una OTA actualiza el bundle JavaScript solo en instalaciones cuyo `runtimeVersion` coincide; no genera APK/IPA, no modifica el número nativo de build y no puede incorporar cambios nativos. Los cambios nativos y las instalaciones nuevas requieren un nuevo build EAS.

`package.json` y `app.json` deben compartir la versión visible de la app. `runtimeVersion` identifica compatibilidad OTA y debe cambiar cuando una versión nativa no sea compatible con la anterior. EAS mantiene remotamente los números nativos (`android.versionCode` e `ios.buildNumber`) mediante `cli.appVersionSource: "remote"`; `build.production.autoIncrement: true` incrementa esos números para builds de producción. Antes del primer build con esa estrategia, comprueba/sincroniza los contadores remotos de EAS para evitar una versión remota inferior a la ya distribuida.

## iOS y estado de publicación

iOS no instala APKs. `ios-build.yml` es manual y solicita un build EAS de producción (con envío automático a TestFlight) o de preview; `ios-submit.yml` permite enviar un build existente. Ambos dependen de credenciales Expo/Apple válidas. La configuración del repositorio identifica el bundle `com.nietogreencare.app` y el App Store Connect ID `6818833389`.

La ejecución iOS más reciente visible en Actions (8-oct-2026) terminó antes de completar un build porque se agotó la cuota mensual de builds iOS del plan gratuito de EAS. Aunque hay ejecuciones anteriores exitosas de build/envío, no prueban que la versión actual esté disponible en TestFlight o en el App Store. Verifica el estado directamente en App Store Connect; no se ha confirmado un enlace público de App Store.

El recordatorio local se activa desde el botón de la agenda, pide permiso y recuerda revisar los trabajos a las 6:00 del teléfono. No es una notificación push de nuevas solicitudes. Para avisar cambios mientras la app está cerrada hacen falta FCM en Android y APNs en iOS, registro de dispositivos y un emisor en el servidor. Estas credenciales no se han creado ni modificado.

La agenda recurrente se genera en Supabase con el trabajo cron existente. La app consulta la agenda al iniciar, al volver al primer plano y cada minuto mientras está abierta. Usa la fecha de Texas y cambia a la fecha actual al cruzar la medianoche. Los cambios de estado/pago usan las mismas validaciones del sitio, y solo se reflejan como guardados después de la respuesta exitosa.

El trabajador solo dispone de la agenda asignada, finalizar trabajo y registrar pago. El dueño conserva los demás apartados. Esta actualización no certifica equivalencia funcional completa de todos los módulos heredados del panel: las pantallas de galería, editor y gestión de trabajadores requieren una revisión separada.
