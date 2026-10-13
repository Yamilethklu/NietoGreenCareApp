import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from './Dropdown';
import { PAGE_SIZE, payLabel, type House, type Invoice, type Order, type Status } from '../src/panel';

type Choice = 'FINALIZADA' | 'CANCELADA';

function NotesField({ order, onSave }: { order: Order; onSave: (order: Order, notes: string) => void }) {
  const [value, setValue] = useState(order.notes ?? '');
  useEffect(() => setValue(order.notes ?? ''), [order.notes]);
  return (
    <TextInput value={value} onChangeText={setValue} multiline placeholder="Notas personales del dueño"
      onEndEditing={() => { if (value.trim() !== (order.notes ?? '').trim()) onSave(order, value.trim()); }}
      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 9, color: '#0f172a', minHeight: 40 }} />
  );
}

/** Módulo Solicitudes (antes Órdenes de Trabajo). */
export function RequestsPanel({ orders, houses, invoices, filterDate, onOpenCalendar, onClearFilter, onStatus, onPay, onEdit, onDelete, onHistory, onSaveNotes, onNew }: {
  orders: Order[]; houses: House[]; invoices: Invoice[]; filterDate: string | null; onOpenCalendar: () => void; onClearFilter: () => void;
  onStatus: (id: string, status: Status) => void; onPay: (id: string) => void; onEdit: (order: Order) => void; onDelete: (id: string) => void;
  onHistory: (houseId: string) => void; onSaveNotes: (order: Order, notes: string) => void; onNew: () => void;
}) {
  const [page, setPage] = useState(0);
  const rows = useMemo(() => orders.filter((order) => !filterDate || order.date === filterDate).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), [orders, filterDate]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => { setPage(0); }, [filterDate]);
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const invoiceOf = (order: Order) => invoices.find((invoice) => invoice.orderIds.includes(order.id));

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#0f172a', fontWeight: '900', fontSize: 22 }}>Solicitudes</Text>
        <Pressable onPress={onNew} style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: '#052e16', fontWeight: '900' }}>+ Nueva Solicitud</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={onOpenCalendar} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#86efac', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }}>
          <Ionicons name="calendar-outline" size={18} color="#14532d" />
          <Text style={{ fontWeight: '800', color: '#14532d' }}>{filterDate ?? 'Filtrar por fecha'}</Text>
        </Pressable>
        {filterDate ? <Pressable onPress={onClearFilter} style={{ paddingHorizontal: 10, paddingVertical: 9 }}><Text style={{ color: '#b91c1c', fontWeight: '800' }}>Quitar filtro</Text></Pressable> : null}
      </View>

      {shown.map((order) => {
        const house = houses.find((item) => item.id === order.houseId);
        const invoice = invoiceOf(order);
        const bg = order.status === 'FINALIZADA' ? '#dcfce7' : order.status === 'CANCELADA' ? '#e5e7eb' : '#ffffff';
        return (
          <View key={order.id} style={{ backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 6 }}>
            <Text style={{ color: '#64748b', fontSize: 12 }}>ID {order.id.slice(0, 8)} · {order.date}</Text>
            <Text style={{ color: '#111827', fontWeight: '900', fontSize: 16 }}>{house?.address || 'Domicilio pendiente'}</Text>
            <Text style={{ color: '#475569' }}>{house?.client ?? ''}</Text>
            <Text style={{ color: '#475569' }}>Servicio: {order.service}</Text>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#052e16' }}>Precio: ${order.price.toFixed(2)}</Text>
            <Text style={{ color: '#334155', fontWeight: '700' }}>Status: {order.status === 'SOLICITADA' ? 'Solicitada' : order.status === 'FINALIZADA' ? 'Finalizada' : 'Cancelada'}</Text>
            <Text style={{ color: '#334155' }}>Invoice: {invoice?.number ?? (order.invoiceId ? 'Generado' : '—')}</Text>
            <Text style={{ fontWeight: '800', color: order.paid ? '#15803d' : '#b91c1c' }}>{order.paid ? `Pagado${order.paymentMethod ? ` · ${payLabel(order.paymentMethod)}` : ''}` : 'No Pagado'}</Text>
            <NotesField order={order} onSave={onSaveNotes} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <Dropdown<Choice> color="#16a34a" label="Estatus" title="Cambiar estatus"
                options={[{ value: 'FINALIZADA', label: 'Finalizada' }, { value: 'CANCELADA', label: 'Cancelada' }]}
                onSelect={(value) => onStatus(order.id, value)} />
              <Pressable accessibilityLabel="Historial de la casa" onPress={() => onHistory(order.houseId)} style={{ backgroundColor: '#2563eb', borderRadius: 8, width: 40, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="folder-open-outline" size={18} color="#fff" />
              </Pressable>
              <Pressable accessibilityLabel="Registrar pago" disabled={order.paid} onPress={() => onPay(order.id)} style={{ backgroundColor: '#22c55e', borderRadius: 8, width: 40, height: 38, alignItems: 'center', justifyContent: 'center', opacity: order.paid ? 0.3 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>$</Text>
              </Pressable>
              <Pressable accessibilityLabel="Editar" disabled={order.paid} onPress={() => onEdit(order)} style={{ backgroundColor: '#eab308', borderRadius: 8, width: 40, height: 38, alignItems: 'center', justifyContent: 'center', opacity: order.paid ? 0.3 : 1 }}>
                <Ionicons name="create-outline" size={18} color="#fff" />
              </Pressable>
              <Pressable accessibilityLabel="Eliminar" disabled={order.paid} onPress={() => onDelete(order.id)} style={{ backgroundColor: '#ef4444', borderRadius: 8, width: 40, height: 38, alignItems: 'center', justifyContent: 'center', opacity: order.paid ? 0.3 : 1 }}>
                <Ionicons name="trash-outline" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        );
      })}
      {!rows.length ? <Text style={{ textAlign: 'center', color: '#64748b', fontWeight: '700', padding: 24 }}>{filterDate ? 'No hay solicitudes en esa fecha.' : 'Todavía no hay solicitudes.'}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700', color: '#334155' }}>{rows.length ? `${current * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE + PAGE_SIZE, rows.length)} de ${rows.length}` : '0 de 0'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable disabled={current === 0} onPress={() => setPage(current - 1)} style={{ padding: 10, opacity: current === 0 ? 0.3 : 1 }}><Ionicons name="chevron-back" size={22} color="#14532d" /></Pressable>
          <Pressable disabled={current >= pages - 1} onPress={() => setPage(current + 1)} style={{ padding: 10, opacity: current >= pages - 1 ? 0.3 : 1 }}><Ionicons name="chevron-forward" size={22} color="#14532d" /></Pressable>
        </View>
      </View>
    </View>
  );
}
