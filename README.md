# Nieto Green Care App

Aplicación Android e iOS de Nieto Green Care LLC. Muestra el sitio oficial `https://nietogreecare-site.vercel.app` en una vista móvil. El cotizador, la galería, las solicitudes y los métodos de contacto funcionan desde el sitio y usan su misma base de datos; la aplicación no guarda una copia separada de los datos del cliente.

## Administración

El botón **Panel admin** abre `https://nietogreecare-site.vercel.app/admin` en el navegador del dispositivo. La autenticación Google y la lista de los dos administradores se validan en el servidor del sitio. La aplicación no contiene claves privadas ni contraseñas.

## Android

- [Descargar APK para Android](https://github.com/Yamilethklu/NietoGreenCareApp/releases/download/app-v1.1.0/app-release.apk)
- Instalar el APK en el teléfono y permitir la instalación desde el navegador si Android lo solicita.
- Es necesaria una conexión a internet para consultar y guardar las solicitudes.

Para generar una nueva APK, el flujo `.github/workflows/android-apk.yml` ejecuta TypeScript y `assembleRelease`, publica el archivo como artefacto y actualiza la descarga en GitHub Releases.

## Desarrollo

```bash
npm ci
npm run typecheck
npx expo start
```

No se requieren variables de entorno en la aplicación. Las variables privadas permanecen en el sitio desplegado.
