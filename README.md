# Nieto Green Care App

Aplicación Android e iOS de Nieto Green Care LLC para controlar la operación diaria del negocio desde el teléfono. Incluye agenda por día, casas/clientes, registro de pagos, invoices y trabajadores. También mantiene un enlace directo al sitio oficial `https://nietogreecare-site.vercel.app`.

## Funciones principales

- Dashboard con ingresos, trabajos realizados, solicitudes pendientes y area medida.
- Solicitudes del cotizador con estado, precio final, fecha y acceso a Google Calendar.
- Clientes con historial resumido por telefono.
- La primera pantalla muestra las casas agendadas del día.
- Las órdenes usan estatus `SOLICITADO`, `FINALIZADA` o `CANCELADA`.
- Al finalizar una orden, la tarjeta cambia a verde; al cancelarla, cambia a gris.
- El pago permite registrar fecha, método (`Cash`, `CashApp`, `Venmo`, `Zelle`) y nota opcional.
- Las órdenes pagadas bloquean las acciones de historial/pago y se marcan como `PAGADO`.
- El apartado de casas permite agregar, editar, eliminar y generar invoices.
- El apartado de invoices tiene filtro de pagado/no pagado y muestra los 50 más recientes.
- El apartado de trabajadores permite registrar correos y ver trabajos asignados por día.
- Precios editables por frecuencia y rango de pies cuadrados.
- Galeria y opiniones con publicar/ocultar/eliminar.
- QR del cotizador publico.
- Editor del sitio para textos, marca, cobertura y contenido publico.

## Vinculación con el sitio

La app está preparada para usar la misma base de datos del sitio por Supabase. Configura estas variables antes de compilar:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Sin estas variables, la app no puede conectarse a Supabase ni sincronizar datos; no se cargan datos de ejemplo.

Tablas que la app intenta leer cuando Supabase esta configurado:

```text
leads
pricing_rules
gallery
app_settings
crew_members
service_plans
work_orders
work_invoices
site_sections
weekly_summaries
```

## Android

- [Consultar las versiones publicadas en GitHub Releases](https://github.com/Yamilethklu/NietoGreenCareApp/releases)
- La última APK publicada es la **1.1.0**; no corresponde a la configuración actual **1.1.9**. No hay una APK 1.1.9 publicada en Releases. Confirma en EAS si el build solicitado ya terminó antes de descargarlo y publicarlo; no presentes la 1.1.0 como versión actual.
- Cuando haya una versión compatible publicada, instala su APK en el teléfono y permite la instalación desde el navegador si Android lo solicita. Se necesita conexión a internet para consultar y guardar solicitudes.

El workflow `.github/workflows/android-apk.yml` es manual. Al ejecutarlo desde **Actions → Android APK** y confirmar `YES`, solo solicita un build APK `preview` en EAS y termina sin esperar; no descarga el archivo ni crea/actualiza un GitHub Release. Consulta [Distribución móvil](docs/mobile-distribution.md) para compilar, descargar y publicar una APK.

## Actualizaciones y versiones

- **OTA (EAS Update):** los cambios compatibles de JavaScript se publican automáticamente a los canales `production` (iOS y Android) y `preview` (Android) cuando se actualizan las rutas configuradas en `.github/workflows/eas-update.yml` en `main`. Llegan únicamente a builds instalados cuyo `runtimeVersion` coincide. Una OTA no reemplaza ni publica un APK/IPA y no puede instalar cambios nativos.
- **Build nativo:** se necesita un nuevo build para cambios nativos, para distribuir una APK/IPA instalable o cuando cambia la compatibilidad del runtime. Los números de versión de la app se mantienen alineados entre `package.json` y `app.json`; EAS gestiona remotamente los números nativos de Android/iOS (`appVersionSource: remote` y `autoIncrement` en producción).
- **iOS:** el repositorio configura builds de EAS y envío a TestFlight, pero no hay una URL pública de App Store verificada. La ejecución iOS más reciente registrada (8-oct-2026) no terminó un build porque se agotó la cuota mensual de builds iOS del plan gratuito de EAS. Verifica el estado actual directamente en App Store Connect/TestFlight; la existencia de workflows o de un envío anterior no confirma publicación de la versión actual.

## Desarrollo

```bash
npm ci
npm run typecheck
npx expo start
```

Las claves privadas permanecen en el sitio desplegado. La app solo debe usar la clave pública/anon de Supabase.
