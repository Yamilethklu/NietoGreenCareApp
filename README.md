# Nieto Green Care — distribución privada mediante Apple Business Manager

Aplicación iOS de Nieto Green Care LLC. **La distribución oficial es una app personalizada (Custom App) de App Store Connect**, disponible exclusivamente para las organizaciones autorizadas en Apple Business Manager. No es una publicación pública ni un instalador directo desde GitHub.

## Identificadores
- Bundle ID: `com.nietogreencare.app`
- Versión de referencia: `1.1.9 (14)`; runtime Expo OTA: `1.1.9`
- App Store Connect App ID: `6818833389`
- Organización indicada en App Store Connect: `klunderstudio`, ID `357027122695` (comprobar coincidencia con Apple Business Manager)

## Compilar y enviar (firma App Store, NO distribución interna)
La configuración `eas.json` usa `build.production.distribution: "store"` y `submit.production.ios.ascAppId`.

1. Verificar que en **App Store Connect → Precio y disponibilidad** esté marcada **Privada**, con la organización correcta. Apple Business Manager requiere la organización destinataria y sus mecanismos de adquisición/asignación de licencias.
2. Comprobar que las credenciales de firma y las variables públicas necesarias de Supabase estén configuradas en Expo/EAS. Nunca agregar secretos privados al repositorio.
3. En una terminal con acceso a Expo y Apple:
   ```bash
   npm ci
   npm run typecheck
   npx eas-cli@latest login
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios --profile production --latest
   ```
   Opcionalmente ejecutar desde GitHub Actions el workflow **iPhone App Store build (private Custom App)**, después de comprobar credenciales y valores necesarios. Para enviar una compilación ya existente, usar el workflow de envío indicando su ID.
4. En App Store Connect, esperar el procesamiento, asociar el build a la versión, completar las capturas, privacidad, clasificación, datos de revisión y cuenta/instrucciones de acceso para el revisor; después enviar a revisión.
5. Tras la aprobación, iniciar sesión en **Apple Business Manager** con la organización autorizada, buscar la aplicación personalizada, adquirir las licencias y asignarlas con los procedimientos de Apple (normalmente mediante una solución de administración de dispositivos).

**Importante:** una compilación subida a App Store Connect no equivale a una publicación aprobada. La app solo estará disponible después de la revisión y habilitación correspondiente. La instalación, la actualización y la disponibilidad dependen de Apple Business Manager, licencias y configuración de dispositivos; no se garantiza duración indefinida.

## Funciones preservadas
- Autenticación con Google y acceso al panel administrativo.
- Agenda, calendario, clientes y trabajos.
- Cotizador y solicitudes desde Supabase.
- Historial, invoices y pagos.
- Trabajadores, rutas y notificaciones.

## Actualizaciones OTA
El workflow `.github/workflows/eas-update.yml` publica actualizaciones compatibles en los canales Expo ya configurados; no reemplaza la firma ni la entrega inicial de iOS y no autoriza cambios nativos sin una compilación nueva.

## Variables públicas
```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```
No publicar nunca claves `service_role`, credenciales de Apple ni tokens Expo.

## Enlaces
- [Apple Business Manager](https://business.apple.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Compilaciones en GitHub Actions](https://github.com/Yamilethklu/NietoGreenCareApp/actions/workflows/ios-build.yml)
- [Repositorio Android independiente](https://github.com/Yamilethklu/Nietogreecareandroid)
