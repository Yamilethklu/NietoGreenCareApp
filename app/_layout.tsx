import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAutoUpdate } from '../hooks/useAutoUpdate';

export default function RootLayout() {
  useAutoUpdate();
  return <>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#dcfce7' } }} />
  </>;
}
