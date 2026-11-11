import { shiftDate, normalizeName, isDate, type House, type Order, type Invoice, type Worker } from '../src/panel';

// A fresh instance belongs to one demo visit. No storage, auth, fetch or database access.
export function createDemoStore(today: string) {
  let sequence = 10;
  const id = () => `demo-${++sequence}`;
  const houses: House[] = [{ id: 'demo-house', client: 'Cliente de demostración', address: '100 Demo Lane', city: 'Austin', state: 'TX', zipCode: '78701', phone: '5125550100', email: 'demo@example.com', frequency: 'Cada 8 dias', service: 'Yard', price: 45, active: true, notes: 'Cerrar la puerta al terminar. Datos ficticios.', firstDate: today }];
  const workers: Worker[] = [{ id: 'demo-worker', name: 'Trabajador de demostración', email: 'worker@example.com', active: true }];
  const orders: Order[] = [-16, -8, 0, 8, 16, 24, 32, 40, 48, 56].map((offset, index) => ({ id: `demo-order-${index}`, houseId: 'demo-house', date: shiftDate(today, offset), service: 'Yard', price: 45, status: offset < 0 ? 'FINALIZADA' : 'SOLICITADA', paid: false, paidAmount: 0, workerId: 'demo-worker', notes: houses[0].notes }));
  const invoices: Invoice[] = [];
  const findOrder = (value: string) => { const order = orders.find(o => o.id === value); if (!order) throw Error('Trabajo demo no encontrado.'); return order; };
  function updateOrder(value: string, changes: Partial<Order>) {
    const order = findOrder(value);
    if (order.invoiceId && ['price', 'paid', 'paidAmount'].some(key => key in changes)) throw Error('Modifica el pago desde el invoice asociado.');
    if (changes.price !== undefined && (!Number.isFinite(changes.price) || changes.price < order.paidAmount)) throw Error('El precio debe cubrir el importe pagado.');
    Object.assign(order, changes);
  }
  function saveHouse(house: House) {
    if (!house.client.trim() || !house.address.trim() || !isDate(house.firstDate || today) || !Number.isFinite(house.price) || house.price < 0) throw Error('Completa nombre, dirección y precio válido.');
    const existing = houses.find(h => h.id === house.id);
    if (existing) { Object.assign(existing, house); return; }
    houses.push({ ...house });
    const step = /(?:8|7)/.test(house.frequency) ? 8 : /(?:15|14)/.test(house.frequency) ? 15 : 0;
    for (let offset = 0; offset <= (step ? 60 : 0); offset += step || 1) orders.push({ id: id(), houseId: house.id, date: shiftDate(house.firstDate || today, offset), service: house.service, price: house.price, notes: house.notes, status: 'SOLICITADA', paid: false, paidAmount: 0 });
  }
  function addRequest(value: { name: string; address: string; city: string; zip: string; phone: string; email: string; services: string; date: string; note: string; price: number }) {
    let house = houses.find(h => normalizeName(h.client) === normalizeName(value.name));
    if (!house) { house = { id: id(), client: value.name, address: value.address, city: value.city, zipCode: value.zip, phone: value.phone, email: value.email, frequency: 'Una vez', service: value.services, price: value.price, notes: value.note, active: true, firstDate: value.date }; houses.push(house); }
    orders.push({ id: id(), houseId: house.id, date: value.date, service: value.services, price: value.price, notes: value.note, status: 'SOLICITADA', paid: false, paidAmount: 0 });
  }
  async function request(path: string, method = 'GET', body?: unknown) {
    if (method !== 'POST') throw Error('Operación no disponible en demo.');
    const b = body as { action?: string; invoice_id?: string; items?: {orderId: string; price: number}[]; lead_id?: string; service_date?: string; price?: number; notes?: string; payment_method?: string };
    if (!b) throw Error('Faltan datos.');
    if (path === 'operations' && b.action === 'extra_order') {
      const house = houses.find(h => h.id === b.lead_id);
      if (!house || !b.service_date || !Number.isFinite(b.price) || b.price! < 0) throw Error('Datos inválidos.');
      orders.push({ id: id(), houseId: house.id, date: b.service_date, service: house.service, price: b.price!, notes: b.notes, status: 'SOLICITADA', paid: false, paidAmount: 0 }); return;
    }
    if (path === 'operations/invoice-group' || (path === 'operations/invoices' && b.action === 'create_group')) {
      const items = b.items ?? [];
      const selected = items.map(item => findOrder(item.orderId));
      if (!items.length || new Set(items.map(i => i.orderId)).size !== items.length || new Set(selected.map(o => o.houseId)).size !== 1 || selected.some(o => o.paid || o.invoiceId || o.status !== 'FINALIZADA') || items.some((i, n) => !Number.isFinite(i.price) || i.price <= 0 || i.price < selected[n].paidAmount)) throw Error('Selecciona trabajos finalizados pendientes de una misma casa.');
      const invoice: Invoice = { id: id(), houseId: selected[0].houseId, createdAt: today, orderIds: selected.map(o => o.id), items: items.map(i => ({orderId:i.orderId,total:i.price})), number: `DEMO-${sequence}`, total: items.reduce((sum, i) => sum + i.price, 0), paid: false };
      selected.forEach((o, i) => { o.price = items[i].price; o.invoiceId = invoice.id; }); invoices.push(invoice); return;
    }
    if (path === 'operations/invoices') {
      const index = invoices.findIndex(i => i.id === b.invoice_id);
      if (index < 0) throw Error('Invoice demo no encontrado.');
      const invoice = invoices[index];
      if (b.action === 'pay') { invoice.paid = true; invoice.orderIds.forEach(value => { const o = findOrder(value); o.paid = true; o.paidAmount = o.price; o.paymentMethod = b.payment_method; }); return; }
      if (b.action === 'delete') { invoice.orderIds.forEach(value => { const o = findOrder(value); delete o.invoiceId; if (invoice.paid) { o.paid = false; o.paidAmount = 0; delete o.paymentMethod; } }); invoices.splice(index, 1); return; }
    }
    // Unknown operations must fail closed; never delegate to the production API.
    throw Error('Operación no disponible en la demostración.');
  }
  return { houses, orders, invoices, workers, request, updateOrder, saveHouse, addRequest,
    deleteOrder(value: string) { if (findOrder(value).invoiceId) throw Error('Elimina primero el invoice asociado.'); orders.splice(orders.findIndex(o => o.id === value), 1); },
    saveWorker(worker: Worker) { const old = workers.find(w => w.id === worker.id); if (old) Object.assign(old, worker); else workers.push({...worker}); },
    deleteWorker(value: string) { const index = workers.findIndex(w => w.id === value); if (index >= 0) workers.splice(index, 1); orders.forEach(o => { if (o.workerId === value) delete o.workerId; }); },
  };
}
