import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export function texasDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

async function ensureNotificationPermission(channelId = 'new-requests') {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, { name: 'Solicitudes nuevas', importance: Notifications.AndroidImportance.HIGH });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  return permission.granted;
}

export async function notifyNewRequest(title: string, body: string) {
  if (!(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data: { screen: 'solicitudes' } },
    trigger: null,
  });
  return true;
}

export async function enableDailyReminder() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('daily-work', { name: 'Agenda de trabajos', importance: Notifications.AndroidImportance.DEFAULT });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;
  await disableDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-agenda',
    content: { title: 'Nieto Green Care', body: 'Revisa tu agenda de trabajos de hoy.', sound: 'default', data: { screen: 'agenda' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 6, minute: 0, channelId: 'daily-work' },
  });
  return true;
}

export async function disableDailyReminder() {
  if (Platform.OS !== 'web') await Notifications.cancelScheduledNotificationAsync('daily-agenda');
}

export function onAgendaNotification(callback: () => void) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    if (response.notification.request.content.data?.screen === 'agenda') callback();
  });
}
