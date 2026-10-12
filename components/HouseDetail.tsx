import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminRequest } from '../services/admin';
import { texasDate } from '../services/daily-agenda';
import { InvoicesPanel } from './InvoicesPanel';
import { PAGE_SIZE, isDate, type House, type Invoice, type Order } from '../src/panel';

const input = { borderWidth: 1, borderColor: '#86efac', backgroundColor: '#fff', color: '#111827', borderRadius: 8, padding: 12, marginTop: 4, marginBottom: 10 } as const;
const box = { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0', padding: 12, marginTop: 10 } as const;

function Square({ color, icon, label, onPress }: { color: string; icon?: keyof typeof Ionicons.glyphMap; label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: color, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon ? <Ionicons name={icon} size={16} color="#fff" /> : null}
      {label ? <Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text> : null}
    </Pressable>
  );
}

export function HouseDetail({ house, orders, invoices, houses, onBack, onEditHouse, onEditOrder, onDeleteOrder, reload, setMessage }: {
  house: House; orders: Order[]; invoices: Invoice[]; houses: House[]; onBack: () => void; onEditHouse: (house: House) => void;
  onEditOrder: (order: Order) => void; onDeleteOrder: (id: string) => void; reload: () => Promise<void>; setMessage: (message: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [service, setService] = useState('');
  const [date, setDate] = useState(texasDate());
  const [price, setPrice] = useState(String(house.price || ''));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const mine = useMemo(() => orders.filter((order) => order.houseId === house.id).sort((a, b) => b.date.localeCompare(a.date)), [orders, house.id]);
  const pages = Math.max(1, Math.ceil(mine.length / PAGE_SIZE));
  useEffect(() => { if (page > pages - 1) setPage(0); }, [pages, page]);
  const start = page * PAGE_SIZE;
  const shown = mine.slice(start, start + PAGE_SIZE);
  const eligible = (order: Order) => order.status !== 'CANCELADA' && !order.paid && !order.invoiceId && order.price > 0;
  const total = mine.filter((order) => selected.includes(order.id)).reduce((sum, order) => sum + order.price, 0);
  const houseInvoices = invoices.filter((invoice) => invoice.houseId === house.id);

  function toggle(order: Order) {
    if (!eligible(order)) return;
    setSelected((current) => current.includes(order.id) ? current.filter((id) => id !== order.id) : [...current, order.id]);
  }

  async function generate() {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      const items = mine.filter((order) => selected.includes(order.id) && eligible(order)).map((order) => ({ orderId: order.id, price: order.price }));
      await adminRequest('operations/invoice-group', 'POST', { items });
      setSelected([]); await reload(); setMessage('Invoice generado con las órdenes seleccionadas.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo generar el invoice.'); }
    finally { setBusy(false); }
  }

  async function createExtra() {
    if (busy) return;
    const amount = Number(price.replace(',', '.'));
    if (service.trim().length < 2) { setError('Escribe el servicio.'); return; }
    if (!isDate(date)) { setError('Escribe la fecha como AAAA-MM-DD.'); return; }
    if (!Number.isFinite(amount) || amount < 0) { setError('Escribe un precio válido.'); return; }
    setBusy(true); setError('');
    try {
      await adminRequest('operations', 'POST', { action: 'extra_order', lead_id: house.id, service_date: date, price: amount, notes: `Servicio: ${service.trim()}${notes.trim() ? `. ${notes.trim()}` : ''}` });
      setShowNew(false); setService(''); setNotes(''); await reload(); setMessage('Orden extraordinaria agregada en su fecha.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear la orden.'); }
    finally { setBusy(false); }
  }

  function confirmDelete(order: Order) {
    Alert.alert('Eliminar orden', `¿Eliminar la orden del ${order.date}? Solo se puede si no tiene pagos ni factura.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDeleteOrder(order.id) },
    ]);
  }

  return (
    <View>
      <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
        <Ionicons name="chevron-back" size={18} color="#14532d" /><Text style={{ color: '#14532d', fontWeight: '700' }}>Volver a casas</Text>
      </Pressable>
      <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#b45309' }}>{house.address}{house.city ? `, ${house.city}` : ''}</Text>
        <Text style={{ color: '#475569', marginTop: 2 }}>{house.client} · {house.phone} · Casa ID: {house.id.slice(0, 8)}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <Square color="#22c55e" icon="create-outline" label="Editar casa" onPress={() => onEditHouse(house)} />
        <Square color="#f59e0b" icon="add" label="Nueva orden" onPress={() => { setShowNew(!showNew); setShowInvoices(false); }} />
        <Square color="#38bdf8" icon="albums-outline" label="Invoices" onPress={() => { setShowInvoices(!showInvoices); setShowNew(false); }} />
      </View>

      {showNew ? (
        <View style={box}>
          <Text style={{ fontWeight: '800', color: '#b45309' }}>Nueva orden (servicio de una sola vez)</Text>
          <Text style={{ marginTop: 8, fontWeight: '700' }}>Servicio</Text>
          <TextInput style={input} value={service} onChangeText={setService} placeholder="Ej. Limpieza de jardín" />
          <Text style={{ fontWeight: '700' }}>Fecha</Text>
          <TextInput style={input} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" autoCapitalize="none" />
          <Text style={{ fontWeight: '700' }}>Precio</Text>
          <TextInput style={input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Text style={{ fontWeight: '700' }}>Notas</Text>
          <TextInput style={[input, { minHeight: 70 }]} value={notes} onChangeText={setNotes} multiline />
          {error ? <Text accessibilityRole="alert" style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text> : null}
          <Pressable disabled={busy} onPress={() => void createExtra()} style={{ backgroundColor: '#15803d', padding: 14, borderRadius: 8, opacity: busy ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{busy ? 'Guardando...' : 'Enviar'}</Text>
          </Pressable>
        </View>
      ) : null}

      {showInvoices ? (
        <View style={{ marginTop: 14 }}>
          <InvoicesPanel title="Invoices de esta casa" invoices={houseInvoices} houses={houses} orders={orders} reload={reload} setMessage={setMessage} />
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#b45309' }}>Órdenes de trabajo</Text>
            <Pressable disabled={!selected.length || busy} onPress={() => void generate()} style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, opacity: !selected.length || busy ? 0.4 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Generar Invoice{selected.length ? ` ($${total.toFixed(2)})` : ''}</Text>
            </Pressable>
          </View>
          <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>Selecciona las órdenes que se deben. Las pagadas, canceladas o ya facturadas no se pueden seleccionar.</Text>

          {shown.map((order) => {
            const can = eligible(order);
            const on = selected.includes(order.id);
            const bg = order.status === 'FINALIZADA' ? '#dcfce7' : order.status === 'CANCELADA' ? '#e5e7eb' : '#fff';
            return (
              <View key={order.id} style={[box, { backgroundColor: bg }]}>
                <Pressable disabled={!can} onPress={() => toggle(order)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={can ? '#15803d' : '#cbd5e1'} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800' }}>{order.date} · {order.service}</Text>
                    <Text style={{ color: '#475569' }}>${order.price.toFixed(2)} · {order.status} · {order.paid ? 'Pagado' : 'No pagado'}{order.invoiceId ? ' · Con invoice' : ''}</Text>
                    {order.notes ? <Text style={{ color: '#475569', marginTop: 2 }}>{order.notes}</Text> : null}
                  </View>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Square color="#eab308" icon="create-outline" onPress={() => onEditOrder(order)} />
                  <Square color="#ef4444" icon="trash-outline" onPress={() => confirmDelete(order)} />
                </View>
              </View>
            );
          })}
          {!mine.length ? <Text style={{ marginTop: 14, color: '#64748b' }}>Esta casa todavía no tiene órdenes.</Text> : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <Text style={{ color: '#334155', fontWeight: '700' }}>{mine.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, mine.length)} de ${mine.length}` : '0 de 0'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable disabled={page === 0} onPress={() => { setPage(page - 1); setSelected([]); }} style={{ padding: 10, opacity: page === 0 ? 0.3 : 1 }}><Ionicons name="chevron-back" size={22} color="#14532d" /></Pressable>
              <Pressable disabled={page >= pages - 1} onPress={() => { setPage(page + 1); setSelected([]); }} style={{ padding: 10, opacity: page >= pages - 1 ? 0.3 : 1 }}><Ionicons name="chevron-forward" size={22} color="#14532d" /></Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
