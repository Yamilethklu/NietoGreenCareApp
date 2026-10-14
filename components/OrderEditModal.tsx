import { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { STATUSES, isDate, type Order, type Status } from '../src/panel';
import { DateField } from './DateField';

const input = { borderWidth: 1, borderColor: '#86efac', backgroundColor: '#fff', color: '#111827', borderRadius: 8, padding: 12, marginTop: 4, marginBottom: 10 } as const;
const label = { fontWeight: '700', color: '#14532d' } as const;

export type OrderChanges = { service_date: string; price: number; notes: string | null; status: 'scheduled' | 'completed' | 'cancelled' };

export function OrderEditModal({ order, onClose, onSave }: { order: Order | null; onClose: () => void; onSave: (order: Order, changes: OrderChanges) => Promise<void> }) {
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('SOLICITADA');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setDate(order.date); setPrice(String(order.price)); setNotes(order.notes ?? ''); setStatus(order.status); setError('');
  }, [order]);

  if (!order) return null;

  async function save() {
    if (!order || saving) return;
    const amount = Number(price.replace(',', '.'));
    if (!isDate(date)) { setError('Escribe la fecha como AAAA-MM-DD.'); return; }
    if (!Number.isFinite(amount) || amount < 0) { setError('Escribe un precio válido.'); return; }
    setSaving(true); setError('');
    try {
      await onSave(order, { service_date: date, price: amount, notes: notes.trim() || null, status: status === 'FINALIZADA' ? 'completed' : status === 'CANCELADA' ? 'cancelled' : 'scheduled' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#14532d' }}>Editar orden</Text>
          <Text style={{ color: '#475569', marginBottom: 12 }}>{order.service}</Text>
          <Text style={label}>Fecha</Text>
          <DateField value={date} onChange={setDate} inputStyle={input} />
          <Text style={label}>Precio</Text>
          <TextInput style={input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Text style={label}>Estado</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
            {STATUSES.map((item) => (
              <Pressable key={item} onPress={() => setStatus(item)} style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#86efac', backgroundColor: status === item ? '#bbf7d0' : '#fff' }}>
                <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '700' }}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={label}>Notas</Text>
          <TextInput style={[input, { minHeight: 80 }]} value={notes} onChangeText={setNotes} multiline />
          {error ? <Text accessibilityRole="alert" style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text> : null}
          <Pressable disabled={saving} onPress={() => void save()} style={{ backgroundColor: '#15803d', padding: 14, borderRadius: 8, opacity: saving ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ padding: 14 }}><Text style={{ textAlign: 'center', color: '#475569' }}>Cancelar</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

