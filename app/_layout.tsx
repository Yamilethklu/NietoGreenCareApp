import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';

export default function RootLayout() {
  useEffect(() => {
    let active = true;

    async function applyAvailableUpdate() {
      // OTA solo funciona en builds nativos compatibles; en Expo Go/desarrollo se omite.
      if (__DEV__ || !Updates.isEnabled) return;

      try {
        const result = await Updates.checkForUpdateAsync();
        if (!active || !result.isAvailable) return;

        await Updates.fetchUpdateAsync();
        if (active) {
          // Aplica el paquete descargado sin pedir al usuario reinstalar la app.
          await Updates.reloadAsync();
        }
      } catch {
        // Si no hay conexión o falla el servidor OTA, la app sigue funcionando
        // con la versión instalada y volverá a comprobar al abrirse de nuevo.
      }
    }

    void applyAvailableUpdate();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#dcfce7' },
        }}
      />
    </>
  );
}
