import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminRequest, shareInvoice } from '../services/admin';
import { texasDate } from '../services/daily-agenda';
import { DateField } from './DateField';
import { invoiceDate, compareHistoryDates, PAGE_SIZE, PAY_METHODS, dbPay, isDate, normalizeName, type House, type Invoice, type Order, type PayMethod } from '../src/panel';

// iOS OTA publication: invoice grouping and owner notes update.
type Filter = 'todos' | 'pagado' | 'no_pagado';
const input = { borderWidth: 1, borderColor: '#86efac', backgroundColor: '#fff', color: '#111827', borderRadius: 8, padding: 12, marginTop: 4, marginBottom: 10 } as const;
const cardStyle = { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0', padding: 12, marginTop: 10 } as const;

function RoundButton({ color, icon, onPress }: { color: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ backgroundColor: color, width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={18} color="#fff" /></Pressable>;
}

function HistoryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginVertical: 8 }}>
      <Ionicons name="albums-outline" size={16} color="#fff" />
      <Text style={{ color: '#fff', fontWeight: '700' }}>Ver historial / Generar invoice</Text>
    </Pressable>
  );
}

export function InvoicesPanel({ invoices, houses, orders, reload, setMessage, title = 'Facturas', onHistory }: {
  invoices: Invoice[]; houses: House[]; orders: Order[]; reload: () => Promise<void>; setMessage: (message: string) => void; title?: string; onHistory?: (houseId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>('todos');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>('Cash');
  const [payDate, setPayDate] = useState(texasDate());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => invoices.filter((item) => filter === 'todos' || (filter === 'pagado' ? item.paid : !item.paid)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [invoices, filter],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages - 1) setPage(0); }, [pages, page]);
  const start = page * PAGE_SIZE;
  const shown = filtered.slice(start, start + PAGE_SIZE);
  const open = invoices.find((item) => item.id === openId) ?? null;
  const houseOf = (invoice: Invoice) => houses.find((house) => house.id === invoice.houseId);

  const matchingHouses = useMemo(() => houses.filter(house => normalizeName(house.client).includes(normalizeName(search)) && search.trim().length > 0), [houses, search]);
  const history = useMemo(() => orders.filter(order => order.houseId === selectedHouse).sort((a,b) => compareHistoryDates(a.date, b.date, texasDate())), [orders, selectedHouse]);
  const chosen = history.filter(order => selectedOrders.includes(order.id));
  const computedTotal = chosen.reduce((sum, order) => sum + (Number(prices[order.id] ?? order.price) || 0), 0);
  async function createGroup() {
    if (creating || !chosen.length) return;
    if (chosen.some(order => order.status !== 'FINALIZADA' || !!order.invoiceId || !Number.isFinite(Number(prices[order.id] ?? order.price)) || Number(prices[order.id] ?? order.price) < order.paidAmount || Number(prices[order.id] ?? order.price) <= 0)) {
      setMessage('Seleccione únicamente órdenes finalizadas, sin factura y con precios válidos que cubran los pagos registrados.'); return;
    }
    setCreating(true);
    try {
      await adminRequest('operations/invoices', 'POST', { action: 'create_group', items: chosen.map(order => ({ orderId: order.id, price: Number(prices[order.id] ?? order.price) })) });
      setSelectedOrders([]); setPrices({}); await reload(); setMessage('Invoice generado con las órdenes seleccionadas.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo crear el invoice.'); }
    finally { setCreating(false); }
  }

  function remove(invoice: Invoice) {
    const sent = Boolean(invoice.sentAt);
    Alert.alert(
      'Eliminar factura',
      sent ? 'Esta factura ya fue enviada al cliente. Solo se puede eliminar si sigue sin pagar. Sus órdenes quedarán libres para otra factura. ¿Eliminarla?' : 'Sus órdenes quedarán libres para generar otra factura. ¿Eliminarla?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void (async () => {
          try {
            await adminRequest('operations/invoices', 'POST', { action: 'delete', invoice_id: invoice.id, confirm_sent_unpaid: sent });
            await reload(); setMessage('Factura eliminada.');
          } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo eliminar la factura.'); }
        })() },
      ],
    );
  }

  async function pay() {
    if (!open || busy) return;
    if (!isDate(payDate) || payDate > texasDate()) { setError('Escribe una fecha de pago válida (AAAA-MM-DD), no futura.'); return; }
    setBusy(true); setError('');
    try {
      await adminRequest('operations/invoices', 'POST', { action: 'pay', invoice_id: open.id, payment_method: dbPay(method), payment_date: payDate });
      await reload(); setMessage('Pago registrado en la factura y en las órdenes.'); setOpenId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar el pago.'); }
    finally { setBusy(false); }
  }

  return (
    <View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#14532d' }}>{title}</Text>
      <View style={cardStyle}>
        <Text style={{ fontWeight: '800', color: '#14532d', fontSize: 16 }}>Crear invoice por cliente</Text>
        <TextInput value={search} onChangeText={value => { setSearch(value); setSelectedHouse(null); setSelectedOrders([]); setPrices({}); }} placeholder="Buscar por nombre del cliente" style={input} />
        {matchingHouses.map(house => <Pressable key={house.id} onPress={() => { setSelectedHouse(house.id); setSelectedOrders([]); setPrices({}); }} style={{ padding: 10, backgroundColor: selectedHouse === house.id ? '#bbf7d0' : '#f1f5f9', marginBottom: 5, borderRadius: 7 }}><Text style={{ fontWeight: '700' }}>{house.client}</Text><Text>{house.address}</Text></Pressable>)}
        {selectedHouse && onHistory && <HistoryButton onPress={() => onHistory(selectedHouse)} />}
        {selectedHouse && <>
          <Text style={{ fontWeight: '800', marginTop: 8 }}>Historial de órdenes de trabajo</Text>
          {history.map(order => <View key={order.id} style={{ borderBottomWidth: 1, borderColor: '#e2e8f0', paddingVertical: 9 }}>
            <Pressable onPress={() => { if (order.invoiceId || order.status !== 'FINALIZADA') return; setSelectedOrders(previous => previous.includes(order.id) ? previous.filter(id => id !== order.id) : [...previous, order.id]); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={selectedOrders.includes(order.id) ? 'checkbox' : 'square-outline'} size={23} color={order.invoiceId || order.status !== 'FINALIZADA' ? '#94a3b8' : '#15803d'} />
              <View style={{ flex: 1 }}><Text>{invoiceDate(order.date)} · {order.service}</Text><Text style={{ color: '#64748b', fontSize: 12 }}>{order.invoiceId ? 'Ya facturada' : order.status !== 'FINALIZADA' ? 'No finalizada' : 'Disponible'} · ${order.price.toFixed(2)}</Text></View>
            </Pressable>
            {selectedOrders.includes(order.id) && <TextInput value={prices[order.id] ?? String(order.price)} onChangeText={value => setPrices(previous => ({ ...previous, [order.id]: value }))} keyboardType="decimal-pad" style={[input, { marginLeft: 30, marginBottom: 0 }]} placeholder="Precio editable" />}
          </View>)}
          {!history.length && <Text>No hay órdenes para este cliente.</Text>}
          <Text style={{ fontWeight: '900', fontSize: 18, marginVertical: 12 }}>Total automático: ${computedTotal.toFixed(2)}</Text>
          <Pressable disabled={!chosen.length || creating} onPress={() => void createGroup()} style={{ backgroundColor: '#15803d', padding: 13, borderRadius: 8, opacity: !chosen.length || creating ? 0.5 : 1 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>{creating ? 'Generando...' : 'Generar invoice de las seleccionadas'}</Text></Pressable>
        </>}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {([['todos', 'Todos'], ['pagado', 'Pagado'], ['no_pagado', 'No pagado']] as [Filter, string][]).map(([key, text]) => (
          <Pressable key={key} onPress={() => { setFilter(key); setPage(0); }} style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#86efac', backgroundColor: filter === key ? '#bbf7d0' : '#fff' }}>
            <Text style={{ textAlign: 'center', fontWeight: '700', fontSize: 13 }}>{text}</Text>
          </Pressable>
        ))}
      </View>

      {shown.map((invoice) => {
        const house = houseOf(invoice);
        return (
          <View key={invoice.id} style={cardStyle}>
            <Text style={{ fontWeight: '800' }}>{house?.address ?? 'Casa'}</Text>
            {house && onHistory && <HistoryButton onPress={() => onHistory(house.id)} />}
            <Text style={{ color: '#475569', marginTop: 2 }}>{invoice.number ?? invoice.id.slice(0, 8)} · {invoiceDate(invoice.createdAt)}</Text>
            <Text style={{ marginTop: 6, fontSize: 16, fontWeight: '700' }}>${invoice.total.toFixed(2)} · <Text style={{ color: invoice.paid ? '#15803d' : '#b91c1c' }}>{invoice.paid ? 'Pagado' : 'No pagado'}</Text></Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <RoundButton color="#38bdf8" icon="eye-outline" onPress={() => { setOpenId(invoice.id); setError(''); setPayDate(texasDate()); }} />
              <RoundButton color="#eab308" icon="download-outline" onPress={() => void shareInvoice(invoice.id).catch((cause) => setMessage(cause instanceof Error ? cause.message : 'No se pudo abrir el PDF.'))} />
              <RoundButton color="#ef4444" icon="trash-outline" onPress={() => remove(invoice)} />
            </View>
          </View>
        );
      })}
      {!filtered.length ? <Text style={{ marginTop: 16, color: '#64748b' }}>No hay facturas con este filtro.</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <Text style={{ color: '#334155', fontWeight: '700' }}>{filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} de ${filtered.length}` : '0 de 0'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable disabled={page === 0} onPress={() => setPage(page - 1)} style={{ padding: 10, opacity: page === 0 ? 0.3 : 1 }}><Ionicons name="chevron-back" size={22} color="#14532d" /></Pressable>
          <Pressable disabled={page >= pages - 1} onPress={() => setPage(page + 1)} style={{ padding: 10, opacity: page >= pages - 1 ? 0.3 : 1 }}><Ionicons name="chevron-forward" size={22} color="#14532d" /></Pressable>
        </View>
      </View>

      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpenId(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {open ? (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#14532d' }}>Invoice {open.number ?? ''}</Text>
              <Text style={{ color: '#475569', marginTop: 4 }}>{houseOf(open)?.address ?? 'Casa'}</Text>
              <Text style={{ marginTop: 14, fontWeight: '800', color: '#b45309' }}>Conceptos</Text>
              {open.orderIds.map((id) => {
                const order = orders.find((item) => item.id === id);
                const total = open.items?.find((item) => item.orderId === id)?.total ?? order?.price ?? 0;
                return (
                  <View key={id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ flex: 1 }}>{invoiceDate(order?.date ?? '')} · {order?.service ?? 'Servicio'}</Text>
                    <Text style={{ fontWeight: '700' }}>${total.toFixed(2)}</Text>
                  </View>
                );
              })}
              <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '800' }}>Total ${open.total.toFixed(2)} · {open.paid ? 'Pagado' : 'No pagado'}</Text>

              <Pressable onPress={() => void shareInvoice(open.id).catch(cause => setError(cause instanceof Error ? cause.message : 'No se pudo descargar el PDF.'))} style={{ backgroundColor: '#2563eb', padding: 13, borderRadius: 8, marginTop: 12 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Descargar PDF</Text></Pressable>
              {open.paid ? null : (
                <View style={{ marginTop: 18 }}>
                  <Text style={{ fontWeight: '800', color: '#b45309' }}>Registrar pago</Text>
                  <Text style={{ marginTop: 8, fontWeight: '700' }}>Fecha</Text>
                  <DateField value={payDate} onChange={setPayDate} inputStyle={input} maxDate={texasDate()} />
                  <Text style={{ fontWeight: '700' }}>Forma de pago</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
                    {PAY_METHODS.map((item) => (
                      <Pressable key={item} onPress={() => setMethod(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#86efac', backgroundColor: method === item ? '#bbf7d0' : '#fff' }}>
                        <Text style={{ fontWeight: '700' }}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {error ? <Text accessibilityRole="alert" style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text> : null}
                  <Pressable disabled={busy} onPress={() => void pay()} style={{ backgroundColor: '#15803d', padding: 14, borderRadius: 8, opacity: busy ? 0.6 : 1 }}>
                    <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{busy ? 'Guardando...' : 'Registrar pago'}</Text>
                  </Pressable>
                </View>
              )}
              <Pressable onPress={() => setOpenId(null)} style={{ padding: 16 }}><Text style={{ textAlign: 'center', color: '#475569' }}>Cerrar</Text></Pressable>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}



