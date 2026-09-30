import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const SITE_URL = 'https://nietogreecare-site.vercel.app';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type Status = 'SOLICITADO' | 'FINALIZADA' | 'CANCELADA';
type LeadStatus = 'pendiente' | 'programado' | 'completado' | 'cancelado';
type PaymentMethod = 'Cash' | 'CashApp' | 'Venmo' | 'Zelle';
type Frequency = 'Cada 8 dias' | 'Cada 15 dias' | 'Una vez';
type Tab = 'dashboard' | 'solicitudes' | 'clientes' | 'agenda' | 'casas' | 'invoices' | 'trabajadores' | 'precios' | 'galeria' | 'opiniones' | 'qr' | 'editor';

type House = {
  id: string;
  client: string;
  address: string;
  phone: string;
  email: string;
  frequency: Frequency;
  service: string;
  price: number;
  active: boolean;
  notes: string;
};

type WorkOrder = {
  id: string;
  houseId: string;
  date: string;
  service: string;
  price: number;
  status: Status;
  paid: boolean;
  workerId?: string;
  notes?: string;
  invoiceId?: string;
  payment?: { date: string; method: PaymentMethod; note?: string };
};

type Invoice = {
  id: string;
  houseId: string;
  createdAt: string;
  orderIds: string[];
  total: number;
  paid: boolean;
  payment?: { date: string; method: PaymentMethod; note?: string };
};

type Worker = {
  id: string;
  name: string;
  email: string;
  passwordStatus: 'Pendiente de crear' | 'Activa';
  active?: boolean;
};

type Lead = {
  id: string;
  customer: string;
  phone: string;
  email: string;
  address: string;
  reference: string;
  services: string;
  areaSqFt: number;
  details: string;
  gateCode?: string;
  status: LeadStatus;
  finalPrice: number;
  scheduledAt: string;
};

type CustomerSummary = {
  id: string;
  name: string;
  phone: string;
  requests: number;
  completed: number;
  paidTotal: number;
};

type PricingRule = {
  id: string;
  frequency: 'Semanal' | 'Quincenal';
  minArea: number;
  maxArea: number;
  price: number;
};

type GalleryItem = {
  id: string;
  title: string;
  type: 'foto' | 'video';
  visible: boolean;
};

type Review = {
  id: string;
  customer: string;
  rating: number;
  text: string;
  visible: boolean;
};

type SiteSection = {
  id: string;
  section: string;
  title: string;
  body: string;
  visible: boolean;
};

const today = new Date().toISOString().slice(0, 10);

const demoHouses: House[] = [
  {
    id: 'h1',
    client: 'Maria Lopez',
    address: '1208 Blue Ridge Dr, Georgetown, TX',
    phone: '512-555-0121',
    email: 'maria@example.com',
    frequency: 'Cada 15 dias',
    service: 'Yarda completa',
    price: 65,
    active: true,
    notes: 'Tiene mascotas. Avisar antes de entrar.',
  },
  {
    id: 'h2',
    client: 'Carlos Rivera',
    address: '741 Oak Meadow Ln, Leander, TX',
    phone: '512-555-0178',
    email: 'carlos@example.com',
    frequency: 'Cada 8 dias',
    service: 'Frente y atras',
    price: 55,
    active: true,
    notes: 'Porton con codigo.',
  },
];

const demoOrders: WorkOrder[] = [
  { id: 'o1', houseId: 'h1', date: today, service: 'Corte de yarda', price: 65, status: 'SOLICITADO', paid: false, workerId: 'w1', notes: 'Revisar orillas.' },
  { id: 'o2', houseId: 'h2', date: today, service: 'Corte semanal', price: 55, status: 'SOLICITADO', paid: false, workerId: 'w2' },
  { id: 'o3', houseId: 'h1', date: '2026-09-22', service: 'Corte de yarda', price: 65, status: 'FINALIZADA', paid: false, workerId: 'w1' },
  { id: 'o4', houseId: 'h1', date: '2026-09-08', service: 'Corte de yarda', price: 65, status: 'FINALIZADA', paid: true, workerId: 'w1', invoiceId: 'i1', payment: { date: '2026-09-10', method: 'Zelle' } },
];

const demoWorkers: Worker[] = [
  { id: 'w1', name: 'Luis Nieto', email: 'luis@nietogreencare.com', passwordStatus: 'Activa', active: true },
  { id: 'w2', name: 'Trabajador Demo', email: 'worker@nietogreencare.com', passwordStatus: 'Pendiente de crear', active: true },
];

const demoLeads: Lead[] = [
  { id: 'l1', customer: 'Ana Martinez', phone: '512-555-0199', email: 'ana@example.com', address: '212 Cedar Park Dr, Cedar Park, TX', reference: 'NGC-1024', services: 'Corte de cesped', areaSqFt: 4820, details: 'Frente y atras, quincenal', gateCode: '4421', status: 'pendiente', finalPrice: 65, scheduledAt: today },
  { id: 'l2', customer: 'Jose Perez', phone: '512-555-0180', email: 'jose@example.com', address: '88 Round Rock Ave, Round Rock, TX', reference: 'NGC-1025', services: 'Corte de cesped', areaSqFt: 3900, details: 'Solo frente, semanal', status: 'programado', finalPrice: 45, scheduledAt: today },
];

const demoPricing: PricingRule[] = [
  { id: 'p1', frequency: 'Semanal', minArea: 0, maxArea: 4800, price: 30 },
  { id: 'p2', frequency: 'Quincenal', minArea: 3800, maxArea: 4800, price: 40 },
  { id: 'p3', frequency: 'Quincenal', minArea: 5000, maxArea: 6000, price: 60 },
];

const demoGallery: GalleryItem[] = [
  { id: 'g1', title: 'Antes y despues - Georgetown', type: 'foto', visible: true },
  { id: 'g2', title: 'Video corte semanal', type: 'video', visible: false },
];

const demoReviews: Review[] = [
  { id: 'r1', customer: 'Maria Lopez', rating: 5, text: 'Muy buen trabajo y puntualidad.', visible: true },
  { id: 'r2', customer: 'Carlos Rivera', rating: 5, text: 'Excelente servicio de yarda.', visible: true },
];

const demoSections: SiteSection[] = [
  { id: 's1', section: 'Marca', title: 'Nieto Green Care', body: 'Lawn care profesional en Central Texas.', visible: true },
  { id: 's2', section: 'Inicio', title: 'Cotiza tu corte de cesped', body: 'Mide tu yarda y agenda una visita desde el sitio.', visible: true },
  { id: 's3', section: 'Zonas', title: 'Cobertura semanal', body: 'Liberty Hill, Georgetown, Leander, Cedar Park, Hutto y Round Rock.', visible: true },
];

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedDate, setSelectedDate] = useState(today);
  const [syncMessage, setSyncMessage] = useState(supabase ? 'Conectando con Supabase...' : 'Modo demo listo para conectar al sitio');
  const [leads, setLeads] = useState(demoLeads);
  const [houses, setHouses] = useState(demoHouses);
  const [orders, setOrders] = useState(demoOrders);
  const [workers, setWorkers] = useState(demoWorkers);
  const [pricing, setPricing] = useState(demoPricing);
  const [gallery, setGallery] = useState(demoGallery);
  const [reviews, setReviews] = useState(demoReviews);
  const [sections, setSections] = useState(demoSections);
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'i1', houseId: 'h1', createdAt: '2026-09-10', orderIds: ['o4'], total: 65, paid: true, payment: { date: '2026-09-10', method: 'Zelle' } },
  ]);
  const [invoiceFilter, setInvoiceFilter] = useState<'todos' | 'pagado' | 'no_pagado'>('todos');
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'order' | 'invoice'; id: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    void loadSupabaseData();
  }, []);

  const visibleOrders = useMemo(
    () => orders.filter((order) => order.date === selectedDate).sort((a, b) => a.id.localeCompare(b.id)),
    [orders, selectedDate],
  );

  const customers = useMemo<CustomerSummary[]>(() => {
    const byPhone = new Map<string, CustomerSummary>();
    leads.forEach((lead) => {
      const current = byPhone.get(lead.phone) ?? { id: lead.phone, name: lead.customer, phone: lead.phone, requests: 0, completed: 0, paidTotal: 0 };
      current.requests += 1;
      if (lead.status === 'completado') current.completed += 1;
      current.paidTotal += invoices.filter((invoice) => getHouse(invoice.houseId)?.phone === lead.phone && invoice.paid).reduce((sum, invoice) => sum + invoice.total, 0);
      byPhone.set(lead.phone, current);
    });
    houses.forEach((house) => {
      if (!byPhone.has(house.phone)) byPhone.set(house.phone, { id: house.id, name: house.client, phone: house.phone, requests: 0, completed: orders.filter((order) => order.houseId === house.id && order.status === 'FINALIZADA').length, paidTotal: invoices.filter((invoice) => invoice.houseId === house.id && invoice.paid).reduce((sum, invoice) => sum + invoice.total, 0) });
    });
    return [...byPhone.values()];
  }, [houses, invoices, leads, orders]);

  const metrics = useMemo(() => ({
    income: invoices.filter((invoice) => invoice.paid).reduce((sum, invoice) => sum + invoice.total, 0),
    completed: orders.filter((order) => order.status === 'FINALIZADA').length,
    pending: leads.filter((lead) => lead.status === 'pendiente').length,
    measuredArea: leads.reduce((sum, lead) => sum + lead.areaSqFt, 0),
  }), [invoices, leads, orders]);

  const filteredInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (invoiceFilter === 'pagado') return sorted.filter((invoice) => invoice.paid);
    if (invoiceFilter === 'no_pagado') return sorted.filter((invoice) => !invoice.paid);
    return sorted;
  }, [invoiceFilter, invoices]);

  function getHouse(houseId: string) {
    return houses.find((house) => house.id === houseId);
  }

  async function loadSupabaseData() {
    if (!supabase) return;
    try {
      const [leadRows, pricingRows, galleryRows, reviewRows, workerRows, orderRows, invoiceRows] = await Promise.all([
        supabase.from('leads').select('*').limit(50),
        supabase.from('pricing_rules').select('*').limit(50),
        supabase.from('gallery_items').select('*').limit(50),
        supabase.from('customer_reviews').select('*').limit(50),
        supabase.from('crew_members').select('*').limit(50),
        supabase.from('work_orders').select('*').limit(100),
        supabase.from('work_invoices').select('*').limit(50),
      ]);

      if (leadRows.data?.length) setLeads(leadRows.data.map((row: any) => ({
        id: String(row.id),
        customer: row.customer_name ?? row.name ?? 'Cliente',
        phone: row.phone ?? '',
        email: row.email ?? '',
        address: row.address ?? '',
        reference: row.reference_code ?? row.folio ?? String(row.id).slice(0, 8),
        services: Array.isArray(row.services) ? row.services.join(', ') : row.services ?? 'Corte de cesped',
        areaSqFt: Number(row.area_sq_ft ?? row.areaSqFt ?? 0),
        details: row.details ?? row.notes ?? '',
        gateCode: row.gate_code ?? row.gateCode,
        status: (row.status ?? 'pendiente') as LeadStatus,
        finalPrice: Number(row.final_price ?? row.finalPrice ?? row.price ?? 0),
        scheduledAt: String(row.scheduled_at ?? row.scheduledAt ?? today).slice(0, 10),
      })));
      if (pricingRows.data?.length) setPricing(pricingRows.data.map((row: any) => ({ id: String(row.id), frequency: row.frequency ?? 'Quincenal', minArea: Number(row.min_area ?? row.minArea ?? 0), maxArea: Number(row.max_area ?? row.maxArea ?? 0), price: Number(row.price ?? 0) })));
      if (galleryRows.data?.length) setGallery(galleryRows.data.map((row: any) => ({ id: String(row.id), title: row.title ?? row.caption ?? 'Galeria', type: row.type === 'video' ? 'video' : 'foto', visible: row.visible ?? row.is_public ?? true })));
      if (reviewRows.data?.length) setReviews(reviewRows.data.map((row: any) => ({ id: String(row.id), customer: row.customer_name ?? row.name ?? 'Cliente', rating: Number(row.rating ?? 5), text: row.text ?? row.comment ?? '', visible: row.visible ?? row.approved ?? true })));
      if (workerRows.data?.length) setWorkers(workerRows.data.map((row: any) => ({ id: String(row.id), name: row.name ?? 'Trabajador', email: row.email ?? '', active: row.active ?? true, passwordStatus: row.password_hash || row.has_password ? 'Activa' : 'Pendiente de crear' })));
      if (orderRows.data?.length) setOrders(orderRows.data.map((row: any) => ({ id: String(row.id), houseId: String(row.house_id ?? row.houseId ?? row.service_plan_id ?? ''), date: String(row.scheduled_date ?? row.date ?? today).slice(0, 10), service: row.service ?? 'Corte de yarda', price: Number(row.invoice_price ?? row.price ?? 0), status: mapOrderStatus(row.status), paid: Boolean(row.paid ?? row.is_paid), workerId: row.worker_id ? String(row.worker_id) : undefined, notes: row.notes ?? undefined, invoiceId: row.invoice_id ? String(row.invoice_id) : undefined })));
      if (invoiceRows.data?.length) setInvoices(invoiceRows.data.map((row: any) => ({ id: String(row.id), houseId: String(row.house_id ?? row.houseId ?? ''), createdAt: String(row.created_at ?? today).slice(0, 10), orderIds: Array.isArray(row.order_ids) ? row.order_ids.map(String) : [], total: Number(row.total ?? 0), paid: Boolean(row.paid ?? row.is_paid) })));
      setSyncMessage('Datos sincronizados con Supabase');
    } catch {
      setSyncMessage('No se pudieron leer algunas tablas; usando modo demo');
    }
  }

  function updateStatus(orderId: string, status: Status) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
  }

  function updateLeadStatus(leadId: string, status: LeadStatus) {
    setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, status } : lead));
    void saveRow('leads', leadId, { status });
  }

  function deleteOrder(orderId: string) {
    setOrders((current) => current.filter((order) => order.id !== orderId));
  }

  function deleteHouse(houseId: string) {
    setHouses((current) => current.filter((house) => house.id !== houseId));
    setOrders((current) => current.filter((order) => order.houseId !== houseId));
  }

  function saveHouse(nextHouse: House) {
    setHouses((current) => {
      const exists = current.some((house) => house.id === nextHouse.id);
      return exists ? current.map((house) => house.id === nextHouse.id ? nextHouse : house) : [nextHouse, ...current];
    });
    if (!orders.some((order) => order.houseId === nextHouse.id)) {
      setOrders((current) => [{
        id: `o${Date.now()}`,
        houseId: nextHouse.id,
        date: selectedDate,
        service: nextHouse.service,
        price: nextHouse.price,
        status: 'SOLICITADO',
        paid: false,
      }, ...current]);
    }
    setEditingHouse(null);
  }

  function createInvoice(houseId: string) {
    const pending = orders.filter((order) => order.houseId === houseId && !order.paid && !order.invoiceId);
    if (!pending.length) {
      Alert.alert('Sin ordenes pendientes', 'Esta casa no tiene trabajos disponibles para invoice.');
      return;
    }
    const invoiceId = `i${Date.now()}`;
    const total = pending.reduce((sum, order) => sum + order.price, 0);
    setInvoices((current) => [{ id: invoiceId, houseId, createdAt: today, orderIds: pending.map((order) => order.id), total, paid: false }, ...current]);
    setOrders((current) => current.map((order) => pending.some((item) => item.id === order.id) ? { ...order, invoiceId } : order));
  }

  function deleteInvoice(invoiceId: string) {
    setInvoices((current) => current.filter((invoice) => invoice.id !== invoiceId));
    setOrders((current) => current.map((order) => order.invoiceId === invoiceId ? { ...order, invoiceId: undefined } : order));
  }

  function registerPayment() {
    if (!paymentTarget) return;
    const payment = { date: today, method: paymentMethod, note: paymentNote };
    if (paymentTarget.type === 'order') {
      setOrders((current) => current.map((order) => order.id === paymentTarget.id ? { ...order, paid: true, payment } : order));
    } else {
      const invoice = invoices.find((item) => item.id === paymentTarget.id);
      setInvoices((current) => current.map((item) => item.id === paymentTarget.id ? { ...item, paid: true, payment } : item));
      if (invoice) setOrders((current) => current.map((order) => invoice.orderIds.includes(order.id) ? { ...order, paid: true, payment } : order));
    }
    setPaymentTarget(null);
    setPaymentNote('');
  }

  function openInvoicePdf(invoice: Invoice) {
    const house = getHouse(invoice.houseId);
    const subject = encodeURIComponent(`Invoice Nieto Green Care ${invoice.id}`);
    const body = encodeURIComponent(`Cliente: ${house?.client}\nDireccion: ${house?.address}\nTotal: $${invoice.total}\n\nPDF listo para enviar desde el sitio/panel.`);
    void Linking.openURL(`mailto:${house?.email ?? ''}?subject=${subject}&body=${body}`);
  }

  function addWorker() {
    const id = `w${Date.now()}`;
    const worker = { id, name: 'Nuevo trabajador', email: 'nuevo@nietogreencare.com', passwordStatus: 'Pendiente de crear' as const, active: true };
    setWorkers((current) => [worker, ...current]);
    void saveRow('crew_members', id, { id, name: worker.name, email: worker.email, active: true });
  }

  function toggleWorker(workerId: string) {
    setWorkers((current) => current.map((worker) => worker.id === workerId ? { ...worker, active: !worker.active } : worker));
    const worker = workers.find((item) => item.id === workerId);
    void saveRow('crew_members', workerId, { active: !worker?.active });
  }

  function updatePricing(ruleId: string, price: number) {
    setPricing((current) => current.map((rule) => rule.id === ruleId ? { ...rule, price } : rule));
    void saveRow('pricing_rules', ruleId, { price });
  }

  function toggleGallery(itemId: string) {
    const item = gallery.find((entry) => entry.id === itemId);
    setGallery((current) => current.map((entry) => entry.id === itemId ? { ...entry, visible: !entry.visible } : entry));
    void saveRow('gallery_items', itemId, { visible: !item?.visible });
  }

  function toggleReview(reviewId: string) {
    const review = reviews.find((entry) => entry.id === reviewId);
    setReviews((current) => current.map((entry) => entry.id === reviewId ? { ...entry, visible: !entry.visible } : entry));
    void saveRow('customer_reviews', reviewId, { visible: !review?.visible, approved: !review?.visible });
  }

  function updateSection(sectionId: string, body: string) {
    setSections((current) => current.map((section) => section.id === sectionId ? { ...section, body } : section));
    void saveRow('site_sections', sectionId, { body });
  }

  async function saveRow(table: string, id: string, values: Record<string, unknown>) {
    if (!supabase) return;
    const { error } = await supabase.from(table).update(values).eq('id', id);
    if (error) setSyncMessage(`Pendiente de guardar en ${table}: ${error.message}`);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>NIETO GREEN CARE</Text>
          <Text style={styles.subtitle}>{syncMessage}</Text>
        </View>
        <Pressable style={styles.siteButton} onPress={() => void Linking.openURL(SITE_URL)}>
          <Ionicons name="globe-outline" size={18} color="#052e16" />
          <Text style={styles.siteText}>Sitio</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        <TabButton active={tab === 'dashboard'} icon="stats-chart-outline" label="Dashboard" onPress={() => setTab('dashboard')} />
        <TabButton active={tab === 'solicitudes'} icon="mail-unread-outline" label="Solicitudes" onPress={() => setTab('solicitudes')} />
        <TabButton active={tab === 'clientes'} icon="people-circle-outline" label="Clientes" onPress={() => setTab('clientes')} />
        <TabButton active={tab === 'agenda'} icon="calendar-outline" label="Agenda" onPress={() => setTab('agenda')} />
        <TabButton active={tab === 'casas'} icon="home-outline" label="Casas" onPress={() => setTab('casas')} />
        <TabButton active={tab === 'invoices'} icon="document-text-outline" label="Facturas" onPress={() => setTab('invoices')} />
        <TabButton active={tab === 'trabajadores'} icon="construct-outline" label="Trabajadores" onPress={() => setTab('trabajadores')} />
        <TabButton active={tab === 'precios'} icon="pricetags-outline" label="Precios" onPress={() => setTab('precios')} />
        <TabButton active={tab === 'galeria'} icon="images-outline" label="Galeria" onPress={() => setTab('galeria')} />
        <TabButton active={tab === 'opiniones'} icon="star-outline" label="Opiniones" onPress={() => setTab('opiniones')} />
        <TabButton active={tab === 'qr'} icon="qr-code-outline" label="QR" onPress={() => setTab('qr')} />
        <TabButton active={tab === 'editor'} icon="color-palette-outline" label="Editor" onPress={() => setTab('editor')} />
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'dashboard' && (
          <>
            <SectionTitle title="Dashboard" action="Sincronizar" onPress={() => void loadSupabaseData()} />
            <View style={styles.metricsGrid}>
              <MetricCard label="Ingresos" value={`$${metrics.income.toFixed(2)}`} />
              <MetricCard label="Trabajos hechos" value={String(metrics.completed)} />
              <MetricCard label="Solicitudes pendientes" value={String(metrics.pending)} />
              <MetricCard label="Area medida" value={`${metrics.measuredArea.toLocaleString()} ft²`} />
            </View>
            <Text style={styles.notes}>No borres el panel web hasta que estos modulos esten probados con datos reales: solicitudes, clientes, agenda, facturas, galeria, opiniones, QR y editor del sitio.</Text>
          </>
        )}

        {tab === 'solicitudes' && (
          <>
            <SectionTitle title="Solicitudes del cotizador" />
            {leads.map((lead) => (
              <View key={lead.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.grow}>
                    <Text style={styles.cardTitle}>{lead.customer}</Text>
                    <Text style={styles.cardMeta}>{lead.address}</Text>
                    <Text style={styles.cardMeta}>{lead.reference} - {lead.areaSqFt.toLocaleString()} ft²</Text>
                    <Text style={styles.total}>${lead.finalPrice.toFixed(2)}</Text>
                  </View>
                  <StatusPill label={lead.status.toUpperCase()} tone={lead.status === 'cancelado' ? 'gray' : lead.status === 'completado' ? 'green' : 'white'} />
                </View>
                <Text style={styles.notes}>{lead.services}. {lead.details}{lead.gateCode ? ` Codigo de porton: ${lead.gateCode}` : ''}</Text>
                <View style={styles.actions}>
                  <IconButton color="#2563eb" icon="calendar-outline" onPress={() => updateLeadStatus(lead.id, 'programado')} label="Programar" />
                  <IconButton color="#0f766e" icon="checkmark-done-outline" onPress={() => updateLeadStatus(lead.id, 'completado')} label="Completar" />
                  <IconButton color="#6b7280" icon="ban-outline" onPress={() => updateLeadStatus(lead.id, 'cancelado')} label="Cancelar" />
                  <IconButton color="#16a34a" icon="logo-google" onPress={() => void Linking.openURL(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Nieto Green Care - ${lead.customer}`)}&details=${encodeURIComponent(lead.address)}`)} label="Google Calendar" />
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'clientes' && (
          <>
            <SectionTitle title="Clientes" />
            {customers.map((customer) => (
              <View key={customer.id} style={styles.card}>
                <Text style={styles.cardTitle}>{customer.name}</Text>
                <Text style={styles.cardMeta}>{customer.phone}</Text>
                <Text style={styles.cardMeta}>Solicitudes: {customer.requests} - Trabajos realizados: {customer.completed}</Text>
                <Text style={styles.total}>Total pagado: ${customer.paidTotal.toFixed(2)}</Text>
              </View>
            ))}
          </>
        )}

        {tab === 'agenda' && (
          <>
            <SectionTitle title="Trabajos del dia" action="Hoy" onPress={() => setSelectedDate(today)} />
            <TextInput style={styles.input} value={selectedDate} onChangeText={setSelectedDate} placeholder="YYYY-MM-DD" />
            {visibleOrders.map((order) => <OrderCard key={order.id} order={order} house={getHouse(order.houseId)} worker={workers.find((worker) => worker.id === order.workerId)} onStatus={updateStatus} onPay={(id) => setPaymentTarget({ type: 'order', id })} onDelete={deleteOrder} onHistory={() => { setTab('casas'); setEditingHouse(getHouse(order.houseId) ?? null); }} />)}
            {!visibleOrders.length && <EmptyState text="No hay casas agendadas para este dia." />}
          </>
        )}

        {tab === 'casas' && (
          <>
            <SectionTitle title="Casas y clientes" action="Agregar nueva" onPress={() => setEditingHouse(emptyHouse())} />
            {houses.map((house) => (
              <View key={house.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.grow}>
                    <Text style={styles.cardTitle}>{house.client}</Text>
                    <Text style={styles.cardMeta}>{house.address}</Text>
                    <Text style={styles.cardMeta}>{house.frequency} - ${house.price}</Text>
                  </View>
                  <StatusPill label={house.active ? 'ACTIVA' : 'INACTIVA'} tone={house.active ? 'green' : 'gray'} />
                </View>
                <Text style={styles.notes}>{house.notes}</Text>
                <View style={styles.actions}>
                  <IconButton color="#2563eb" icon="list-outline" onPress={() => createInvoice(house.id)} label="Generar invoice" />
                  <IconButton color="#eab308" icon="create-outline" onPress={() => setEditingHouse(house)} label="Editar" />
                  <IconButton color="#dc2626" icon="trash-outline" onPress={() => deleteHouse(house.id)} label="Eliminar" />
                </View>
                <Text style={styles.cardMeta}>Ordenes recientes: {orders.filter((order) => order.houseId === house.id).slice(-50).length}</Text>
              </View>
            ))}
          </>
        )}

        {tab === 'invoices' && (
          <>
            <SectionTitle title="Invoices" />
            <View style={styles.segment}>
              {(['todos', 'pagado', 'no_pagado'] as const).map((item) => <Pressable key={item} style={[styles.segmentButton, invoiceFilter === item && styles.segmentActive]} onPress={() => setInvoiceFilter(item)}><Text style={styles.segmentText}>{item.replace('_', ' ')}</Text></Pressable>)}
            </View>
            {filteredInvoices.slice(0, 50).map((invoice) => {
              const house = getHouse(invoice.houseId);
              return (
                <View key={invoice.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.grow}>
                      <Text style={styles.cardTitle}>{house?.client ?? 'Cliente'}</Text>
                      <Text style={styles.cardMeta}>{invoice.createdAt} - {house?.address}</Text>
                      <Text style={styles.total}>${invoice.total.toFixed(2)}</Text>
                    </View>
                    <StatusPill label={invoice.paid ? 'PAGADO' : 'NO PAGADO'} tone={invoice.paid ? 'green' : 'red'} />
                  </View>
                  <View style={styles.actions}>
                    <IconButton color="#2563eb" icon="eye-outline" onPress={() => setPaymentTarget({ type: 'invoice', id: invoice.id })} label="Info/pago" />
                    <IconButton color="#eab308" icon="document-attach-outline" onPress={() => openInvoicePdf(invoice)} label="PDF" />
                    <IconButton color="#dc2626" icon="trash-outline" onPress={() => deleteInvoice(invoice.id)} label="Eliminar" />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === 'trabajadores' && (
          <>
            <SectionTitle title="Trabajadores" action="Agregar" onPress={addWorker} />
            {workers.map((worker) => (
              <View key={worker.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.grow}>
                    <Text style={styles.cardTitle}>{worker.name}</Text>
                    <Text style={styles.cardMeta}>{worker.email}</Text>
                    <Text style={styles.cardMeta}>Contrasena: {worker.passwordStatus}</Text>
                    <Text style={styles.cardMeta}>Acceso: {worker.active ? 'Activo' : 'Desactivado'}</Text>
                  </View>
                  <Ionicons name="person-circle-outline" size={36} color="#16a34a" />
                </View>
                <Text style={styles.notes}>Lista del dia: {orders.filter((order) => order.workerId === worker.id && order.date === selectedDate).length} trabajos asignados.</Text>
                <View style={styles.actions}>
                  <IconButton color={worker.active ? '#6b7280' : '#16a34a'} icon={worker.active ? 'lock-closed-outline' : 'lock-open-outline'} onPress={() => toggleWorker(worker.id)} label="Cambiar acceso" />
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'precios' && (
          <>
            <SectionTitle title="Precios de cesped" />
            {pricing.map((rule) => (
              <View key={rule.id} style={styles.card}>
                <Text style={styles.cardTitle}>{rule.frequency}</Text>
                <Text style={styles.cardMeta}>{rule.minArea.toLocaleString()} - {rule.maxArea.toLocaleString()} ft²</Text>
                <Field label="Precio" value={String(rule.price)} keyboardType="numeric" onChangeText={(value) => updatePricing(rule.id, Number(value) || 0)} />
              </View>
            ))}
          </>
        )}

        {tab === 'galeria' && (
          <>
            <SectionTitle title="Galeria" />
            <Text style={styles.notes}>Formatos aceptados por el panel: JPG, PNG, WEBP, AVIF, MP4, MOV y WEBM. Limite recomendado: 50 MB.</Text>
            {gallery.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.grow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMeta}>{item.type.toUpperCase()}</Text>
                  </View>
                  <StatusPill label={item.visible ? 'PUBLICO' : 'OCULTO'} tone={item.visible ? 'green' : 'gray'} />
                </View>
                <View style={styles.actions}>
                  <IconButton color="#2563eb" icon={item.visible ? 'eye-off-outline' : 'eye-outline'} onPress={() => toggleGallery(item.id)} label="Publicar u ocultar" />
                  <IconButton color="#dc2626" icon="trash-outline" onPress={() => setGallery((current) => current.filter((entry) => entry.id !== item.id))} label="Eliminar" />
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'opiniones' && (
          <>
            <SectionTitle title="Opiniones" />
            {reviews.map((review) => (
              <View key={review.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.grow}>
                    <Text style={styles.cardTitle}>{review.customer}</Text>
                    <Text style={styles.cardMeta}>{'★'.repeat(review.rating)}</Text>
                  </View>
                  <StatusPill label={review.visible ? 'PUBLICA' : 'OCULTA'} tone={review.visible ? 'green' : 'gray'} />
                </View>
                <Text style={styles.notes}>{review.text}</Text>
                <View style={styles.actions}>
                  <IconButton color="#2563eb" icon={review.visible ? 'eye-off-outline' : 'eye-outline'} onPress={() => toggleReview(review.id)} label="Aprobar u ocultar" />
                  <IconButton color="#dc2626" icon="trash-outline" onPress={() => setReviews((current) => current.filter((entry) => entry.id !== review.id))} label="Eliminar" />
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'qr' && (
          <>
            <SectionTitle title="Codigo QR del cotizador" />
            <View style={styles.qrBox}>
              <Ionicons name="qr-code-outline" size={132} color="#052e16" />
              <Text style={styles.cardTitle}>Cotizador publico</Text>
              <Text style={styles.cardMeta}>{SITE_URL}/quote</Text>
              <Pressable style={styles.primaryButton} onPress={() => void Linking.openURL(`${SITE_URL}/quote`)}><Text style={styles.primaryText}>Abrir cotizador</Text></Pressable>
            </View>
          </>
        )}

        {tab === 'editor' && (
          <>
            <SectionTitle title="Editor del sitio" />
            <Text style={styles.notes}>Este modulo guarda textos, servicios, cobertura, colores y notas en Supabase para que el sitio publico deje de depender de cambios en codigo.</Text>
            {sections.map((section) => (
              <View key={section.id} style={styles.card}>
                <Text style={styles.cardTitle}>{section.section}</Text>
                <Text style={styles.cardMeta}>{section.title}</Text>
                <Field label="Contenido" value={section.body} onChangeText={(value) => updateSection(section.id, value)} multiline />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <HouseModal house={editingHouse} onClose={() => setEditingHouse(null)} onSave={saveHouse} />
      <PaymentModal visible={!!paymentTarget} method={paymentMethod} note={paymentNote} onMethod={setPaymentMethod} onNote={setPaymentNote} onClose={() => setPaymentTarget(null)} onSave={registerPayment} />
    </SafeAreaView>
  );
}

function emptyHouse(): House {
  return { id: `h${Date.now()}`, client: '', address: '', phone: '', email: '', frequency: 'Cada 15 dias', service: 'Corte de yarda', price: 0, active: true, notes: '' };
}

function mapOrderStatus(status: string | undefined): Status {
  if (status === 'completed' || status === 'completado' || status === 'FINALIZADA') return 'FINALIZADA';
  if (status === 'cancelled' || status === 'cancelado' || status === 'CANCELADA') return 'CANCELADA';
  return 'SOLICITADO';
}

function TabButton({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}><Ionicons name={icon} size={18} color={active ? '#052e16' : '#475569'} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Pressable style={styles.smallButton} onPress={onPress}><Text style={styles.smallButtonText}>{action}</Text></Pressable>}</View>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <View style={styles.metricCard}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function OrderCard({ order, house, worker, onStatus, onPay, onDelete, onHistory }: { order: WorkOrder; house?: House; worker?: Worker; onStatus: (id: string, status: Status) => void; onPay: (id: string) => void; onDelete: (id: string) => void; onHistory: () => void }) {
  const rowStyle = order.status === 'FINALIZADA' ? styles.doneCard : order.status === 'CANCELADA' ? styles.canceledCard : undefined;
  return (
    <View style={[styles.card, rowStyle]}>
      <View style={styles.cardHeader}>
        <View style={styles.grow}>
          <Text style={styles.cardTitle}>{house?.address ?? 'Direccion pendiente'}</Text>
          <Text style={styles.cardMeta}>{order.service} - {worker?.name ?? 'Sin asignar'}</Text>
          <Text style={styles.total}>${order.price.toFixed(2)}</Text>
        </View>
        <StatusPill label={order.paid ? 'PAGADO' : order.status} tone={order.paid ? 'green' : order.status === 'CANCELADA' ? 'gray' : 'white'} />
      </View>
      {!!order.notes && <Text style={styles.notes}>{order.notes}</Text>}
      <View style={styles.actions}>
        <IconButton color="#0f766e" icon="checkmark-done-outline" onPress={() => onStatus(order.id, 'FINALIZADA')} label="Finalizada" />
        <IconButton color="#6b7280" icon="ban-outline" onPress={() => onStatus(order.id, 'CANCELADA')} label="Cancelada" />
        <IconButton color="#2563eb" icon="albums-outline" disabled={order.paid} onPress={onHistory} label="Historial" />
        <IconButton color="#16a34a" icon="cash-outline" disabled={order.paid} onPress={() => onPay(order.id)} label="Pago" />
        <IconButton color="#dc2626" icon="trash-outline" onPress={() => onDelete(order.id)} label="Eliminar" />
      </View>
    </View>
  );
}

function IconButton({ color, icon, label, disabled, onPress }: { color: string; icon: keyof typeof Ionicons.glyphMap; label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} disabled={disabled} style={[styles.iconButton, { backgroundColor: disabled ? '#cbd5e1' : color }]} onPress={onPress}><Ionicons name={icon} size={18} color="white" /></Pressable>;
}

function StatusPill({ label, tone }: { label: string; tone: 'green' | 'gray' | 'red' | 'white' }) {
  return <Text style={[styles.pill, styles[`${tone}Pill`]]}>{label}</Text>;
}

function HouseModal({ house, onClose, onSave }: { house: House | null; onClose: () => void; onSave: (house: House) => void }) {
  const [draft, setDraft] = useState<House | null>(house);
  useEffect(() => setDraft(house), [house]);
  if (!draft) return null;
  return (
    <Modal visible={!!house} animationType="slide">
      <SafeAreaView style={styles.modal}>
        <SectionTitle title="Casa / cliente" action="Cerrar" onPress={onClose} />
        <ScrollView contentContainerStyle={styles.content}>
          <Field label="Cliente" value={draft.client} onChangeText={(client) => setDraft({ ...draft, client })} />
          <Field label="Direccion" value={draft.address} onChangeText={(address) => setDraft({ ...draft, address })} />
          <Field label="Telefono" value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} />
          <Field label="Correo" value={draft.email} onChangeText={(email) => setDraft({ ...draft, email })} />
          <Field label="Servicio" value={draft.service} onChangeText={(service) => setDraft({ ...draft, service })} />
          <Field label="Precio" value={String(draft.price)} keyboardType="numeric" onChangeText={(price) => setDraft({ ...draft, price: Number(price) || 0 })} />
          <Field label="Frecuencia" value={draft.frequency} onChangeText={(frequency) => setDraft({ ...draft, frequency: frequency as Frequency })} />
          <Field label="Notas" value={draft.notes} onChangeText={(notes) => setDraft({ ...draft, notes })} multiline />
          <Pressable style={styles.primaryButton} onPress={() => onSave(draft)}><Text style={styles.primaryText}>Guardar casa y generar orden</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PaymentModal({ visible, method, note, onMethod, onNote, onClose, onSave }: { visible: boolean; method: PaymentMethod; note: string; onMethod: (method: PaymentMethod) => void; onNote: (note: string) => void; onClose: () => void; onSave: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.paymentBox}>
          <SectionTitle title="Registrar pago" action="Cerrar" onPress={onClose} />
          <Text style={styles.cardMeta}>Fecha: {today}</Text>
          <View style={styles.segment}>
            {(['Cash', 'CashApp', 'Venmo', 'Zelle'] as PaymentMethod[]).map((item) => <Pressable key={item} style={[styles.segmentButton, method === item && styles.segmentActive]} onPress={() => onMethod(item)}><Text style={styles.segmentText}>{item}</Text></Pressable>)}
          </View>
          <Field label="Nota opcional" value={note} onChangeText={onNote} multiline />
          <Pressable style={styles.primaryButton} onPress={onSave}><Text style={styles.primaryText}>Marcar como pagado</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'numeric'; multiline?: boolean }) {
  return <View><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.textarea]} placeholder={props.label} /></View>;
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.empty}><Ionicons name="calendar-clear-outline" size={38} color="#64748b" /><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#bbf7d0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#052e16', fontWeight: '900', fontSize: 18 },
  subtitle: { color: '#166534', marginTop: 2, fontSize: 12 },
  siteButton: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#86efac', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  siteText: { color: '#052e16', fontWeight: '800' },
  tabs: { maxHeight: 66, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabsContent: { paddingHorizontal: 8 },
  tab: { width: 92, alignItems: 'center', paddingVertical: 10, gap: 3, borderRadius: 8 },
  tabActive: { backgroundColor: '#dcfce7' },
  tabText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#052e16' },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionTitle: { color: '#0f172a', fontWeight: '900', fontSize: 22 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', padding: 12 },
  metricValue: { color: '#052e16', fontWeight: '900', fontSize: 20 },
  metricLabel: { color: '#475569', fontWeight: '800', marginTop: 4 },
  smallButton: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: '#052e16', fontWeight: '900' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a' },
  textarea: { minHeight: 82, textAlignVertical: 'top' },
  label: { color: '#334155', fontWeight: '800', marginBottom: 5, marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 9 },
  doneCard: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  canceledCard: { backgroundColor: '#e5e7eb', borderColor: '#cbd5e1' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  grow: { flex: 1 },
  cardTitle: { color: '#111827', fontWeight: '900', fontSize: 16 },
  cardMeta: { color: '#475569', marginTop: 3 },
  notes: { color: '#334155', backgroundColor: '#f8fafc', padding: 9, borderRadius: 8 },
  total: { color: '#052e16', fontWeight: '900', marginTop: 5, fontSize: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconButton: { width: 38, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontWeight: '900', fontSize: 11 },
  greenPill: { backgroundColor: '#22c55e', color: '#052e16' },
  grayPill: { backgroundColor: '#cbd5e1', color: '#334155' },
  redPill: { backgroundColor: '#fecaca', color: '#991b1b' },
  whitePill: { backgroundColor: '#ffffff', color: '#0f172a', borderWidth: 1, borderColor: '#cbd5e1' },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentButton: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  segmentActive: { backgroundColor: '#86efac' },
  segmentText: { color: '#0f172a', fontWeight: '800', textTransform: 'capitalize' },
  empty: { alignItems: 'center', padding: 30, gap: 10 },
  emptyText: { color: '#64748b', textAlign: 'center', fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#f8fafc' },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  paymentBox: { backgroundColor: '#ffffff', borderRadius: 8, padding: 14, width: '100%', gap: 12 },
  qrBox: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', padding: 22, gap: 10 },
  primaryButton: { backgroundColor: '#16a34a', borderRadius: 8, alignItems: 'center', paddingVertical: 13, marginTop: 8 },
  primaryText: { color: '#ffffff', fontWeight: '900' },
});
