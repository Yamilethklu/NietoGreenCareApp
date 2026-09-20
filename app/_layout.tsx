import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { colors } from '@/src/lib/theme';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

export default function RootLayout() {
  useEffect(() => {
    void Notifications.requestPermissionsAsync();
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('new-leads-notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
      const row = payload.new as { client_name?: string; name?: string };
      void Notifications.scheduleNotificationAsync({ content: { title: 'Nueva solicitud', body: `Solicitud recibida de ${row.client_name ?? row.name ?? 'un cliente'}` }, trigger: null });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);
  return <><StatusBar style="light" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="lead/[id]" options={{ title: 'Detalle de solicitud', presentation: 'card' }} /></Stack></>;
}