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

- [Descargar APK para Android](https://github.com/Yamilethklu/NietoGreenCareApp/releases/download/app-v1.1.0/NietoGreenCare-Android.apk)
- Instalar el APK en el teléfono y permitir la instalación desde el navegador si Android lo solicita.
- Es necesaria una conexión a internet para consultar y guardar las solicitudes.

Para generar una nueva APK, el flujo `.github/workflows/android-apk.yml` ejecuta TypeScript y `assembleRelease`, publica el archivo como artefacto y actualiza la descarga en GitHub Releases.

## Desarrollo

```bash
npm ci
npm run typecheck
npx expo start
```

Las claves privadas permanecen en el sitio desplegado. La app solo debe usar la clave pública/anon de Supabase.
