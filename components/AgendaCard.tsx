import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from './Dropdown';
import { payLabel, STATUSES, type House, type Order, type Status, type Worker } from '../src/panel';

type DoneStatus = Status;
type PayChoice = 'paid' | 'pending';

/** Tarjeta de la Agenda del Día: solo nombre, dirección, precio editable, notas del dueño y 3 botones. */
export function AgendaCard({ order, house, workers, onAssign, onStatus, onPay, onPending, onPrice, onHistory }: {
  order: Order; house?: House; workers: Worker[]; onAssign: (workerId: string | null) => void; onStatus: (id: string, status: DoneStatus) => void; onPay: (id: string) => void;
  onPending: (id: string) => void; onPrice: (order: Order) => void; onHistory: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
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
      {order.notes ? <Pressable onPress={() => setExpanded(!expanded)} style={{ backgroundColor: '#f8fafc', padding: 9, borderRadius: 8 }}><Text numberOfLines={expanded ? undefined : 2} style={{ color: '#334155' }}>Nota del dueño: {order.notes}</Text><Text style={{ color: '#166534', fontWeight: '700', marginTop: 3 }}>{expanded ? 'Ver menos' : 'Ver más'}</Text></Pressable> : null}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>{STATUSES.map((status) => <Pressable key={status} onPress={() => onStatus(order.id, status)} style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#86efac', paddingVertical: 9, backgroundColor: order.status === status ? '#16a34a' : '#fff' }}><Text style={{ textAlign: 'center', fontSize: 10, fontWeight: '800', color: order.status === status ? '#fff' : '#14532d' }}>{status}</Text></Pressable>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><Pressable onPress={() => onAssign(null)} style={{ padding: 7, borderRadius: 14, backgroundColor: !order.workerId ? '#bbf7d0' : '#f1f5f9' }}><Text>Sin asignar</Text></Pressable>{workers.filter(w => w.active || w.id === order.workerId).map(w => <Pressable key={w.id} onPress={() => onAssign(w.id)} style={{ padding: 7, borderRadius: 14, backgroundColor: order.workerId === w.id ? '#bbf7d0' : '#f1f5f9' }}><Text>{w.name}</Text></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Dropdown<DoneStatus> color="#16a34a" icon="checkmark-circle-outline" title="Estado del trabajo"
          options={[{ value: 'FINALIZADA', label: 'Realizado' }, { value: 'CANCELADA', label: 'Cancelado' }]}
          onSelect={(value) => onStatus(order.id, value)} />
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
