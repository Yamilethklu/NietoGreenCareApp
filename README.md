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
