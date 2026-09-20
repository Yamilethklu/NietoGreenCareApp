import { Alert, Linking, Platform } from 'react-native';
export async function openUrl(url: string) { const supported = await Linking.canOpenURL(url); if (supported) await Linking.openURL(url); else Alert.alert('No disponible', 'No fue posible abrir esta acción en este dispositivo.'); }
export const call = (phone?: string) => openUrl(`tel:${phone?.replace(/[^+\d]/g, '') || '+17373144215'}`);
export const sms = (phone?: string, name = 'cliente') => openUrl(`sms:${phone?.replace(/[^+\d]/g, '') || '+17373144215'}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(`Hola ${name}, le escribe Nieto Green Care LLC.`)}`);
export const navigateTo = (address?: string) => openUrl(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || 'Austin, TX')}`);