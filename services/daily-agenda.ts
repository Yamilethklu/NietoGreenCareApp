import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications no está disponible en Expo Go.');
}

export function texasDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

if (Notifications) {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
}

export async function enableDailyReminder() {
  if (Platform.OS === 'web' || !Notifications) return false;
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
  if (Platform.OS !== 'web' && Notifications) await Notifications.cancelScheduledNotificationAsync('daily-agenda');
}

export function onAgendaNotification(callback: () => void) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(response => {
    if (response.notification.request.content.data?.screen === 'agenda') callback();
  });
}
