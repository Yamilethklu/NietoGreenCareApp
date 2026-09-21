import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { isAllowedAdmin } from '@/src/lib/adminAuth';
import { colors } from '@/src/lib/theme';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

const icon = (name: ComponentProps<typeof FontAwesome6>['name']) => ({ color, size }: { color: ColorValue; size: number }) => <FontAwesome6 name={name} color={color} size={size} />;
export default function TabsLayout() {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const updateAdminAccess = async () => {
      const { data } = await supabase.auth.getUser();
      const allowed = isAllowedAdmin(data.user?.email);
      if (data.user && !allowed) await supabase.auth.signOut();
      setAdmin(allowed);
    };

    void updateAdminAccess();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const allowed = isAllowedAdmin(session?.user.email);
      setAdmin(allowed);
      if (session?.user && !allowed) void supabase.auth.signOut();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' }, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border }, tabBarActiveTintColor: colors.gold, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('house') }} />
    <Tabs.Screen name="calendar" options={{ href: admin ? undefined : null, title: 'Calendario', tabBarIcon: icon('calendar-days') }} />
    <Tabs.Screen name="gallery" options={{ href: admin ? undefined : null, title: 'Galería', tabBarIcon: icon('images') }} />
    <Tabs.Screen name="quote" options={{ href: admin ? undefined : null, title: 'Cotizar', tabBarIcon: icon('file-invoice-dollar') }} />
    <Tabs.Screen name="finance" options={{ href: admin ? undefined : null, title: 'Resumen', tabBarIcon: icon('chart-line') }} />
  </Tabs>;
}