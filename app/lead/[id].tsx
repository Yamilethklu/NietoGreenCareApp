import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Muted, styles as ui, Title } from '@/src/components/ui';
import { call, navigateTo, sms } from '@/src/lib/actions';
import { clientName, asMoney, serviceList } from '@/src/lib/format';
import { updateLeadPrice } from '@/src/lib/services';
import { colors } from '@/src/lib/theme';
import type { Lead } from '@/src/types/models';

export default function LeadDetail() {
  const { data } = useLocalSearchParams<{ id: string; data?: string }>(); const lead: Lead = data ? JSON.parse(data) as Lead : { id: '' }; const [price, setPrice] = useState(String(lead.final_price ?? '')); const [saving, setSaving] = useState(false);
  const save = async () => { const value = Number(price); if (!Number.isFinite(value) || value < 0) return Alert.alert('Monto inválido', 'Ingresa un precio final válido.'); setSaving(true); try { await updateLeadPrice(lead.id, value); Alert.alert('Guardado', `Pago final actualizado a ${asMoney(value)}.`); } catch (e) { Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error desconocido'); } finally { setSaving(false); } };
  return <ScrollView style={s.page} contentContainerStyle={s.content}><Card><Title>{clientName(lead)}</Title><Muted>{lead.address ?? 'Dirección por confirmar'}</Muted><View style={s.quick}><Button label="Llamar" onPress={() => void call(lead.phone)} /><Button label="Enviar SMS" variant="outline" onPress={() => void sms(lead.phone, clientName(lead))} /></View><Button label="Iniciar navegación GPS" onPress={() => void navigateTo(lead.address)} /></Card><Card><Text style={ui.section}>DETALLES DEL TRABAJO</Text><Text style={s.value}>Teléfono: {lead.phone ?? 'No disponible'}</Text><Text style={s.value}>Yardas: {String(lead.yards ?? 'No especificadas')}</Text><Text style={s.value}>Servicios: {serviceList(lead).join(', ') || 'No especificados'}</Text></Card><Card><Text style={ui.section}>PAGO FINAL</Text><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="$0.00" placeholderTextColor={colors.muted} style={ui.input} /><View style={s.save}><Button label={saving ? 'Guardando…' : 'Guardar pago'} disabled={saving} onPress={() => void save()} /></View></Card><Card><Text style={ui.section}>MAPA SATELITAL</Text><Muted>Abre la navegación GPS para visualizar la ubicación exacta y vista satelital del trabajo.</Muted></Card></ScrollView>;
}
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { padding: 14, gap: 12 }, quick: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 10 }, value: { color: colors.text, marginBottom: 9, lineHeight: 20 }, save: { marginTop: 12 } });