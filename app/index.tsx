import { CustomerHistory } from '../components/CustomerHistory';
import { texasDate, enableDailyReminder, disableDailyReminder, onAgendaNotification } from '../services/daily-agenda';
import { Ionicons } from '@expo/vector-icons';
import { supabase, finishGoogleSignIn, signInWithGoogle } from '../services/auth';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const SITE_URL = 'https://nietogreecare-site.vercel.app';
const APP_LOGO = require('../assets/icon.png');
const today = texasDate();

type Status = 'SOLICITADO' | 'FINALIZADA' | 'CANCELADA';
type LeadStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
type PayMethod = 'Cash' | 'CashApp' | 'Venmo' | 'Zelle';
type Tab = 'dashboard' | 'solicitudes' | 'clientes' | 'agenda' | 'casas' | 'invoices' | 'trabajadores' | 'precios' | 'galeria' | 'opiniones' | 'qr' | 'editor';
type House = { id: string; planId?: string; client: string; address: string; city?: string; zipCode?: string; phone: string; email: string; frequency: string; service: string; price: number; active: boolean; notes: string };
type Order = { id: string; houseId: string; date: string; service: string; price: number; status: Status; paid: boolean; paidAmount: number; paymentMethod?: string; workerId?: string; notes?: string; invoiceId?: string };
type Invoice = { id: string; houseId: string; createdAt: string; orderIds: string[]; number?: string; total: number; paid: boolean; sentAt?: string | null };
type Worker = { id: string; name: string; email: string; active: boolean };
type Lead = { id: string; customer: string; phone: string; email: string; address: string; reference: string; services: string; areaSqFt: number; details: string; gateCode?: string; status: LeadStatus; finalPrice: number };
type Price = { id: string; name: string; minArea: number; maxArea: number; price: number };
type Gallery = { id: string; title: string; type: 'foto' | 'video'; visible: boolean };
type Review = { id: string; customer: string; rating: number; text: string; visible: boolean };
type Section = { id: string; section: string; title: string; body: string; visible: boolean };
type Role = 'admin' | 'worker' | null;
type WeeklySummary = { id?: string; weekStart: string; weekEnd: string; completed: number; cancelled: number; unpaid: number; paid: number; total: number; notes: string };

const demoHouses: House[] = [
  { id: 'h1', client: 'Maria Lopez', address: '1208 Blue Ridge Dr, Georgetown, TX', phone: '512-555-0121', email: 'maria@example.com', frequency: 'Cada 14 dias', service: 'Yarda completa', price: 65, active: true, notes: 'Tiene mascotas. Avisar antes de entrar.' },
  { id: 'h2', client: 'Carlos Rivera', address: '741 Oak Meadow Ln, Leander, TX', phone: '512-555-0178', email: 'carlos@example.com', frequency: 'Cada 7 dias', service: 'Frente y atras', price: 55, active: true, notes: 'Porton con codigo.' },
];
const demoOrders: Order[] = [
  { id: 'o1', houseId: 'h1', date: today, service: 'Corte de yarda', price: 65, status: 'SOLICITADO', paid: false, paidAmount: 0, workerId: 'w1' },
  { id: 'o2', houseId: 'h2', date: today, service: 'Corte semanal', price: 55, status: 'SOLICITADO', paid: false, paidAmount: 0, workerId: 'w2' },
];
const demoWorkers: Worker[] = [{ id: 'w1', name: 'Luis Nieto', email: 'luis@nietogreencare.com', active: true }, { id: 'w2', name: 'Trabajador Demo', email: 'worker@nietogreencare.com', active: true }];
const demoLeads: Lead[] = [
  { id: 'l1', customer: 'Ana Martinez', phone: '512-555-0199', email: 'ana@example.com', address: '212 Cedar Park Dr, Cedar Park, TX', reference: 'NGC-1024', services: 'Corte de cesped', areaSqFt: 4820, details: 'Frente y atras, quincenal', gateCode: '4421', status: 'pending', finalPrice: 65 },
];
const demoPrices: Price[] = [{ id: 'p1', name: 'Semanal chico', minArea: 0, maxArea: 4800, price: 30 }, { id: 'p2', name: 'Quincenal medio', minArea: 3800, maxArea: 4800, price: 40 }];
const demoGallery: Gallery[] = [{ id: 'g1', title: 'Antes y despues - Georgetown', type: 'foto', visible: true }];
const demoReviews: Review[] = [{ id: 'r1', customer: 'Maria Lopez', rating: 5, text: 'Muy buen trabajo y puntualidad.', visible: true }];
const demoSections: Section[] = [{ id: 's1', section: 'Marca', title: 'Nieto Green Care', body: 'Lawn care profesional en Central Texas.', visible: true }];

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedDate, setSelectedDate] = useState(texasDate);
  const dayRef = useRef(texasDate());
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const loadingRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [message, setMessage] = useState(supabase ? 'Inicia sesion para vincular con el panel web' : 'Faltan variables de Supabase');
  const [leads, setLeads] = useState(demoLeads);
  const [houses, setHouses] = useState(demoHouses);
  const [orders, setOrders] = useState(demoOrders);
  const [workers, setWorkers] = useState(demoWorkers);
  const [prices, setPrices] = useState(demoPrices);
  const [gallery, setGallery] = useState(demoGallery);
  const [reviews, setReviews] = useState(demoReviews);
  const [sections, setSections] = useState(demoSections);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<'todos' | 'pagado' | 'no_pagado'>('todos');
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'order' | 'invoice'; id: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('Cash');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthorized(false);
      setSession(nextSession);
    });
    void Linking.getInitialURL().then(async url => { if (url) await finishGoogleSignIn(url); }).catch(() => setMessage('No se pudo completar el acceso. Intenta de nuevo.'));
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') supabase?.auth.startAutoRefresh(); else supabase?.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => { data.subscription.unsubscribe(); listener.remove(); supabase?.auth.stopAutoRefresh(); };
  }, []);
  useEffect(() => {
    let active = true;
    setAuthorized(false);
    if (!session || !role || !supabase) return;
    setMessage('Verificando acceso...');
    void (async () => {
      const result = role === 'admin'
        ? await supabase!.rpc('is_admin')
        : await supabase!.from('crew_members').select('id').eq('active', true).ilike('email', session.user.email ?? '').limit(1);
      if (!active) return;
      const allowed = !result.error && (role === 'admin' ? result.data === true : Array.isArray(result.data) && result.data.length > 0);
      setAuthorized(allowed);
      if (allowed) setTab(role === 'worker' ? 'agenda' : 'dashboard');
      else setMessage(result.error ? 'No se pudo verificar tu acceso. Intenta de nuevo.' : 'Este correo no está autorizado para el panel seleccionado. Cambia de cuenta o solicita acceso al dueño.');
    })().catch(() => active && setMessage('No se pudo verificar tu acceso. Revisa tu conexión.'));
    return () => { active = false; };
  }, [session, role]);
  useEffect(() => { if (session && authorized) void loadData(); }, [session, authorized]);
  useEffect(() => { if (session && authorized && role === 'worker') void loadData(); }, [selectedDate]);
  refreshRef.current = loadData;
  useEffect(() => {
    if (!session || !authorized) return;
    const refresh = () => {
      const day = texasDate();
      if (day !== dayRef.current) { dayRef.current = day; setSelectedDate(day); }
      if (AppState.currentState === 'active') void refreshRef.current();
    };
    const timer = setInterval(refresh, 60000);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const notification = onAgendaNotification(() => { setSelectedDate(texasDate()); setTab('agenda'); refresh(); });
    return () => { clearInterval(timer); foreground.remove(); notification.remove(); };
  }, [session?.user.id, authorized]);

  async function enableNotifications() {
    try { setMessage(await enableDailyReminder() ? 'Recordatorio diario activado a las 6:00 a. m. del teléfono.' : 'Activa las notificaciones en los ajustes del teléfono para recibir el recordatorio.'); }
    catch { setMessage('No se pudo activar el recordatorio. Revisa los permisos del teléfono.'); }
  }

  const visibleOrders = useMemo(() => orders.filter((order) => order.date === selectedDate && (role !== 'worker' || workerMatches(order, session?.user.email))).sort((a, b) => a.id.localeCompare(b.id)), [orders, selectedDate, role, session]);
  const filteredInvoices = useMemo(() => invoices.filter((invoice) => invoiceFilter === 'todos' || (invoiceFilter === 'pagado' ? invoice.paid : !invoice.paid)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50), [invoiceFilter, invoices]);
  const customers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; requests: number; completed: number; paidTotal: number }>();
    leads.forEach((lead) => {
      const item = map.get(lead.phone) ?? { id: lead.phone, name: lead.customer, phone: lead.phone, requests: 0, completed: 0, paidTotal: 0 };
      item.requests += 1;
      if (lead.status === 'completed') item.completed += 1;
      item.paidTotal += invoices.filter((invoice) => getHouse(invoice.houseId)?.phone === lead.phone && invoice.paid).reduce((sum, invoice) => sum + invoice.total, 0);
      map.set(lead.phone, item);
    });
    houses.forEach((house) => map.set(house.phone, map.get(house.phone) ?? { id: house.id, name: house.client, phone: house.phone, requests: 0, completed: orders.filter((order) => order.houseId === house.id && order.status === 'FINALIZADA').length, paidTotal: invoices.filter((invoice) => invoice.houseId === house.id && invoice.paid).reduce((sum, invoice) => sum + invoice.total, 0) }));
    return [...map.values()];
  }, [houses, invoices, leads, orders]);
  const metrics = {
    income: invoices.filter((invoice) => invoice.paid).reduce((sum, invoice) => sum + invoice.total, 0),
    completed: orders.filter((order) => order.status === 'FINALIZADA').length,
    pending: leads.filter((lead) => lead.status === 'pending').length,
    area: leads.reduce((sum, lead) => sum + lead.areaSqFt, 0),
  };

  function getHouse(id: string) { return houses.find((house) => house.id === id); }
  async function signIn() {
    if (!supabase) return setMessage('Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY');
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      setMessage(error ? 'Correo o contraseña incorrectos. Si usas Google en el sitio, pulsa Continuar con Google.' : 'Verificando acceso...');
    } catch { setMessage('No se pudo conectar. Revisa tu conexión e intenta de nuevo.'); }
    finally { setAuthBusy(false); }
  }
  async function googleSignIn() {
    setAuthBusy(true);
    try { if (!(await signInWithGoogle())) setMessage('Inicio con Google cancelado. Puedes intentarlo de nuevo.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.'); }
    finally { setAuthBusy(false); }
  }
  async function signOut() { await disableDailyReminder().catch(() => {}); if (supabase) await supabase.auth.signOut(); setAuthorized(false); setSession(null); setMessage('Sesion cerrada'); }

  async function loadData() {
    if (!supabase || !session || !authorized) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
    if (role === 'worker') {
      const response = await fetch(`${SITE_URL}/api/crew/orders?date=${encodeURIComponent(selectedDate)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo cargar la agenda');
      const member = payload.data.member;
      const rows = payload.data.orders ?? [];
      setWorkers([{ id: member.id, name: member.full_name, email: member.email, active: true }]);
      setHouses(rows.map((row: any) => ({ id: row.lead_id, client: row.leads?.customer_name ?? 'Cliente', address: row.leads?.address ?? '', phone: row.leads?.customer_phone ?? '', email: '', frequency: '', service: 'Corte de césped', price: Number(row.price), active: true, notes: row.leads?.additional_notes ?? '' })));
      setOrders(rows.map((row: any) => ({ id: row.id, houseId: row.lead_id, date: row.service_date, service: 'Corte de césped', price: Number(row.price), paidAmount: Number(row.paid_amount), paid: Number(row.paid_amount) >= Number(row.price), paymentMethod: row.payment_method, status: mapOrderStatus(row.status), workerId: member.id, notes: row.notes ?? '' })));
      setMessage('Agenda sincronizada con el dueño.');
      return;
    }
    const [leadRows, priceRows, galleryRows, reviewRow, workerRows, planRows, orderRows, invoiceRows, sectionRows, weeklyRows] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('pricing_rules').select('*').order('min_sq_ft').limit(100),
      supabase.from('gallery').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('app_settings').select('value').eq('key', 'customer_reviews').maybeSingle(),
      supabase.from('crew_members').select('*').order('full_name').limit(100),
      supabase.from('service_plans').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('work_orders').select('*').order('service_date', { ascending: false }).limit(1000),
      supabase.from('work_invoices').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('site_sections').select('*').order('section').limit(100),
      supabase.from('weekly_summaries').select('*').order('week_start', { ascending: false }).limit(60),
    ]);
    if (leadRows.error) return setMessage(`No se pudieron leer solicitudes: ${leadRows.error.message}`);
    const leadData = leadRows.data ?? [];
    const planByLead = new Map((planRows.data ?? []).map((row: any) => [String(row.lead_id), row]));
    const invoiceByOrder = new Map((invoiceRows.data ?? []).map((row: any) => [String(row.order_id), row]));
    setLeads(leadData.map((row: any) => ({ id: row.id, customer: row.customer_name ?? 'Cliente', phone: row.customer_phone ?? '', email: row.customer_email ?? '', address: row.address ?? '', reference: row.reference_code ?? String(row.id).slice(0, 8), services: Array.isArray(row.selected_services) ? row.selected_services.join(', ') : 'Corte de cesped', areaSqFt: Number(row.area_sq_ft ?? 0), details: row.details ?? row.additional_notes ?? '', gateCode: row.gate_code ?? undefined, status: mapLeadStatus(row.status), finalPrice: Number(row.final_price ?? 0) })));
    setHouses(leadData.map((row: any) => { const plan = planByLead.get(String(row.id)); return { id: row.id, planId: plan?.id, client: row.customer_name ?? 'Cliente', address: row.address ?? '', city: row.city ?? '', zipCode: row.zip_code ?? '', phone: row.customer_phone ?? '', email: row.customer_email ?? '', frequency: mapCadence(plan?.cadence), service: Array.isArray(row.selected_services) ? row.selected_services.join(', ') : 'Corte de yarda', price: Number(plan?.price_per_visit ?? row.final_price ?? 0), active: Boolean(plan?.active ?? row.status !== 'cancelled'), notes: plan?.notes ?? row.additional_notes ?? row.details ?? '' }; }));
    if (priceRows.data) setPrices(priceRows.data.map((row: any) => ({ id: row.id, name: row.name ?? 'Regla de precio', minArea: Number(row.min_sq_ft ?? 0), maxArea: Number(row.max_sq_ft ?? 0), price: Number(row.price ?? 0) })));
    if (galleryRows.data) setGallery(galleryRows.data.map((row: any) => ({ id: row.id, title: row.title ?? row.description ?? 'Galeria', type: String(row.public_url ?? '').match(/\.(mp4|mov|webm)(\?|$)/i) ? 'video' : 'foto', visible: Boolean(row.is_published ?? true) })));
    setReviews(((reviewRow.data?.value as { items?: any[] } | null)?.items ?? []).map((row) => ({ id: row.id, customer: row.customer_name ?? 'Cliente', rating: Number(row.rating ?? 5), text: row.comment ?? '', visible: Boolean(row.approved ?? true) })));
    if (workerRows.data) setWorkers(workerRows.data.map((row: any) => ({ id: row.id, name: row.full_name ?? 'Trabajador', email: row.email ?? '', active: Boolean(row.active ?? true) })));
    if (orderRows.data) setOrders(orderRows.data.map((row: any) => { const price = Number(row.price ?? 0); const paidAmount = Number(row.paid_amount ?? 0); const invoice = invoiceByOrder.get(String(row.id)); return { id: row.id, houseId: row.lead_id ?? '', date: String(row.service_date ?? today).slice(0, 10), service: (leadData.find((lead:any)=>lead.id===row.lead_id)?.selected_services??['Corte de yarda']).join(', '), price, status: mapOrderStatus(row.status), paid: paidAmount >= price && price > 0, paidAmount, paymentMethod: row.payment_method, workerId: row.crew_member_id ?? undefined, notes: row.notes ?? undefined, invoiceId: invoice?.id }; }));
    if (invoiceRows.data) {
      const groups=new Map<string,any[]>();
      for(const row of invoiceRows.data){const key=String(row.invoice_number).startsWith('NGC-G-')?String(row.invoice_number).split('/')[0]:row.invoice_number;groups.set(key,[...(groups.get(key)??[]),row]);}
      setInvoices(Array.from(groups.entries()).map(([key,rows])=>{const row=rows[0];const first=(orderRows.data??[]).find((order:any)=>order.id===row.order_id);return {id:row.id,houseId:first?.lead_id??'',createdAt:String(row.issued_at??today).slice(0,10),orderIds:rows.map(item=>item.order_id),number:key,total:rows.reduce((sum,item)=>sum+Number(item.total),0),paid:rows.every(item=>Number((orderRows.data??[]).find((order:any)=>order.id===item.order_id)?.paid_amount??0)>=Number(item.total)),sentAt:rows.find(item=>item.sent_at)?.sent_at};}));
    }
    if (sectionRows.data) setSections(sectionRows.data.map((row: any) => ({ id: row.id, section: row.section ?? row.key ?? 'Seccion', title: row.title ?? row.section ?? 'Contenido', body: row.body ?? row.content ?? '', visible: Boolean(row.visible ?? true) })));
    if (weeklyRows.data) setWeeklySummaries(weeklyRows.data.map((row: any) => ({ id: row.id, weekStart: row.week_start, weekEnd: row.week_end, completed: Number(row.completed_orders ?? 0), cancelled: Number(row.cancelled_orders ?? 0), unpaid: Number(row.unpaid_orders ?? 0), paid: Number(row.paid_orders ?? 0), total: Number(row.total_collected ?? 0), notes: row.notes ?? '' })));
    await ensureCurrentWeeklySummary(orderRows.data ?? []);
    setMessage('Datos sincronizados con el panel web');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la agenda. Revisa tu conexión.'); }
    finally { loadingRef.current = false; }
  }

  async function saveRow(table: string, id: string, values: Record<string, unknown>) {
    if (!supabase || !session) return;
    const { error } = await supabase.from(table).update(values).eq('id', id);
    if (error) setMessage(`Pendiente de guardar en ${table}: ${error.message}`);
  }
  async function deleteRow(table: string, id: string) {
    if (!supabase || !session) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) setMessage(`No se pudo eliminar en ${table}: ${error.message}`);
  }
  async function updateStatus(id: string, status: Status) {
    if (await updateOrder(id, { status: dbOrderStatus(status) })) await loadData();
  }
  async function updateOrder(id: string, changes: Record<string, unknown>) {
    if (!session) return false;
    try {
      const response = await fetch(`${SITE_URL}/api/${role === 'worker' ? 'crew/orders' : 'admin/operations'}`, { method: role === 'worker' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(role === 'worker' ? { id, ...changes } : { action: 'order', order: { id, ...changes } }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo guardar');
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar el cambio'); return false; }
  }
  function updateLeadStatus(id: string, status: LeadStatus) { setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status } : lead)); void saveRow('leads', id, { status }); }
  function deleteOrder(id: string) { setOrders((current) => current.filter((order) => order.id !== id)); void deleteRow('work_orders', id); }
  function deleteHouse(id: string) { setHouses((current) => current.filter((house) => house.id !== id)); setOrders((current) => current.filter((order) => order.houseId !== id)); void saveRow('leads', id, { status: 'cancelled', cancelled_at: new Date().toISOString() }); }
  async function saveHouse(house: House) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(house.id);
    const payload = { customer_name: house.client || 'Cliente', customer_phone: house.phone || '0000000000', customer_email: house.email || null, address: house.address || 'Direccion pendiente', city: house.city || 'Central Texas', zip_code: house.zipCode || '78626', final_price: house.price, details: house.service, additional_notes: house.notes, status: 'scheduled', requested_date: selectedDate };
    if (supabase && session) {
      const lead = isUuid ? await supabase.from('leads').update(payload).eq('id', house.id).select().single() : await supabase.from('leads').insert({ ...payload, reference_code: `APP-${Date.now()}`, source: 'mobile_app', selected_services: [house.service || 'lawn_service'], service_count: 1, area_sq_ft: 0, area_sq_yd: 0, estimated_cubic_yards: 0 }).select().single();
      const leadId = lead.data?.id ?? house.id;
      if (!house.planId) {
        const cadence = house.frequency === 'Cada 7 dias' ? 'weekly' : house.frequency === 'Una vez' ? 'one_time' : 'bi_weekly';
        const plan = await supabase.from('service_plans').insert({ lead_id: leadId, crew_member_id: null, cadence, first_date: selectedDate, preferred_start: '08:00', duration_minutes: 60, price_per_visit: house.price, notes: house.notes || null }).select().single();
        if (plan.data?.id) await supabase.from('work_orders').insert({ plan_id: plan.data.id, lead_id: leadId, crew_member_id: null, service_date: selectedDate, start_time: '08:00', duration_minutes: 60, status: 'scheduled', price: house.price, notes: house.notes || null });
      }
      void loadData();
    }
    setEditingHouse(null);
  }
  function createInvoice(houseId: string) {
    setTab('clientes');
    setMessage('Busque al cliente y seleccione las fechas para generar una sola factura.');
  }

  async function registerPayment() {
    if (!paymentTarget) return;
    if(paymentTarget.type === 'invoice'){
      if(!session)return;
      try{
        const response=await fetch(`${SITE_URL}/api/admin/operations/invoices`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'pay',invoice_id:paymentTarget.id,payment_method:dbPay(paymentMethod)})});
        const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'No se pudo registrar el pago');
        await loadData();setPaymentTarget(null);setPaymentNote('');setMessage('Pago guardado en el sitio y la app.');
      }catch(error){setMessage(error instanceof Error?error.message:'No se pudo registrar el pago');}
      return;
    }
    const order = orders.find(item => item.id === paymentTarget.id);
    if (!order || !(await updateOrder(order.id, { paid_amount: order.price, payment_method: dbPay(paymentMethod), notes: paymentNote || order.notes || null }))) return;
    await loadData();
    setPaymentTarget(null); setPaymentNote('');
  }
  function addWorker() { if (supabase && session) void supabase.from('crew_members').insert({ full_name: 'Nuevo trabajador', email: 'nuevo@nietogreencare.com', active: true }).then(() => loadData()); }
  function toggleWorker(id: string) { const worker = workers.find((item) => item.id === id); setWorkers((current) => current.map((item) => item.id === id ? { ...item, active: !item.active } : item)); void saveRow('crew_members', id, { active: !worker?.active }); }
  function updatePrice(id: string, price: number) { setPrices((current) => current.map((item) => item.id === id ? { ...item, price } : item)); void saveRow('pricing_rules', id, { price }); }
  function toggleGallery(id: string) { const item = gallery.find((entry) => entry.id === id); setGallery((current) => current.map((entry) => entry.id === id ? { ...entry, visible: !entry.visible } : entry)); void saveRow('gallery', id, { is_published: !item?.visible }); }
  function toggleReview(id: string) {
    const next = reviews.map((entry) => entry.id === id ? { ...entry, visible: !entry.visible } : entry);
    setReviews(next);
    if (supabase && session) void supabase.from('app_settings').upsert({ key: 'customer_reviews', value: { items: next.map((review) => ({ id: review.id, customer_name: review.customer, city: '', rating: review.rating, comment: review.text, approved: review.visible, created_at: new Date().toISOString() })) }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }
  function workerMatches(order: Order, email?: string | null) {
    if (!email) return false;
    const worker = workers.find((item) => item.id === order.workerId);
    return worker?.email.toLowerCase() === email.toLowerCase();
  }
  async function ensureCurrentWeeklySummary(rows: any[]) {
    if (!supabase || !session || role === 'worker') return;
    const { start, end } = weekRange();
    const summary = buildWeeklySummary(rows, start, end);
    const { error } = await supabase.from('weekly_summaries').upsert({
      week_start: start,
      week_end: end,
      completed_orders: summary.completed,
      cancelled_orders: summary.cancelled,
      unpaid_orders: summary.unpaid,
      paid_orders: summary.paid,
      total_collected: summary.total,
      notes: summary.notes,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'week_start' });
    if (!error) setWeeklySummaries((current) => [summary, ...current.filter((item) => item.weekStart !== start)]);
  }

  if (!role) return (
    <SafeAreaView style={styles.screen}><View style={styles.loginBox}>
      <Image source={APP_LOGO} style={styles.logo} resizeMode="contain" />
      <Text style={styles.sectionTitle}>Selecciona tu acceso</Text>
      <Pressable style={styles.primaryButton} onPress={() => setRole('worker')}><Text style={styles.primaryText}>Panel para trabajador</Text></Pressable>
      <Pressable style={styles.primaryButton} onPress={() => setRole('admin')}><Text style={styles.primaryText}>Panel administrador</Text></Pressable>
      <Text style={styles.notes}>Ambos accesos usan la misma base de datos del sitio.</Text>
    </View></SafeAreaView>
  );

  if (!session || !authorized) return (
    <SafeAreaView style={styles.screen}><View style={styles.loginBox}>
      <Image source={APP_LOGO} style={styles.logo} resizeMode="contain" /><Text style={styles.sectionTitle}>{role === 'worker' ? 'Acceso trabajador' : 'Acceso administrador'}</Text>
      <Text style={styles.notes}>Usa la misma cuenta de Google del sitio o tu correo y contraseña. El correo debe estar autorizado para este panel.</Text>
      <Pressable style={styles.primaryButton} disabled={authBusy} onPress={() => void googleSignIn()}><Text style={styles.primaryText}>{authBusy ? 'Conectando...' : 'Continuar con Google'}</Text></Pressable>
      <Field label="Correo" value={authEmail} onChangeText={setAuthEmail} />
      <Field label="Contraseña" value={authPassword} onChangeText={setAuthPassword} secureTextEntry />
      <Pressable style={styles.primaryButton} disabled={authBusy} onPress={() => void signIn()}><Text style={styles.primaryText}>Entrar y sincronizar</Text></Pressable>
      <Pressable style={styles.smallButton} onPress={() => setRole(null)}><Text style={styles.smallButtonText}>Cambiar acceso</Text></Pressable>
      <Text style={styles.cardMeta}>{message}</Text>
    </View></SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><Image source={APP_LOGO} style={styles.headerLogo} resizeMode="contain" /><View style={styles.grow}><Text style={styles.brand}>NIETO GREEN CARE</Text><Text style={styles.subtitle}>{role === 'worker' ? 'Panel trabajador' : message}</Text></View><MiniButton icon="globe-outline" label="Sitio" onPress={() => void Linking.openURL(SITE_URL)} /><MiniButton icon="log-out-outline" label="Salir" onPress={() => void signOut()} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>{((role === 'worker' ? ['agenda'] : ['dashboard', 'solicitudes', 'clientes', 'agenda', 'casas', 'invoices', 'trabajadores', 'precios', 'galeria', 'opiniones', 'qr', 'editor']) as Tab[]).map((item) => <TabButton key={item} active={tab === item} label={item} onPress={() => setTab(item)} />)}</ScrollView>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.smallButton} onPress={() => void enableNotifications()}><Text style={styles.smallButtonText}>Activar recordatorio diario</Text></Pressable>
        {role === 'worker' && <Text style={styles.notes}>{message}</Text>}
        {tab === 'dashboard' && <><SectionTitle title="Dashboard" action="Sincronizar" onPress={() => void loadData()} /><View style={styles.metricsGrid}><Metric label="Ingresos" value={`$${metrics.income.toFixed(2)}`} /><Metric label="Trabajos hechos" value={String(metrics.completed)} /><Metric label="Solicitudes" value={String(metrics.pending)} /><Metric label="Area medida" value={`${metrics.area.toLocaleString()} ft²`} /></View><Text style={styles.notes}>Cada semana se guarda automaticamente un resumen para revisarlo despues.</Text>{weeklySummaries.slice(0, 6).map((summary) => <Card key={summary.weekStart} title={`Semana ${summary.weekStart} a ${summary.weekEnd}`} meta={`${summary.completed} finalizadas - ${summary.cancelled} canceladas`} status={`$${summary.total.toFixed(2)}`} tone="green"><Text style={styles.notes}>{summary.notes}</Text></Card>)}</>}
        {tab === 'solicitudes' && <><SectionTitle title="Solicitudes del cotizador" />{leads.map((lead) => <Card key={lead.id} title={lead.customer} meta={`${lead.reference} - ${lead.areaSqFt.toLocaleString()} ft²`} status={leadLabel(lead.status)} tone={lead.status === 'completed' ? 'green' : lead.status === 'cancelled' ? 'gray' : 'white'}><Text style={styles.cardMeta}>{lead.address}</Text><Text style={styles.total}>${lead.finalPrice.toFixed(2)}</Text><Text style={styles.notes}>{lead.services}. {lead.details}{lead.gateCode ? ` Codigo: ${lead.gateCode}` : ''}</Text><Actions items={[['calendar-outline', '#2563eb', () => updateLeadStatus(lead.id, 'scheduled')], ['checkmark-done-outline', '#0f766e', () => updateLeadStatus(lead.id, 'completed')], ['ban-outline', '#6b7280', () => updateLeadStatus(lead.id, 'cancelled')], ['logo-google', '#16a34a', () => void Linking.openURL(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Nieto Green Care - ${lead.customer}`)}&details=${encodeURIComponent(lead.address)}`)]]} /></Card>)}</>}
        {tab === 'clientes' && <CustomerHistory houses={houses} orders={orders} invoices={invoices} session={session} reload={loadData} />}
        {tab === 'agenda' && <><SectionTitle title="Trabajos del dia" action="Hoy" onPress={() => setSelectedDate(texasDate())} /><TextInput style={styles.input} value={selectedDate} onChangeText={setSelectedDate} placeholder="YYYY-MM-DD" />{visibleOrders.map((order) => <OrderCard key={order.id} workerOnly={role === 'worker'} order={order} house={getHouse(order.houseId)} worker={workers.find((w) => w.id === order.workerId)} onStatus={updateStatus} onPay={(id) => setPaymentTarget({ type: 'order', id })} onDelete={deleteOrder} onHistory={() => { setTab('casas'); setEditingHouse(getHouse(order.houseId) ?? null); }} />)}{!visibleOrders.length && <EmptyState text="No hay casas agendadas para este dia." />}</>}
        {tab === 'casas' && <><SectionTitle title="Casas y clientes" action="Agregar nueva" onPress={() => setEditingHouse(emptyHouse())} />{houses.map((house) => <Card key={house.id} title={house.client} meta={`${house.address} - ${house.frequency} - $${house.price}`} status={house.active ? 'ACTIVA' : 'INACTIVA'} tone={house.active ? 'green' : 'gray'}><Text style={styles.notes}>{house.notes || 'Sin notas'}</Text><Actions items={[['list-outline', '#2563eb', () => createInvoice(house.id)], ['create-outline', '#eab308', () => setEditingHouse(house)], ['trash-outline', '#dc2626', () => deleteHouse(house.id)]]} /><Text style={styles.cardMeta}>Ordenes recientes: {orders.filter((order) => order.houseId === house.id).slice(-50).length}</Text></Card>)}</>}
        {tab === 'invoices' && <><SectionTitle title="Invoices" /><View style={styles.segment}>{(['todos', 'pagado', 'no_pagado'] as const).map((item) => <Pressable key={item} style={[styles.segmentButton, invoiceFilter === item && styles.segmentActive]} onPress={() => setInvoiceFilter(item)}><Text style={styles.segmentText}>{item.replace('_', ' ')}</Text></Pressable>)}</View>{filteredInvoices.map((invoice) => <Card key={invoice.id} title={getHouse(invoice.houseId)?.client ?? 'Cliente'} meta={`${invoice.number ?? invoice.id} - ${invoice.createdAt}`} status={invoice.paid ? 'PAGADO' : 'NO PAGADO'} tone={invoice.paid ? 'green' : 'red'}><Text style={styles.total}>${invoice.total.toFixed(2)}</Text><Actions items={[['eye-outline', '#2563eb', () => setPaymentTarget({ type: 'invoice', id: invoice.id })], ['document-attach-outline', '#eab308', () => void Linking.openURL(`${SITE_URL}/api/admin/operations/invoice-file?id=${encodeURIComponent(invoice.id)}`)], ['trash-outline', '#dc2626', () => { setInvoices((current) => current.filter((item) => item.id !== invoice.id)); void deleteRow('work_invoices', invoice.id); }]]} /></Card>)}</>}
        {tab === 'trabajadores' && <><SectionTitle title="Trabajadores" action="Agregar" onPress={addWorker} />{workers.map((worker) => <Card key={worker.id} title={worker.name} meta={`${worker.email} - ${worker.active ? 'Activo' : 'Desactivado'}`}><Text style={styles.notes}>Lista del dia: {orders.filter((order) => order.workerId === worker.id && order.date === selectedDate).length} trabajos asignados.</Text><Actions items={[[worker.active ? 'lock-closed-outline' : 'lock-open-outline', worker.active ? '#6b7280' : '#16a34a', () => toggleWorker(worker.id)]]} /></Card>)}</>}
        {tab === 'precios' && <><SectionTitle title="Precios de cesped" />{prices.map((price) => <Card key={price.id} title={price.name} meta={`${price.minArea.toLocaleString()} - ${price.maxArea.toLocaleString()} ft²`}><Field label="Precio" value={String(price.price)} keyboardType="numeric" onChangeText={(value) => updatePrice(price.id, Number(value) || 0)} /></Card>)}</>}
        {tab === 'galeria' && <><SectionTitle title="Galeria" />{gallery.map((item) => <Card key={item.id} title={item.title} meta={item.type.toUpperCase()} status={item.visible ? 'PUBLICO' : 'OCULTO'} tone={item.visible ? 'green' : 'gray'}><Actions items={[[item.visible ? 'eye-off-outline' : 'eye-outline', '#2563eb', () => toggleGallery(item.id)], ['trash-outline', '#dc2626', () => setGallery((current) => current.filter((entry) => entry.id !== item.id))]]} /></Card>)}</>}
        {tab === 'opiniones' && <><SectionTitle title="Opiniones" />{reviews.map((review) => <Card key={review.id} title={review.customer} meta={'★'.repeat(review.rating)} status={review.visible ? 'PUBLICA' : 'OCULTA'} tone={review.visible ? 'green' : 'gray'}><Text style={styles.notes}>{review.text}</Text><Actions items={[[review.visible ? 'eye-off-outline' : 'eye-outline', '#2563eb', () => toggleReview(review.id)], ['trash-outline', '#dc2626', () => setReviews((current) => current.filter((entry) => entry.id !== review.id))]]} /></Card>)}</>}
        {tab === 'qr' && <><SectionTitle title="Codigo QR del cotizador" /><View style={styles.qrBox}><Ionicons name="qr-code-outline" size={132} color="#052e16" /><Text style={styles.cardTitle}>Cotizador publico</Text><Text style={styles.cardMeta}>{SITE_URL}/quote</Text><Pressable style={styles.primaryButton} onPress={() => void Linking.openURL(`${SITE_URL}/quote`)}><Text style={styles.primaryText}>Abrir cotizador</Text></Pressable></View></>}
        {tab === 'editor' && <><SectionTitle title="Editor del sitio" /><Text style={styles.notes}>Guarda textos, servicios, cobertura, colores y notas en Supabase.</Text>{sections.map((section) => <Card key={section.id} title={section.section} meta={section.title}><Field label="Contenido" value={section.body} multiline onChangeText={(body) => { setSections((current) => current.map((item) => item.id === section.id ? { ...item, body } : item)); void saveRow('site_sections', section.id, { body }); }} /></Card>)}</>}
      </ScrollView>
      <HouseModal house={editingHouse} onClose={() => setEditingHouse(null)} onSave={saveHouse} />
      <PaymentModal visible={!!paymentTarget} method={paymentMethod} note={paymentNote} onMethod={setPaymentMethod} onNote={setPaymentNote} onClose={() => setPaymentTarget(null)} onSave={registerPayment} />
    </SafeAreaView>
  );
}

function emptyHouse(): House { return { id: `h${Date.now()}`, client: '', address: '', phone: '', email: '', frequency: 'Cada 14 dias', service: 'Corte de yarda', price: 0, active: true, notes: '' }; }
function mapOrderStatus(status?: string): Status { if (status === 'completed' || status === 'FINALIZADA') return 'FINALIZADA'; if (status === 'cancelled' || status === 'CANCELADA') return 'CANCELADA'; return 'SOLICITADO'; }
function dbOrderStatus(status: Status) { return status === 'FINALIZADA' ? 'completed' : status === 'CANCELADA' ? 'cancelled' : 'scheduled'; }
function mapLeadStatus(status?: string): LeadStatus { if (status === 'scheduled') return 'scheduled'; if (status === 'completed') return 'completed'; if (status === 'cancelled') return 'cancelled'; return 'pending'; }
function leadLabel(status: LeadStatus) { return status === 'scheduled' ? 'PROGRAMADO' : status === 'completed' ? 'COMPLETADO' : status === 'cancelled' ? 'CANCELADO' : 'PENDIENTE'; }
function dbPay(method: PayMethod) { return method === 'CashApp' ? 'cash_app' : method.toLowerCase(); }
function mapCadence(cadence?: string) { return cadence === 'weekly' ? 'Cada 7 dias' : cadence === 'one_time' ? 'Una vez' : 'Cada 14 dias'; }
function weekRange(date = new Date()) {
  const startDate = new Date(date);
  const day = startDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startDate.setDate(startDate.getDate() + diff);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
}
function buildWeeklySummary(rows: any[], start: string, end: string): WeeklySummary {
  const weekRows = rows.filter((row) => String(row.service_date ?? '').slice(0, 10) >= start && String(row.service_date ?? '').slice(0, 10) <= end);
  const completed = weekRows.filter((row) => row.status === 'completed').length;
  const cancelled = weekRows.filter((row) => row.status === 'cancelled').length;
  const paid = weekRows.filter((row) => Number(row.paid_amount ?? 0) >= Number(row.price ?? 0) && Number(row.price ?? 0) > 0).length;
  const unpaid = weekRows.filter((row) => row.status === 'completed' && Number(row.paid_amount ?? 0) < Number(row.price ?? 0)).length;
  const total = weekRows.reduce((sum, row) => sum + Number(row.paid_amount ?? 0), 0);
  return { weekStart: start, weekEnd: end, completed, cancelled, unpaid, paid, total, notes: `Ordenes revisadas: ${weekRows.length}. Pagadas: ${paid}. Sin liquidar: ${unpaid}.` };
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}
function MiniButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable style={styles.siteButton} onPress={onPress}><Ionicons name={icon} size={18} color="#052e16" /><Text style={styles.siteText}>{label}</Text></Pressable>;
}
function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Pressable style={styles.smallButton} onPress={onPress}><Text style={styles.smallButtonText}>{action}</Text></Pressable>}</View>;
}
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metricCard}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Card({ title, meta, status, tone = 'white', children }: { title: string; meta?: string; status?: string; tone?: 'green' | 'gray' | 'red' | 'white'; children?: ReactNode }) {
  return <View style={styles.card}><View style={styles.cardHeader}><View style={styles.grow}><Text style={styles.cardTitle}>{title}</Text>{meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}</View>{status ? <StatusPill label={status} tone={tone} /> : null}</View>{children}</View>;
}
function Actions({ items }: { items: [keyof typeof Ionicons.glyphMap, string, () => void][] }) {
  return <View style={styles.actions}>{items.map(([icon, color, onPress], index) => <IconButton key={`${icon}-${index}`} color={color} icon={icon} onPress={onPress} />)}</View>;
}
function OrderCard({ order, house, worker, workerOnly, onStatus, onPay, onDelete, onHistory }: { order: Order; house?: House; worker?: Worker; workerOnly?: boolean; onStatus: (id: string, status: Status) => void; onPay: (id: string) => void; onDelete: (id: string) => void; onHistory: () => void }) {
  const rowStyle = order.status === 'FINALIZADA' ? styles.doneCard : order.status === 'CANCELADA' ? styles.canceledCard : undefined;
  return <View style={[styles.card, rowStyle]}><View style={styles.cardHeader}><View style={styles.grow}><Text style={styles.cardTitle}>{house?.address ?? 'Direccion pendiente'}</Text><Text style={styles.cardMeta}>{order.service} - {worker?.name ?? 'Sin asignar'}</Text><Text style={styles.total}>${order.price.toFixed(2)}</Text></View><StatusPill label={order.paid ? 'PAGADO' : order.status} tone={order.paid ? 'green' : order.status === 'CANCELADA' ? 'gray' : 'white'} /></View><Text style={styles.cardMeta}>{order.paid ? 'Pagado' : order.paidAmount > 0 ? 'Pago parcial' : 'Pago pendiente'} · Método: {order.paymentMethod || 'Sin registrar'} · Saldo: ${Math.max(0, order.price - order.paidAmount).toFixed(2)}</Text>{order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}<Actions items={workerOnly ? [['checkmark-done-outline', '#0f766e', () => onStatus(order.id, 'FINALIZADA')], ['cash-outline', '#16a34a', () => onPay(order.id)]] : [['checkmark-done-outline', '#0f766e', () => onStatus(order.id, 'FINALIZADA')], ['ban-outline', '#6b7280', () => onStatus(order.id, 'CANCELADA')], ['albums-outline', order.paid ? '#cbd5e1' : '#2563eb', onHistory], ['cash-outline', order.paid ? '#cbd5e1' : '#16a34a', () => onPay(order.id)], ['trash-outline', '#dc2626', () => onDelete(order.id)]]} /></View>;
}
function IconButton({ color, icon, onPress }: { color: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { return <Pressable style={[styles.iconButton, { backgroundColor: color }]} onPress={onPress}><Ionicons name={icon} size={18} color="white" /></Pressable>; }
function StatusPill({ label, tone }: { label: string; tone: 'green' | 'gray' | 'red' | 'white' }) { return <Text style={[styles.pill, styles[`${tone}Pill`]]}>{label}</Text>; }
function HouseModal({ house, onClose, onSave }: { house: House | null; onClose: () => void; onSave: (house: House) => void }) {
  const [draft, setDraft] = useState<House | null>(house);
  useEffect(() => setDraft(house), [house]);
  if (!draft) return null;
  return <Modal visible={!!house} animationType="slide"><SafeAreaView style={styles.modal}><SectionTitle title="Casa / cliente" action="Cerrar" onPress={onClose} /><ScrollView contentContainerStyle={styles.content}>{(['client', 'address', 'phone', 'email', 'service', 'frequency', 'notes'] as const).map((key) => <Field key={key} label={key} value={String(draft[key] ?? '')} multiline={key === 'notes'} onChangeText={(value) => setDraft({ ...draft, [key]: value })} />)}<Field label="Precio" value={String(draft.price)} keyboardType="numeric" onChangeText={(price) => setDraft({ ...draft, price: Number(price) || 0 })} /><Pressable style={styles.primaryButton} onPress={() => onSave(draft)}><Text style={styles.primaryText}>Guardar casa y generar orden</Text></Pressable></ScrollView></SafeAreaView></Modal>;
}
function PaymentModal({ visible, method, note, onMethod, onNote, onClose, onSave }: { visible: boolean; method: PayMethod; note: string; onMethod: (method: PayMethod) => void; onNote: (note: string) => void; onClose: () => void; onSave: () => void }) {
  return <Modal visible={visible} transparent animationType="fade"><View style={styles.overlay}><View style={styles.paymentBox}><SectionTitle title="Registrar pago" action="Cerrar" onPress={onClose} /><Text style={styles.cardMeta}>Fecha: {today}</Text><View style={styles.segment}>{(['Cash', 'CashApp', 'Venmo', 'Zelle'] as PayMethod[]).map((item) => <Pressable key={item} style={[styles.segmentButton, method === item && styles.segmentActive]} onPress={() => onMethod(item)}><Text style={styles.segmentText}>{item}</Text></Pressable>)}</View><Field label="Nota opcional" value={note} onChangeText={onNote} multiline /><Pressable style={styles.primaryButton} onPress={onSave}><Text style={styles.primaryText}>Marcar como pagado</Text></Pressable></View></View></Modal>;
}
function Field(props: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'numeric'; multiline?: boolean; secureTextEntry?: boolean }) {
  return <View><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.textarea]} placeholder={props.label} /></View>;
}
function EmptyState({ text }: { text: string }) { return <View style={styles.empty}><Ionicons name="calendar-clear-outline" size={38} color="#64748b" /><Text style={styles.emptyText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  loginBox: { flex: 1, justifyContent: 'center', padding: 18, gap: 12 },
  logo: { width: 150, height: 150, alignSelf: 'center', marginBottom: 4 },
  headerLogo: { width: 42, height: 42, borderRadius: 8 },
  header: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14, backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#bbf7d0', flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { color: '#052e16', fontWeight: '900', fontSize: 18 },
  subtitle: { color: '#166534', marginTop: 2, fontSize: 12 },
  siteButton: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#86efac', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  siteText: { color: '#052e16', fontWeight: '800' },
  tabs: { maxHeight: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabsContent: { paddingHorizontal: 8 },
  tab: { minWidth: 86, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  tabActive: { backgroundColor: '#dcfce7' },
  tabText: { color: '#475569', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
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
