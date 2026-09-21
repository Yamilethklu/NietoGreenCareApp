import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from '@/src/lib/theme';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

export default function RootLayout() {
  useEffect(() => {
    const configureNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('new-leads', { name: 'Nuevas solicitudes', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: colors.gold });
      }
      const permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted) await Notifications.requestPermissionsAsync();
    };
    void configureNotifications();
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('new-leads-notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
      const row = payload.new as { client_name?: string; name?: string; address?: string };
      const name = row.client_name ?? row.name ?? 'Cliente sin nombre';
      const address = row.address ?? 'Dirección por confirmar';
      void Notifications.scheduleNotificationAsync({ content: { title: '🌱 ¡Nueva Solicitud de Cotización!', body: `${name} — ${address}`, sound: 'default', ...(Platform.OS === 'android' ? { channelId: 'new-leads' } : {}) }, trigger: null });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);
  return <><StatusBar style="light" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="admin" options={{ title: 'Acceso Admin', presentation: 'card' }} /><Stack.Screen name="lead/[id]" options={{ title: 'Detalle de solicitud', presentation: 'card' }} /></Stack></>;
}