# Nieto Green Care App

Repositorio enfocado únicamente en la app iOS de Nieto Green Care LLC. La app instalada en Apple/TestFlight se mantiene con actualizaciones OTA de Expo, sin tocar claves privadas ni crear builds nuevos para Android desde este repositorio.

## Estado objetivo

- Plataforma activa de este repositorio: iOS.
- Bundle ID: `com.nietogreencare.app`.
- Versión instalada de referencia: `1.1.9 (14)`.
- Runtime OTA activo: `1.1.9`.
- Canales OTA publicados: `production` y `preview`.

## Funciones principales

- Inicio con Google y acceso al panel dentro de la app.
- Agenda del día con trabajos programados.
- Calendario para filtrar trabajos por fecha.
- Solicitudes del cotizador sincronizadas desde Supabase.
- Historial por cliente/casa.
- Invoices y registro de pagos.
- Trabajadores y asignación de rutas.
- Notificaciones mediante Expo/Supabase cuando la configuración externa está activa.

## Configuración pública requerida

La app usa únicamente variables públicas de Supabase:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

No se deben guardar claves privadas, service role keys ni secretos en este repositorio.

## Actualización OTA para iOS

Cada cambio en `main` que toque código de la app dispara el workflow `.github/workflows/eas-update.yml` y publica la actualización para iOS en:

```text
production
preview
```

El runtime se mantiene en `1.1.9` para que coincida con la app Apple ya instalada.

## Desarrollo

```bash
npm ci
npm run typecheck
npx expo start
```

## Instalación privada del propietario (iPhone)

**Portal permanente de referencia:** este README es la entrada estable para obtener la versión autorizada. Un enlace al repositorio **no es** por sí mismo un instalador `.ipa`.

- [Consultar compilaciones en Expo](https://expo.dev/) (requiere acceso a la cuenta/proyecto; verificar nombre del proyecto).
- [Acciones de publicación OTA iOS](https://github.com/Yamilethklu/NietoGreenCareApp/actions/workflows/eas-update.yml).
- [Repositorio Android y sus instrucciones de instalación](https://github.com/Yamilethklu/Nietogreecareandroid).

**Cambio de iPhone:** registrar el UDID del nuevo dispositivo con `eas device:create` (requiere acceso Expo/Apple) y ejecutar `eas build --platform ios --profile owner-private` de manera interactiva para incluir el nuevo dispositivo en el perfil Ad Hoc; como alternativa, volver a firmar un IPA compatible mediante `eas build:resign`. Solo compartir el enlace real de la compilación cuando EAS confirme que está terminada. Un IPA Ad Hoc anterior no se instala en un iPhone nuevo que no figure en su perfil.

**Caducidad:** TestFlight tiene vencimiento de builds; Ad Hoc evita depender de TestFlight pero requiere renovar certificados/perfiles y, cuando corresponda, reinstalar una versión firmada. No se puede garantizar una app Ad Hoc que nunca caduque. El enlace de este README puede mantenerse estable y apuntar a nuevas compilaciones verificadas.

**Actualizaciones por la nube:** el workflow de iOS publica cambios JS/recursos compatibles con runtime `1.1.9` a `production` y `preview`. OTA no instala por primera vez la app en un nuevo dispositivo y no reemplaza builds nativos ni firma Apple. Confirmar éxito en Actions antes de anunciar una actualización.

**Privacidad:** no compartir el enlace de instalación con terceros; solo los dispositivos autorizados pueden instalar una versión Ad Hoc. No subir archivos IPA, credenciales, perfiles de firma ni claves privadas al repositorio público.
