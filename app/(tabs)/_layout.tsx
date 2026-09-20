import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colors } from '@/src/lib/theme';

const icon = (name: ComponentProps<typeof FontAwesome6>['name']) => ({ color, size }: { color: ColorValue; size: number }) => <FontAwesome6 name={name} color={color} size={size} />;
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' }, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border }, tabBarActiveTintColor: colors.gold, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="index" options={{ title: 'Solicitudes', tabBarIcon: icon('leaf') }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendario', tabBarIcon: icon('calendar-days') }} />
    <Tabs.Screen name="gallery" options={{ title: 'Galería', tabBarIcon: icon('images') }} />
    <Tabs.Screen name="quote" options={{ title: 'Cotizar', tabBarIcon: icon('file-invoice-dollar') }} />
    <Tabs.Screen name="finance" options={{ title: 'Resumen', tabBarIcon: icon('chart-line') }} />
  </Tabs>;
}