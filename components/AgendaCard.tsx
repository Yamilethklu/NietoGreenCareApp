import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from './Dropdown';
import { payLabel, STATUSES, type House, type Order, type Status, type Worker } from '../src/panel';

type DoneStatus = Status;
type PayChoice = 'paid' | 'pending';

/** Tarjeta de la Agenda del Día: solo nombre, dirección, precio editable, notas del dueño y 3 botones. */
export function AgendaCard({ order, house, workers, canAssign = true, onAssign, onStatus, onPay, onPending, onPrice, onHistory, onSaveNotes, canEditNotes = false }: {
  order: Order; house?: House; workers: Worker[]; canAssign?: boolean; onAssign: (workerId: string | null) => void; onStatus: (id: string, status: DoneStatus) => void; onPay: (id: string) => void;
  onPending: (id: string) => void; onPrice: (order: Order) => void; onHistory: () => void; onSaveNotes?: (notes: string) => Promise<void>; canEditNotes?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(order.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const bg = order.status === 'FINALIZADA' ? '#dcfce7' : order.status === 'CANCELADA' ? '#e5e7eb' : '#fff';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 8 }}>
      <Text style={{ color: '#111827', fontWeight: '900', fontSize: 17 }}>{house?.address || 'Dirección pendiente'}</Text>
      <Text style={{ color: '#475569' }}>{house?.client || 'Cliente'}</Text>
      <Pressable onPress={() => onPrice(order)} accessibilityLabel="Modificar precio" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#052e16' }}>${order.price.toFixed(2)}</Text>
        <Ionicons name="create-outline" size={16} color="#64748b" />
        <Text style={{ fontWeight: '800', color: order.paid ? '#15803d' : '#b91c1c', marginLeft: 6 }}>
          {order.paid ? `PAGADO${order.paymentMethod ? ` · ${payLabel(order.paymentMethod)}` : ''}` : 'PENDIENTE'}
        </Text>
      </Pressable>
      <View style={{ backgroundColor: '#f8fafc', padding: 9, borderRadius: 8 }}>
        {editingNotes ? <>
          <Text style={{ color: '#334155', fontWeight: '700' }}>Nota del dueño</Text>
          <TextInput multiline value={draftNotes} onChangeText={setDraftNotes} placeholder="Agregar nota del dueño" style={{ borderWidth: 1, borderColor: '#86efac', borderRadius: 8, padding: 10, minHeight: 75, color: '#111827', backgroundColor: '#fff', textAlignVertical: 'top', marginTop: 6 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Pressable disabled={savingNotes} onPress={() => { setEditingNotes(false); setDraftNotes(order.notes ?? ''); }}><Text>Cancelar</Text></Pressable>
            <Pressable disabled={savingNotes} onPress={() => { if (!onSaveNotes) return; setSavingNotes(true); void onSaveNotes(draftNotes).then(() => setEditingNotes(false)).finally(() => setSavingNotes(false)); }}><Text style={{ color: '#15803d', fontWeight: '800' }}>{savingNotes ? 'Guardando...' : 'Guardar nota'}</Text></Pressable>
          </View>
        </> : <>
          {order.notes ? <Pressable onPress={() => setExpanded(!expanded)}><Text numberOfLines={expanded ? undefined : 2} style={{ color: '#334155' }}>Nota del dueño: {order.notes}</Text><Text style={{ color: '#166534', fontWeight: '700', marginTop: 3 }}>{expanded ? 'Ver menos' : 'Ver más'}</Text></Pressable> : <Text style={{ color: '#64748b' }}>Sin nota del dueño</Text>}
          {canEditNotes && <Pressable onPress={() => { setDraftNotes(order.notes ?? ''); setEditingNotes(true); }} style={{ marginTop: 6 }}><Text style={{ color: '#15803d', fontWeight: '800' }}>{order.notes ? 'Editar nota' : '+ Agregar nota'}</Text></Pressable>}
        </>}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>{STATUSES.map((status) => <Pressable key={status} onPress={() => onStatus(order.id, status)} style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#86efac', paddingVertical: 9, backgroundColor: order.status === status ? '#16a34a' : '#fff' }}><Text style={{ textAlign: 'center', fontSize: 10, fontWeight: '800', color: order.status === status ? '#fff' : '#14532d' }}>{status}</Text></Pressable>)}</View>
      {canAssign && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><Pressable onPress={() => onAssign(null)} style={{ padding: 7, borderRadius: 14, backgroundColor: !order.workerId ? '#bbf7d0' : '#f1f5f9' }}><Text>Sin asignar</Text></Pressable>{workers.filter(w => w.active || w.id === order.workerId).map(w => <Pressable key={w.id} onPress={() => onAssign(w.id)} style={{ padding: 7, borderRadius: 14, backgroundColor: order.workerId === w.id ? '#bbf7d0' : '#f1f5f9' }}><Text>{w.name}</Text></Pressable>)}</View>}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Dropdown<PayChoice> color="#eab308" label="$" title="Estado de cobro"
          options={[{ value: 'paid', label: 'Pagado' }, { value: 'pending', label: 'Pendiente' }]}
          onSelect={(value) => (value === 'paid' ? onPay(order.id) : onPending(order.id))} />
        <Pressable accessibilityLabel="Ver historial del cliente" onPress={onHistory}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="folder-open-outline" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
