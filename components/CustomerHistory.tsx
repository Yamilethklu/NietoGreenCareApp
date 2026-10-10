import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { adminRequest, shareInvoice, siteUrl } from '../services/admin';

type House = { id: string; planId?: string; client: string; phone: string; email: string; address: string; service: string; notes?: string; details?: string; frequency?: string; price?: number; active?: boolean };
type Order = { id: string; houseId: string; date: string; status: string; price: number; paidAmount: number; invoiceId?: string; notes?: string };
type Invoice = { id: string; houseId: string; orderIds: string[]; total: number; paid: boolean; sentAt?: string | null };

const phone = (value: string) => value.replace(/\D/g, '').slice(-10);
const button = { backgroundColor: '#15803d', padding: 12, borderRadius: 8, marginTop: 8 } as const;
const field = { borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 8, backgroundColor: '#ffffff', color: '#111827', marginTop: 8 } as const;

export function CustomerHistory({ houses, orders, invoices, session, reload, focusHouseId, onFocused, onEditHouse }: { houses: House[]; orders: Order[]; invoices: Invoice[]; session: Session | null; reload: () => Promise<void>; focusHouseId?: string | null; onFocused?: () => void; onEditHouse?: (house: House) => void }) {
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [method, setMethod] = useState('cash');
  const [editing, setEditing] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [orderPrices, setOrderPrices] = useState<Record<string, string>>({});
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrderDate, setNewOrderDate] = useState('');
  const [newOrderService, setNewOrderService] = useState('');
  const [newOrderPrice, setNewOrderPrice] = useState('');
  const [newOrderNote, setNewOrderNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [invoiceHistoryFilter, setInvoiceHistoryFilter] = useState<'todos' | 'pagado' | 'no_pagado'>('todos');



  useEffect(() => {
    if (!focusHouseId) return;
    const house = houses.find((item) => item.id === focusHouseId);
    if (!house) return;
    setCustomer(phone(house.phone) || house.id);
    setSearch(house.client);
    onFocused?.();
  }, [focusHouseId, houses, onFocused]);

  const related = houses.filter((house) => (phone(house.phone) || house.id) === customer);
  const ids = new Set(related.map((house) => house.id));
  const primary = related[0];
  const history = orders.filter((order) => ids.has(order.houseId)).sort((a, b) => b.date.localeCompare(a.date));
  const [historyPage, setHistoryPage] = useState(0);
  const visibleHistory = history.slice(historyPage * 50, historyPage * 50 + 50);
  const selectedCount = Object.keys(selected).length;
  const totalSelected = Object.values(selected).reduce((sum, value) => sum + Number(value || 0), 0);

  const archiveHouse = (house: House) => Alert.alert(
    'Eliminar casa',
    `La casa ${house.address || house.client} se archivará y se pausarán sus visitas futuras. El historial, las órdenes y las facturas se conservarán.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Archivar casa', style: 'destructive', onPress: () => void (async () => {
        setBusy(true);
        try {
          const operations = await adminRequest('operations');
          const plans = Array.isArray(operations?.plans) ? operations.plans.filter((plan: { lead_id?: string; active?: boolean; id?: string }) => plan.lead_id === house.id && plan.active && plan.id) : [];
          for (const plan of plans) await adminRequest('operations', 'POST', { action: 'plan_update', id: plan.id, changes: { active: false } });
          await adminRequest('leads', 'PATCH', { id: house.id, changes: { status: 'cancelled' } });
          await reload();
          setMessage('Casa archivada; el historial y las facturas se conservaron.');
          if (customer === (phone(house.phone) || house.id)) { setCustomer(''); setSelected({}); setHistoryPage(0); }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'No se pudo archivar la casa.');
        } finally {
          setBusy(false);
        }
      })() },
    ],
  );

  const request = async (path: string, body: unknown) => {
    if (!session) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${siteUrl}/api/admin/operations/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw Error(data.error || 'No se pudo guardar');
      setSelected({});
      setEditing(null);
      setPrices({});
      await reload();
      setMessage('Guardado en el sitio y la app.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const updateOrderPrice = async (order: Order) => {
    const value = Number(orderPrices[order.id] ?? order.price);
    if (!Number.isFinite(value) || value < 0) {
      setMessage('Ingrese un precio válido.');
      return;
    }
    await request('', { action: 'order', order: { id: order.id, price: value } });
  };
  const createOneTimeOrder = async () => {
    if (!primary) return;
    const price = Number(newOrderPrice || primary.price || 0);
    if (!newOrderService.trim()) { setMessage('Escribe el tipo de servicio extraordinario.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newOrderDate) || Number.isNaN(Date.parse(newOrderDate))) {
      setMessage('La fecha debe tener el formato AAAA-MM-DD.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage('Ingrese un precio válido.');
      return;
    }
    await request('', {
      action: 'mobile_house',
      id: primary.id,
      house: {
        customer_name: primary.client.trim(),
        customer_phone: primary.phone.trim(),
        customer_email: primary.email.trim() || null,
        address: primary.address.trim(),
        city: '',
        zip_code: '',
      },
      cadence: 'one_time',
      first_date: newOrderDate,
      price,
      notes: [`Servicio: ${newOrderService.trim()}`, newOrderNote.trim() ? `Nota: ${newOrderNote.trim()}` : ''].filter(Boolean).join('\n'),
    });
    setNewOrderOpen(false);
    setNewOrderDate('');
    setNewOrderService('');
    setNewOrderPrice('');
    setNewOrderNote('');
  };

  if (customer && primary) {
    return (
      <View>
        <Pressable style={[button, { backgroundColor: '#475569' }]} onPress={() => { setCustomer(''); setSelected({}); setSearch(''); setHistoryPage(0); }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Volver a buscar cliente</Text>
        </Pressable>

        <View style={{ marginTop: 12, borderWidth: 1, borderColor: '#dcfce7', borderRadius: 8, padding: 12, backgroundColor: '#fff', gap: 5 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#14532d' }}>{primary.client}</Text>
          <Text>{primary.address}</Text>
          <Text>{primary.phone} · {primary.email || 'Sin correo'}</Text>
          <Text>{primary.service} · {primary.frequency || 'Sin frecuencia'}</Text>
          <Text>Precio base: ${Number(primary.price ?? 0).toFixed(2)} · {primary.active === false ? 'Inactiva' : 'Activa'}</Text>

          <Text style={{ marginTop: 6, fontWeight: '700' }}>Notas del dueño</Text>
          <Text>{primary.notes || 'Sin notas del dueño'}</Text>

          <Text style={{ marginTop: 6, fontWeight: '700' }}>Información completa de la solicitud</Text>
          <Text>{primary.details || 'Sin detalles de solicitud'}</Text>

          <Text style={{ marginTop: 6, color: '#475569' }}>
            Las visitas se muestran según el calendario automático semanal o quincenal que ya se genera desde el plan del cliente.
          </Text>

          <Pressable style={[button, { backgroundColor: '#eab308' }]} onPress={() => onEditHouse?.(primary)}>
            <Text style={{ color: '#422006', fontWeight: '800' }}>Editar casa / cliente</Text>
          </Pressable>
          <Pressable style={[button, { backgroundColor: '#b91c1c' }]} disabled={busy} onPress={() => archiveHouse(primary)}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Eliminar casa (conservar historial)</Text>
          </Pressable>
          <Link href={{ pathname: '/historial/[propertyId]', params: { propertyId: primary.id } }} asChild>
            <Pressable style={button}>
              <Text style={{ color: '#fff' }}>Ver historial completo de esta propiedad</Text>
            </Pressable>
          </Link>
        </View>

        <Pressable style={button} disabled={busy} onPress={() => setNewOrderOpen((open) => !open)}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{newOrderOpen ? 'Cerrar nueva orden' : '+ Nueva Orden'}</Text>
        </Pressable>

        {newOrderOpen && (
          <View style={{ marginTop: 10, borderWidth: 1, borderColor: '#dcfce7', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}>
            <Text style={{ fontWeight: '800' }}>Servicio extraordinario</Text>
            <TextInput accessibilityLabel="Tipo de servicio extraordinario" style={field} placeholder="Tipo de trabajo (p. ej. limpieza, poda, etc.)" value={newOrderService} onChangeText={setNewOrderService} />
            <TextInput accessibilityLabel="Fecha nueva orden" style={field} placeholder="Fecha AAAA-MM-DD" value={newOrderDate} onChangeText={setNewOrderDate} />
            <TextInput accessibilityLabel="Precio nueva orden" keyboardType="decimal-pad" style={field} placeholder="Precio" value={newOrderPrice} onChangeText={setNewOrderPrice} />
            <TextInput accessibilityLabel="Nota nueva orden" style={field} placeholder="Nota opcional" value={newOrderNote} onChangeText={setNewOrderNote} />
            <Pressable style={button} disabled={busy} onPress={() => void createOneTimeOrder()}>
              <Text style={{ color: '#fff' }}>Guardar nueva orden</Text>
            </Pressable>
          </View>
        )}

        <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 16 }}>Trabajos programados e historial</Text>

        {visibleHistory.map((order) => {
          const pending = order.paidAmount < order.price;
          const eligible = pending && !order.invoiceId;
          const balance = Math.max(0, order.price - order.paidAmount);

          return (
            <View key={order.id} style={{ borderWidth: 1, borderColor: order.id in selected ? '#15803d' : '#e2e8f0', borderRadius: 8, padding: 10, marginTop: 10, backgroundColor: '#fff', gap: 6 }}>
              <Pressable disabled={!eligible || busy} onPress={() => setSelected((current) => {
                const next = { ...current };
                if (order.id in next) delete next[order.id];
                else next[order.id] = String(balance || order.price);
                return next;
              })}>
                <Text style={{ fontWeight: '800' }}>{eligible ? (order.id in selected ? '☑ ' : '☐ ') : ''}{order.date} · {order.status}</Text>
                <Text style={{ fontWeight: '700' }}>Precio: ${order.price.toFixed(2)}</Text>
                <Text style={{ color: pending ? '#92400e' : '#166534' }}>{pending ? 'Pendiente' : 'Pagado'} · Saldo ${balance.toFixed(2)}</Text>
              </Pressable>

              <TextInput accessibilityLabel={`Precio ${order.date}`} keyboardType="decimal-pad" style={field} value={orderPrices[order.id] ?? String(order.price)} onChangeText={(value) => setOrderPrices((current) => ({ ...current, [order.id]: value }))} />

              <Pressable style={button} disabled={busy} onPress={() => void updateOrderPrice(order)}>
                <Text style={{ color: '#fff' }}>Guardar precio</Text>
              </Pressable>

              {order.id in selected && (
                <TextInput accessibilityLabel={`Monto a cobrar ${order.date}`} keyboardType="decimal-pad" style={field} value={selected[order.id]} onChangeText={(value) => setSelected({ ...selected, [order.id]: value })} />
              )}

              {order.notes ? <Text>{order.notes}</Text> : null}
            </View>
          );
        })}

        {history.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
            <Pressable accessibilityRole="button" disabled={historyPage === 0} style={[button, { backgroundColor: historyPage === 0 ? '#cbd5e1' : '#475569', flex: 1 }]} onPress={() => setHistoryPage((page) => Math.max(0, page - 1))}>
              <Text style={{ color: '#fff', textAlign: 'center' }}>Más recientes</Text>
            </Pressable>
            <Text style={{ color: '#475569' }}>{historyPage * 50 + 1}–{Math.min((historyPage + 1) * 50, history.length)} de {history.length}</Text>
            <Pressable accessibilityRole="button" disabled={(historyPage + 1) * 50 >= history.length} style={[button, { backgroundColor: (historyPage + 1) * 50 >= history.length ? '#cbd5e1' : '#475569', flex: 1 }]} onPress={() => setHistoryPage((page) => Math.min(Math.ceil(history.length / 50) - 1, page + 1))}>
              <Text style={{ color: '#fff', textAlign: 'center' }}>Anteriores</Text>
            </Pressable>
          </View>
        )}

        {!history.length && <Text style={{ color: '#64748b', marginTop: 8 }}>No hay trabajos programados para este cliente.</Text>}

        <Text style={{ marginTop: 12, fontWeight: '800' }}>
          Seleccionadas: {selectedCount} · Total a facturar: ${totalSelected.toFixed(2)}
        </Text>

        <Pressable style={button} disabled={busy || !Object.keys(selected).length || Object.values(selected).some((value) => !value.trim() || !Number.isFinite(Number(value)))} onPress={() => void request('invoice-group', { items: Object.entries(selected).map(([orderId, value]) => ({ orderId, price: Number(value) })) })}>
          <Text style={{ color: '#fff' }}>Generar 1 Solo Invoice</Text>
        </Pressable>

        <Text style={{ marginTop: 12 }}>Método de pago</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            ['cash', 'Efectivo'],
            ['cash_app', 'Cash App'],
            ['venmo', 'Venmo'],
            ['zelle', 'Zelle'],
          ].map(([key, label]) => (
            <Pressable key={key} style={[field, { backgroundColor: method === key ? '#bbf7d0' : '#fff' }]} onPress={() => setMethod(key)}>
              <Text>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 16, fontWeight: '800' }}>Invoices del cliente</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {([
            ['todos', 'Todos'],
            ['pagado', 'Pagados'],
            ['no_pagado', 'No pagados'],
          ] as const).map(([value, label]) => (
            <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: invoiceHistoryFilter === value }} style={[field, { backgroundColor: invoiceHistoryFilter === value ? '#bbf7d0' : '#fff' }]} onPress={() => setInvoiceHistoryFilter(value)}>
              <Text>{label}</Text>
            </Pressable>
          ))}
        </View>
        {invoices.filter((invoice) => ids.has(invoice.houseId) && (invoiceHistoryFilter === 'todos' || (invoiceHistoryFilter === 'pagado' ? invoice.paid : !invoice.paid))).map((invoice) => (
          <View key={invoice.id} style={field}>
            <Text>{invoice.orderIds.map((id) => orders.find((order) => order.id === id)?.date).join(' · ')}</Text>
            <Text>${invoice.total.toFixed(2)} · {invoice.paid ? 'Pagada' : 'Pendiente'}</Text>

            {!invoice.sentAt && !invoice.paid && (
              <>
                {editing === invoice.id ? (
                  <View>
                    {invoice.orderIds.map((id) => (
                      <View key={id}>
                        <Text>{orders.find((order) => order.id === id)?.date}</Text>
                        <TextInput accessibilityLabel={`Precio de visita ${orders.find((order) => order.id === id)?.date}`} style={field} keyboardType="decimal-pad" value={prices[id] ?? ''} onChangeText={(value) => setPrices((current) => ({ ...current, [id]: value }))} />
                      </View>
                    ))}

                    <Pressable style={button} disabled={busy || invoice.orderIds.some((id) => !prices[id]?.trim() || !Number.isFinite(Number(prices[id])) || Number(prices[id]) < Number(orders.find((order) => order.id === id)?.paidAmount ?? 0))} onPress={() => void request('invoices', { action: 'edit', invoice_id: invoice.id, items: invoice.orderIds.map((orderId) => ({ orderId, price: Number(prices[orderId]) })) })}>
                      <Text style={{ color: '#fff' }}>Guardar precios de la factura</Text>
                    </Pressable>

                    <Pressable style={button} disabled={busy} onPress={() => setEditing(null)}>
                      <Text style={{ color: '#fff' }}>Cancelar edición</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={button} disabled={busy} onPress={() => {
                    setEditing(invoice.id);
                    setPrices(Object.fromEntries(invoice.orderIds.map((id) => [id, String(orders.find((order) => order.id === id)?.price ?? 0)])));
                  }}>
                    <Text style={{ color: '#fff' }}>Modificar precios</Text>
                  </Pressable>
                )}
              </>
            )}

            <Pressable style={[button, { backgroundColor: '#eab308' }]} disabled={busy} onPress={() => void shareInvoice(invoice.id).catch((error) => setMessage(error instanceof Error ? error.message : 'No se pudo descargar el PDF.'))}>
              <Text style={{ color: '#422006', fontWeight: '800' }}>Ver / descargar PDF de factura</Text>
            </Pressable>
            <Pressable style={button} disabled={busy || Boolean(invoice.sentAt) || editing === invoice.id} onPress={() => void request('invoices', { action: 'send', invoice_id: invoice.id })}>
              <Text style={{ color: '#fff' }}>Enviar factura al cliente</Text>
            </Pressable>

            <Pressable style={button} disabled={busy || invoice.paid} onPress={() => void request('invoices', { action: 'pay', invoice_id: invoice.id, payment_method: method })}>
              <Text style={{ color: '#fff' }}>Registrar pago conjunto</Text>
            </Pressable>

            <Pressable style={[button, { backgroundColor: '#dc2626' }]} disabled={busy || invoice.paid || invoice.orderIds.some((id) => Number(orders.find((order) => order.id === id)?.paidAmount ?? 0) > 0)} onPress={() => Alert.alert('Eliminar factura', invoice.sentAt ? 'Esta factura ya se envió al cliente. Solo se eliminará si sigue totalmente impaga; el correo enviado no se puede retirar. ¿Deseas continuar?' : 'La factura se eliminará y las visitas quedarán disponibles para una nueva factura.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => void request('invoices', { action: 'delete', invoice_id: invoice.id, confirm_sent_unpaid: Boolean(invoice.sentAt) }) }])}>
              <Text style={{ color: '#fff' }}>Eliminar factura</Text>
            </Pressable>
          </View>
        ))}

        {message ? <Text accessibilityLiveRegion="polite" style={{ marginTop: 12 }}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Historial y cobro por cliente</Text>

      <TextInput style={field} placeholder="Buscar por nombre" value={search} onChangeText={setSearch} />

      {houses.filter((house) => house.client.toLowerCase().includes(search.toLowerCase()) || house.address.toLowerCase().includes(search.toLowerCase())).map((house) => (
        <View key={house.id} style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginTop: 10, backgroundColor: '#fff', gap: 6 }}>
          <Text style={{ fontWeight: '800', color: '#14532d' }}>{house.client}</Text>
          <Text>{house.address || 'Dirección pendiente'}</Text>
          <Text style={{ color: '#64748b' }}>{house.phone} · {house.active === false ? 'Inactiva' : 'Activa'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Abrir historial de ${house.client}`} style={[button, { backgroundColor: '#2563eb', flex: 1 }]} onPress={() => { setCustomer(phone(house.phone) || house.id); setSearch(house.client); setSelected({}); setHistoryPage(0); }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Historial</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Editar casa de ${house.client}`} style={[button, { backgroundColor: '#eab308', flex: 1 }]} disabled={busy} onPress={() => onEditHouse?.(house)}>
              <Text style={{ color: '#422006', textAlign: 'center', fontWeight: '800' }}>Editar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar casa de ${house.client}`} style={[button, { backgroundColor: '#b91c1c', flex: 1 }]} disabled={busy} onPress={() => archiveHouse(house)}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {message ? <Text accessibilityLiveRegion="polite" style={{ marginTop: 12 }}>{message}</Text> : null}
    </View>
  );
}
