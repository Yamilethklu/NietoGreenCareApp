# Distribución móvil y notificaciones

## APK para Android

El workflow `.github/workflows/android-apk.yml` se ejecuta al cambiar `app.json`, `package.json`, `eas.json` o el propio workflow en `main`, y también permite ejecución manual desde **Actions → Android APK**. Para la ejecución manual escribe `YES`. Requiere `EXPO_TOKEN` y la configuración pública existente de Supabase en GitHub Actions. El job ejecuta typecheck y pruebas, solicita `eas build --platform android --profile preview --non-interactive --wait`, espera a que termine, descarga la APK y la publica en GitHub Releases con un tag único basado en el número de ejecución.

La versión de la app se lee de `package.json`; confirma el release más reciente en [GitHub Releases](https://github.com/Yamilethklu/NietoGreenCareApp/releases) antes de instalar o compartir una APK. No reutilices tags existentes ni distribuyas una compilación que no haya terminado correctamente. El build `preview` produce una APK para distribución interna, no un AAB para Google Play.

## OTA y builds nativos

El workflow `.github/workflows/eas-update.yml` publica OTA al canal `production` para iOS y Android y al canal `preview` para Android cuando hay cambios en sus rutas observadas en `main` (o si se ejecuta manualmente). Una OTA actualiza el bundle JavaScript solo en instalaciones cuyo `runtimeVersion` coincide; no genera APK/IPA, no modifica el número nativo de build y no puede incorporar cambios nativos. Los cambios nativos y las instalaciones nuevas requieren un nuevo build EAS.

`package.json` y `app.json` deben compartir la versión visible de la app. `runtimeVersion` identifica compatibilidad OTA y debe cambiar cuando una versión nativa no sea compatible con la anterior. EAS mantiene remotamente los números nativos (`android.versionCode` e `ios.buildNumber`) mediante `cli.appVersionSource: "remote"`; `build.production.autoIncrement: true` incrementa esos números para builds de producción. Antes del primer build con esa estrategia, comprueba/sincroniza los contadores remotos de EAS para evitar una versión remota inferior a la ya distribuida.

## iOS y estado de publicación

iOS no instala APKs. `ios-build.yml` es manual y solicita un build EAS de producción (con envío automático a TestFlight) o de preview; `ios-submit.yml` permite enviar un build existente. Ambos dependen de credenciales Expo/Apple válidas. La configuración del repositorio identifica el bundle `com.nietogreencare.app` y el App Store Connect ID `6818833389`.

La ejecución iOS más reciente visible en Actions (8-oct-2026) terminó antes de completar un build porque se agotó la cuota mensual de builds iOS del plan gratuito de EAS. Aunque hay ejecuciones anteriores exitosas de build/envío, no prueban que la versión actual esté disponible en TestFlight o en el App Store. Verifica el estado directamente en App Store Connect; no se ha confirmado un enlace público de App Store.

El recordatorio local se activa desde el botón de la agenda, pide permiso y recuerda revisar los trabajos a las 6:00 del teléfono. No es una notificación push de nuevas solicitudes. Para avisar cambios mientras la app está cerrada hacen falta FCM en Android y APNs en iOS, registro de dispositivos y un emisor en el servidor. Estas credenciales no se han creado ni modificado.

La agenda recurrente se genera en Supabase con el trabajo cron existente. La app consulta la agenda al iniciar, al volver al primer plano y cada minuto mientras está abierta. Usa la fecha de Texas y cambia a la fecha actual al cruzar la medianoche. Los cambios de estado/pago usan las mismas validaciones del sitio, y solo se reflejan como guardados después de la respuesta exitosa.

El trabajador solo dispone de la agenda asignada, finalizar trabajo y registrar pago. El dueño conserva los demás apartados. Esta actualización no certifica equivalencia funcional completa de todos los módulos heredados del panel: las pantallas de galería, editor y gestión de trabajadores requieren una revisión separada.
