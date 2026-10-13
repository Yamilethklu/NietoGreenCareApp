import { Platform } from 'react-native';
import { supabase } from './auth';

let Notifications: typeof import('expo-notifications') | null = null;
try { Notifications = require('expo-notifications'); } catch { /* Expo Go sin módulo nativo */ }

const PROJECT_ID = 'ee66ff82-78c1-4a92-801d-28ed5ec36feb';
let lastToken: string | null = null;

/** Registra el dispositivo del dueño para recibir avisos de nuevas solicitudes (tabla push_tokens). */
export async function registerPushToken(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications || !supabase) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('new-requests', { name: 'Nuevas solicitudes', importance: Notifications.AndroidImportance.HIGH });
    }
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data;
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) return false;
    const { error } = await supabase.from('push_tokens').upsert(
      { token, user_id: userId, role: 'admin', platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    );
    if (error) { console.warn('[push] No se pudo guardar el token.'); return false; }
    lastToken = token;
    return true;
  } catch {
    console.warn('[push] Registro de notificaciones no disponible.');
    return false;
  }
}

export async function unregisterPushToken() {
  if (!supabase || !lastToken) return;
  try { await supabase.from('push_tokens').delete().eq('token', lastToken); } catch { /* se limpia en el siguiente acceso */ }
  lastToken = null;
}
