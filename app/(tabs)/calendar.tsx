import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Button, Card, Loading, Muted, Screen, Title } from '@/src/components/ui';
import { colors } from '@/src/lib/theme';
import { dateKey } from '@/src/lib/format';
import { getEvents } from '@/src/lib/services';
import type { CalendarEvent } from '@/src/types/models';

const eventDate = (event: CalendarEvent) => dateKey(event.start_time ?? event.scheduled_at ?? event.date);
type MarkedDates = Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }>;
export default function CalendarScreen() {
  const today = dateKey(); const [selected, setSelected] = useState(today); const [events, setEvents] = useState<CalendarEvent[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setEvents(await getEvents()); } catch (e) { Alert.alert('No se pudo cargar el calendario', e instanceof Error ? e.message : 'Error desconocido'); } finally { setLoading(false); } }, []); useEffect(() => { void load(); }, [load]);
  const marked = useMemo(() => events.reduce<MarkedDates>((result, event) => { const day = eventDate(event); result[day] = { marked: true, dotColor: colors.gold, selected: day === selected, selectedColor: colors.forest }; return result; }, { [selected]: { selected: true, selectedColor: colors.forest } }), [events, selected]);
  const dayEvents = events.filter((event) => eventDate(event) === selected);
  if (loading) return <Loading />;
  return <Screen><Calendar current={selected} onDayPress={(day: DateData) => setSelected(day.dateString)} markedDates={marked} theme={{ calendarBackground: colors.background, dayTextColor: colors.text, monthTextColor: colors.text, textDisabledColor: '#52525B', selectedDayTextColor: colors.text, todayTextColor: colors.gold, arrowColor: colors.gold, textDayFontWeight: '700', textMonthFontWeight: '800' }} /><View style={s.heading}><View><Text style={s.label}>AGENDA OPERATIVA</Text><Title>{selected}</Title></View><Button label="Abrir agenda" onPress={() => void Linking.openURL('https://calendar.google.com')} /></View><FlatList data={dayEvents} keyExtractor={(item) => item.id} contentContainerStyle={s.list} ListEmptyComponent={<Card><Muted>No hay trabajos agendados para este día.</Muted></Card>} renderItem={({ item }) => <Card style={s.event}><View><Title>{item.title ?? item.leads?.client_name ?? item.leads?.name ?? 'Trabajo agendado'}</Title><Muted>{item.start_time ? new Date(item.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Hora por confirmar'}</Muted></View><Text style={s.status}>{item.status ?? 'programado'}</Text></Card>} /></Screen>;
}
const s = StyleSheet.create({ heading: { padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, label: { color: colors.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, list: { paddingHorizontal: 14, paddingBottom: 25, gap: 10 }, event: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, status: { color: colors.success, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' } });