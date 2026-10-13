import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from './Dropdown';
import { payLabel, type House, type Order } from '../src/panel';

type DoneStatus = 'FINALIZADA' | 'CANCELADA';
type PayChoice = 'paid' | 'pending';

/** Tarjeta de la Agenda del Día: solo nombre, dirección, precio editable, notas del dueño y 3 botones. */
export function AgendaCard({ order, house, onStatus, onPay, onPending, onPrice, onHistory }: {
  order: Order; house?: House; onStatus: (id: string, status: DoneStatus) => void; onPay: (id: string) => void;
  onPending: (id: string) => void; onPrice: (order: Order) => void; onHistory: () => void;
}) {
  const bg = order.status === 'FINALIZADA' ? '#dcfce7' : order.status === 'CANCELADA' ? '#e5e7eb' : '#fff';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 8 }}>
      <Text style={{ color: '#111827', fontWeight: '900', fontSize: 17 }}>{house?.client || 'Cliente'}</Text>
      <Text style={{ color: '#475569' }}>{house?.address || 'Dirección pendiente'}</Text>
      <Pressable onPress={() => onPrice(order)} accessibilityLabel="Modificar precio" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#052e16' }}>${order.price.toFixed(2)}</Text>
        <Ionicons name="create-outline" size={16} color="#64748b" />
        <Text style={{ fontWeight: '800', color: order.paid ? '#15803d' : '#b91c1c', marginLeft: 6 }}>
          {order.paid ? `PAGADO${order.paymentMethod ? ` · ${payLabel(order.paymentMethod)}` : ''}` : 'PENDIENTE'}
        </Text>
      </Pressable>
      {order.notes ? <Text style={{ color: '#334155', backgroundColor: '#f8fafc', padding: 9, borderRadius: 8 }}>Nota del dueño: {order.notes}</Text> : null}
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
