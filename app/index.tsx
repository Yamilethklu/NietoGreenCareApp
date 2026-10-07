import { PanelNavigation, panelSections, type PanelTab } from '../components/PanelNavigation';
import { AdminManagement } from '../components/AdminManagement';
import { shareInvoice, adminRequest } from '../services/admin';
import { CustomerHistory } from '../components/CustomerHistory';
import { texasDate, enableDailyReminder, disableDailyReminder, onAgendaNotification } from '../services/daily-agenda';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { supabase, finishGoogleSignIn, signInWithGoogle, rememberAccessRole, restoreAccessRole } from '../services/auth';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const SITE_URL = 'https://nietogreecare-site.vercel.app';
const APP_LOGO = require('../assets/icon.png');
const VISIBLE_WEEKLY_SUMMARIES = 6;

type Status = 'SOLICITADO' | 'FINALIZADA' | 'CANCELADA';
type LeadStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
type PayMethod = 'Cash' | 'CashApp' | 'Venmo' | 'Zelle';
type Tab = PanelTab;
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
type LeadRow = { id: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null; address: string | null; reference_code: string | null; selected_services: string[] | null; area_sq_ft: number | null; details: string | null; additional_notes: string | null; gate_code: string | null; status: string | null; final_price: number | null; city: string | null; zip_code: string | null; created_at: string };
type PricingRow = { id: string; name: string | null; min_sq_ft: number | null; max_sq_ft: number | null; price: number | null };
type GalleryRow = { id: string; title: string | null; description: string | null; public_url: string | null; is_published: boolean | null; created_at: string };
type WorkerRow = { id: string; full_name: string | null; email: string | null; active: boolean | null; phone: string | null };
type PlanRow = { id: string; lead_id: string; cadence: string | null; active: boolean | null; price_per_visit: number | null; notes: string | null; created_at: string };
type OrderRow = { id: string; lead_id: string | null; service_date: string | null; status: string | null; price: number | null; paid_amount: number | null; payment_method: string | null; crew_member_id: string | null; notes: string | null };
type InvoiceRow = { id: string; order_id: string; invoice_number: string; issued_at: string | null; total: number | null; sent_at: string | null; created_at: string };
type WeeklySummaryRow = { id: string; week_start: string; week_end: string; completed_orders: number | null; cancelled_orders: number | null; unpaid_orders: number | null; paid_orders: number | null; total_collected: number | null; notes: string | null };
type SectionRow = { id: string; section: string | null; title: string | null; body: string | null; visible: boolean | null };

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [houseSearch, setHouseSearch] = useState('');
  const [debouncedHouseSearch, setDebouncedHouseSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef<ScrollView>(null);
  const [selectedDate, setSelectedDate] = useState(texasDate);
  const dayRef = useRef(texasDate());
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const loadingRef = useRef(false);
  const reloadRequestedRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [message, setMessage] = useState(supabase ? 'Inicia sesion para vincular con el panel web' : 'Faltan variables de Supabase');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [gallery, setGallery] = useState<Gallery[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<'todos' | 'pagado' | 'no_pagado'>('todos');
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'order' | 'invoice'; id: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('Cash');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHouseSearch(houseSearch), 250);
    return () => clearTimeout(timer);
  }, [houseSearch]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let authEventReceived = false;
    void restoreAccessRole().then(saved => {
      if (active && saved) setRole(current => current ?? saved);
    }).catch(() => { /* The user can still select a panel if storage is unavailable. */ });
    supabase.auth.getSession()
      .then(({ data }) => { if (active && !authEventReceived) setSession(data.session); })
      .catch(() => { if (active) setMessage('No se pudo recuperar la sesión. Inicia sesión de nuevo.'); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      if (!active) return;
      if (!nextSession) setAuthorized(false);
      setSession(nextSession);
    });
    const handleCallback = async (url: string) => {
      try { await finishGoogleSignIn(url); }
      catch (error) { if (active) setMessage(error instanceof Error ? error.message : 'No se pudo completar el acceso. Intenta de nuevo.'); }
    };
    const callbackListener = Linking.addEventListener('url', event => { void handleCallback(event.url); });
    void Linking.getInitialURL().then(url => { if (url) void handleCallback(url); }).catch(() => {
      if (active) setMessage('No se pudo completar el acceso. Intenta de nuevo.');
    });
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') supabase?.auth.startAutoRefresh(); else supabase?.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => { active = false; callbackListener.remove(); data.subscription.unsubscribe(); listener.remove(); supabase?.auth.stopAutoRefresh(); };
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
    const notification = onAgendaNotification(() => { const day = texasDate(); dayRef.current = day; setSelectedDate(day); setTab('agenda'); refresh(); });
    return () => { clearInterval(timer); foreground.remove(); notification.remove(); };
  }, [session?.user.id, authorized]);

  async function enableNotifications() {
    try { setMessage(await enableDailyReminder() ? 'Recordatorio diario activado a las 6:00 a. m. del teléfono.' : 'Activa las notificaciones en los ajustes del teléfono para recibir el recordatorio.'); }
    catch { setMessage('No se pudo activar el recordatorio. Revisa los permisos del teléfono.'); }
  }
  function openExternalUrl(url: string) {
    void Linking.openURL(url).catch(() => setMessage('No se pudo abrir el enlace.'));
  }

  const visibleOrders = useMemo(() => orders.filter((order) => order.date === selectedDate && (role !== 'worker' || workerMatches(order, session?.user.email))).sort((a, b) => a.id.localeCompare(b.id)), [orders, selectedDate, role, session]);
  const visibleHouses = useMemo(() => {
    const query = normalizeSearch(debouncedHouseSearch);
    if (!query) return houses;
    return houses.filter((house) => normalizeSearch(`${house.address} ${house.city ?? ''} ${house.client}`).includes(query));
  }, [houses, debouncedHouseSearch]);
  const filteredInvoices = useMemo(() => invoices.filter((invoice) => invoiceFilter === 'todos' || (invoiceFilter === 'pagado' ? invoice.paid : !invoice.paid)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50), [invoiceFilter, invoices]);
  const customers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; requests: number; completed: number; paidTotal: number }>();
    // Invoice house IDs and mobile house IDs both use leads.id.
    const paidByHouseId = new Map<string, number>();
    const completedByHouse = new Map<string, number>();
    for (const invoice of invoices) {
      if (invoice.paid) paidByHouseId.set(invoice.houseId, (paidByHouseId.get(invoice.houseId) ?? 0) + invoice.total);
    }
    for (const order of orders) {
      if (order.status === 'FINALIZADA') completedByHouse.set(order.houseId, (completedByHouse.get(order.houseId) ?? 0) + 1);
    }
    const paidByCustomerKey = new Map<string, number>();
    for (const house of houses) {
      const key = normalizePhone(house.phone) || house.id;
      paidByCustomerKey.set(key, (paidByCustomerKey.get(key) ?? 0) + (paidByHouseId.get(house.id) ?? 0));
    }
    leads.forEach((lead) => {
      const phone = normalizePhone(lead.phone);
      const key = phone || lead.id;
      const item = map.get(key) ?? { id: key, name: lead.customer, phone: lead.phone, requests: 0, completed: 0, paidTotal: 0 };
      item.requests += 1;
      if (lead.status === 'completed') item.completed += 1;
      // The customer-key total is already aggregated across all matching houses.
      item.paidTotal = paidByCustomerKey.get(key) ?? paidByHouseId.get(lead.id) ?? 0;
      map.set(key, item);
    });
    houses.forEach((house) => {
      const phone = normalizePhone(house.phone);
      const key = phone || house.id;
      if (!map.has(key)) map.set(key, { id: house.id, name: house.client, phone: house.phone, requests: 0, completed: completedByHouse.get(house.id) ?? 0, paidTotal: paidByCustomerKey.get(key) ?? paidByHouseId.get(house.id) ?? 0 });
    });
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
    if (!supabase) return setMessage('Falta la URL o la clave pública de Supabase en esta versión de la app.');
    setAuthBusy(true);
    try {
      if (role) await rememberAccessRole(role);
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      setMessage(error ? 'Correo o contraseña incorrectos. Si usas Google en el sitio, pulsa Continuar con Google.' : 'Verificando acceso...');
    } catch { setMessage('No se pudo conectar. Revisa tu conexión e intenta de nuevo.'); }
    finally { setAuthBusy(false); }
  }
  async function googleSignIn() {
    setAuthBusy(true);
    try { if (role && !(await signInWithGoogle(role))) setMessage('Inicio con Google cancelado. Puedes intentarlo de nuevo.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.'); }
    finally { setAuthBusy(false); }
  }
  async function signOut() {
    try {
      await disableDailyReminder();
    } catch {
      setMessage('No se pudo desactivar el recordatorio. Se cerrará la sesión de todos modos.');
    }
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setAuthorized(false);
      setSession(null);
      setMessage('Sesion cerrada');
    } catch {
      setMessage('No se pudo cerrar la sesión. Intenta de nuevo.');
    }
  }

  async function loadData() {
    if (!supabase || !session || !authorized) return;
    if (loadingRef.current) {
      reloadRequestedRef.current = true;
      return;
    }
    loadingRef.current = true;
    try {
    if (role === 'worker') {
      const response = await fetch(`${SITE_URL}/api/crew/orders?date=${encodeURIComponent(selectedDate)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo cargar la agenda');
      const member = payload.data.member as WorkerRow;
      const rows = (payload.data.orders ?? []) as (OrderRow & { leads?: Pick<LeadRow, 'customer_name' | 'address' | 'customer_phone' | 'additional_notes'> | null })[];
      setWorkers([{ id: member.id, name: member.full_name ?? 'Trabajador', email: member.email ?? '', active: true }]);
      setHouses(rows.map((row) => ({ id: row.lead_id ?? '', client: row.leads?.customer_name ?? 'Cliente', address: row.leads?.address ?? '', phone: row.leads?.customer_phone ?? '', email: '', frequency: '', service: 'Corte de césped', price: Number(row.price), active: true, notes: row.leads?.additional_notes ?? '' })));
      setOrders(rows.map((row) => ({ id: row.id, houseId: row.lead_id ?? '', date: String(row.service_date ?? texasDate()), service: 'Corte de césped', price: Number(row.price), paidAmount: Number(row.paid_amount), paid: Number(row.paid_amount) >= Number(row.price), paymentMethod: row.payment_method ?? undefined, status: mapOrderStatus(row.status ?? undefined), workerId: member.id, notes: row.notes ?? undefined })));
      setMessage('Agenda sincronizada con el dueño.');
      return;
    }
    async function readAll<T>(table: string, column: string, columns: string, ascending = false) {
      const rows: T[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase!.from(table).select(columns).order(column, { ascending }).order('id').range(offset, offset + 499);
        if (error) return { data: null, error };
        rows.push(...((data ?? []) as unknown as T[]));
        if ((data?.length ?? 0) < 500) return { data: rows, error: null };
      }
    }
    const [leadRows, priceRows, galleryRows, reviewRow, workerRows, planRows, orderRows, invoiceRows, sectionRows, weeklyRows] = await Promise.all([
      readAll<LeadRow>('leads', 'created_at', 'id,customer_name,customer_phone,customer_email,address,reference_code,selected_services,area_sq_ft,details,additional_notes,gate_code,status,final_price,city,zip_code,created_at', false),
      readAll<PricingRow>('pricing_rules', 'min_sq_ft', 'id,name,min_sq_ft,max_sq_ft,price', true),
      readAll<GalleryRow>('gallery', 'created_at', 'id,title,description,public_url,is_published,created_at', false),
      supabase.from('app_settings').select('value').eq('key', 'customer_reviews').maybeSingle(),
      readAll<WorkerRow>('crew_members', 'full_name', 'id,full_name,email,active,phone', true),
      readAll<PlanRow>('service_plans', 'created_at', 'id,lead_id,cadence,active,price_per_visit,notes,created_at', false),
      readAll<OrderRow>('work_orders', 'service_date', 'id,lead_id,service_date,status,price,paid_amount,payment_method,crew_member_id,notes', false),
      readAll<InvoiceRow>('work_invoices', 'created_at', 'id,order_id,invoice_number,issued_at,total,sent_at,created_at', false),
      supabase.from('site_sections').select('id,section,title,body,visible').returns<SectionRow[]>().order('section').limit(100),
      supabase.from('weekly_summaries').select('id,week_start,week_end,completed_orders,cancelled_orders,unpaid_orders,paid_orders,total_collected,notes').returns<WeeklySummaryRow[]>().order('week_start', { ascending: false }).limit(VISIBLE_WEEKLY_SUMMARIES),
    ]);
    const loadError = [leadRows, workerRows, planRows, orderRows, invoiceRows].find(result => result.error)?.error;
    if (loadError) throw new Error(`No se pudo cargar el historial completo: ${loadError.message}`);
    const pendingSections = [['Precios',priceRows],['Galería',galleryRows],['Opiniones',reviewRow],['Editor',sectionRows],['Resúmenes',weeklyRows]].filter(([,result]) => typeof result !== 'string' && result.error).map(([name]) => name);
    const leadData = leadRows.data ?? [];
    const planByLead = new Map<string, PlanRow>();
    for(const plan of planRows.data??[]){const prior=planByLead.get(String(plan.lead_id));if(!prior||(!prior.active&&plan.active))planByLead.set(String(plan.lead_id),plan);}
    const ordersById = new Map((orderRows.data ?? []).map((row) => [String(row.id), row]));
    const invoiceByOrder = new Map((invoiceRows.data ?? []).map((row) => [String(row.order_id), row]));
    setLeads(leadData.map((row) => ({ id: row.id, customer: row.customer_name ?? 'Cliente', phone: row.customer_phone ?? '', email: row.customer_email ?? '', address: row.address ?? '', reference: row.reference_code ?? String(row.id).slice(0, 8), services: Array.isArray(row.selected_services) ? row.selected_services.join(', ') : 'Corte de cesped', areaSqFt: Number(row.area_sq_ft ?? 0), details: row.details ?? row.additional_notes ?? '', gateCode: row.gate_code ?? undefined, status: mapLeadStatus(row.status ?? undefined), finalPrice: Number(row.final_price ?? 0) })));
    setHouses(leadData.map((row) => { const plan = planByLead.get(String(row.id)); return { id: row.id, planId: plan?.id, client: row.customer_name ?? 'Cliente', address: row.address ?? '', city: row.city ?? '', zipCode: row.zip_code ?? '', phone: row.customer_phone ?? '', email: row.customer_email ?? '', frequency: mapCadence(plan?.cadence ?? undefined), service: Array.isArray(row.selected_services) ? row.selected_services.join(', ') : 'Corte de yarda', price: Number(plan?.price_per_visit ?? row.final_price ?? 0), active: Boolean(plan?.active ?? row.status !== 'cancelled'), notes: plan?.notes ?? row.additional_notes ?? row.details ?? '' }; }));
    if (priceRows.data) setPrices(priceRows.data.map((row) => ({ id: row.id, name: row.name ?? 'Regla de precio', minArea: Number(row.min_sq_ft ?? 0), maxArea: Number(row.max_sq_ft ?? 0), price: Number(row.price ?? 0) })));
    if (galleryRows.data) setGallery(galleryRows.data.map((row) => ({ id: row.id, title: row.title ?? row.description ?? 'Galeria', type: String(row.public_url ?? '').match(/\.(mp4|mov|webm)(\?|$)/i) ? 'video' : 'foto', visible: Boolean(row.is_published ?? true) })));
    if (!reviewRow.error) {
      const reviewSettings: unknown = reviewRow.data?.value;
      const reviewItems = isRecord(reviewSettings) && Array.isArray(reviewSettings.items) ? reviewSettings.items.filter(isRecord) : [];
      setReviews(reviewItems.map((row) => ({
        id: String(row.id ?? ''),
        customer: String(row.customer_name ?? 'Cliente'),
        rating: Number(row.rating ?? 5),
        text: String(row.comment ?? ''),
        visible: Boolean(row.approved ?? true),
      })));
    }
    if (workerRows.data) setWorkers(workerRows.data.map((row) => ({ id: row.id, name: row.full_name ?? 'Trabajador', email: row.email ?? '', active: Boolean(row.active ?? true) })));
    if (orderRows.data) setOrders(orderRows.data.map((row) => { const price = Number(row.price ?? 0); const paidAmount = Number(row.paid_amount ?? 0); const invoice = invoiceByOrder.get(String(row.id)); return { id: row.id, houseId: row.lead_id ?? '', date: String(row.service_date ?? texasDate()).slice(0, 10), service: (leadData.find((lead) => lead.id === row.lead_id)?.selected_services ?? ['Corte de yarda']).join(', '), price, status: mapOrderStatus(row.status ?? undefined), paid: paidAmount >= price && price > 0, paidAmount, paymentMethod: row.payment_method ?? undefined, workerId: row.crew_member_id ?? undefined, notes: row.notes ?? undefined, invoiceId: invoice?.id }; }));
    if (invoiceRows.data) {
      const groups=new Map<string,InvoiceRow[]>();
      for(const row of invoiceRows.data){const key=String(row.invoice_number).startsWith('NGC-G-')?String(row.invoice_number).split('/')[0]:row.invoice_number;groups.set(key,[...(groups.get(key)??[]),row]);}
      setInvoices(Array.from(groups.entries()).map(([key,rows])=>{const row=rows[0];const first=ordersById.get(String(row.order_id));return {id:row.id,houseId:first?.lead_id??'',createdAt:String(row.issued_at??texasDate()).slice(0,10),orderIds:rows.map(item=>item.order_id),number:key,total:rows.reduce((sum,item)=>sum+Number(item.total),0),paid:rows.every(item=>Number(ordersById.get(String(item.order_id))?.paid_amount??0)>=Number(item.total)),sentAt:rows.find(item=>item.sent_at)?.sent_at};}));
    }
    if (sectionRows.data) setSections(sectionRows.data.map((row) => ({ id: row.id, section: row.section ?? 'Seccion', title: row.title ?? row.section ?? 'Contenido', body: row.body ?? '', visible: Boolean(row.visible ?? true) })));
    if (weeklyRows.data) setWeeklySummaries(weeklyRows.data.map((row) => ({ id: row.id, weekStart: row.week_start, weekEnd: row.week_end, completed: Number(row.completed_orders ?? 0), cancelled: Number(row.cancelled_orders ?? 0), unpaid: Number(row.unpaid_orders ?? 0), paid: Number(row.paid_orders ?? 0), total: Number(row.total_collected ?? 0), notes: row.notes ?? '' })));
    const summarySaved = await ensureCurrentWeeklySummary(orderRows.data ?? []);
    if (!summarySaved && !pendingSections.includes('Resúmenes')) pendingSections.push('Resúmenes');
    setMessage(pendingSections.length ? `Sincronización pendiente: ${pendingSections.join(', ')}. Pulsa sincronizar para reintentar.` : 'Actualizado con el sitio web');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la agenda. Revisa tu conexión.'); }
    finally {
      loadingRef.current = false;
      if (reloadRequestedRef.current) {
        reloadRequestedRef.current = false;
        void refreshRef.current();
      }
    }
  }

  async function saveRow(table: string, id: string, values: Record<string, unknown>) {
    if (!supabase || !session) return;
    const { error } = await supabase.from(table).update(values).eq('id', id);
    if (error) {
      console.error(`No se pudo guardar en ${table}.`, error);
      throw new Error('No se pudo guardar el cambio.');
    }
  }
  async function deleteRow(table: string, id: string) {
    if (!supabase || !session) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`No se pudo eliminar en ${table}.`, error);
      setMessage('No se pudo eliminar el elemento.');
    }
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
  async function updateLeadStatus(id: string, status: LeadStatus) {
    try {
      await saveRow('leads', id, { status });
      setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status } : lead));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.');
    }
  }
  function deleteOrder(id: string) { void updateStatus(id, 'CANCELADA'); }
  async function deleteHouse(id: string) {
    try {
      await saveRow('leads', id, { status: 'cancelled', cancelled_at: new Date().toISOString() });
      setHouses((current) => current.filter((house) => house.id !== id));
      setOrders((current) => current.filter((order) => order.houseId !== id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la casa.');
    }
  }
  async function saveHouse(house: House) {
    try {
      const cadence = house.frequency === 'Cada 7 dias' ? 'weekly' : house.frequency === 'Cada 14 dias' ? 'bi_weekly' : house.frequency === 'Una vez' ? 'one_time' : null;
      if(!cadence) throw new Error('Seleccione una frecuencia válida.');
      await adminRequest('operations','POST',{action:'mobile_house',id:/^[0-9a-f-]{36}$/i.test(house.id)?house.id:null,house:{customer_name:house.client.trim(),customer_phone:house.phone.trim(),customer_email:house.email.trim()||null,address:house.address.trim(),city:house.city?.trim()||'',zip_code:house.zipCode?.trim()||''},cadence,first_date:selectedDate,price:house.price,notes:house.notes||null});
      await loadData();setEditingHouse(null);setMessage('Casa y visitas futuras guardadas.');
    } catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar.');throw error;}
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
  function workerMatches(order: Order, email?: string | null) {
    if (!email) return false;
    const worker = workers.find((item) => item.id === order.workerId);
    return worker?.email.toLowerCase() === email.toLowerCase();
  }
  async function ensureCurrentWeeklySummary(rows: OrderRow[]): Promise<boolean> {
    if (!supabase || !session || role === 'worker') return true;
    const { start, end } = weekRange();
    const summary = buildWeeklySummary(rows, start, end);
    try {
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
      if (error) {
        console.warn('No se pudo guardar el resumen semanal.', error);
        return false;
      }
      setWeeklySummaries((current) => [summary, ...current.filter((item) => item.weekStart !== start)]);
      return true;
    } catch (error) {
      console.warn('No se pudo guardar el resumen semanal.', error);
      return false;
    }
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
      <View style={styles.panelHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir menú" accessibilityState={{expanded:menuOpen}} onPress={()=>setMenuOpen(true)} style={styles.menuTrigger}><Ionicons name="menu-outline" size={26} color="#14532d" /></Pressable>
        <Image source={APP_LOGO} style={styles.panelLogo} resizeMode="contain" />
        <View style={styles.grow}><Text style={styles.panelBrand}>NIETO GREEN CARE</Text><Text style={styles.panelCaption}>{role === 'worker' ? 'Panel del trabajador' : 'Panel del propietario'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sincronizar datos" onPress={()=>void loadData()} style={styles.menuTrigger}><Ionicons name="sync-outline" size={22} color="#166534" /></Pressable>
      </View>
      <View style={styles.sectionBar}><Text style={styles.sectionEyebrow}>{role === 'worker' ? 'MI TRABAJO' : 'MI NEGOCIO'}</Text><Text style={styles.currentSection}>{panelSections.find(item=>item.key===tab)?.label}</Text></View>
      <PanelNavigation open={menuOpen} worker={role==='worker'} active={tab} onClose={()=>setMenuOpen(false)} onSelect={next=>{setTab(next);contentRef.current?.scrollTo({y:0,animated:false});}} onWebsite={()=>openExternalUrl(SITE_URL)} onSignOut={()=>void signOut()} onReminder={()=>void enableNotifications()} />
      <ScrollView ref={contentRef} contentContainerStyle={styles.content}>
        <View style={styles.syncNotice}><Ionicons name="cloud-outline" size={16} color="#64748b"/><Text accessibilityLiveRegion="polite" style={styles.syncText}>{message}</Text></View>
        {tab === 'dashboard' && <><SectionTitle title="Dashboard" action="Sincronizar" onPress={() => void loadData()} /><View style={styles.metricsGrid}><Metric label="Ingresos" value={`$${metrics.income.toFixed(2)}`} /><Metric label="Trabajos hechos" value={String(metrics.completed)} /><Metric label="Solicitudes" value={String(metrics.pending)} /><Metric label="Area medida" value={`${metrics.area.toLocaleString()} ft²`} /></View><Text style={styles.notes}>Cada semana se guarda automaticamente un resumen para revisarlo despues.</Text>{weeklySummaries.slice(0, VISIBLE_WEEKLY_SUMMARIES).map((summary) => <Card key={summary.weekStart} title={`Semana ${summary.weekStart} a ${summary.weekEnd}`} meta={`${summary.completed} finalizadas - ${summary.cancelled} canceladas`} status={`$${summary.total.toFixed(2)}`} tone="green"><Text style={styles.notes}>{summary.notes}</Text></Card>)}</>}
        {tab === 'solicitudes' && <><SectionTitle title="Solicitudes del cotizador" />{leads.map((lead) => <Card key={lead.id} title={lead.customer} meta={`${lead.reference} - ${lead.areaSqFt.toLocaleString()} ft²`} status={leadLabel(lead.status)} tone={lead.status === 'completed' ? 'green' : lead.status === 'cancelled' ? 'gray' : 'white'}><Text style={styles.cardMeta}>{lead.address}</Text><Text style={styles.total}>${lead.finalPrice.toFixed(2)}</Text><Text style={styles.notes}>{lead.services}. {lead.details}{lead.gateCode ? ` Codigo: ${lead.gateCode}` : ''}</Text><Actions items={[['calendar-outline', '#2563eb', () => { void updateLeadStatus(lead.id, 'scheduled'); }], ['checkmark-done-outline', '#0f766e', () => { void updateLeadStatus(lead.id, 'completed'); }], ['ban-outline', '#6b7280', () => { void updateLeadStatus(lead.id, 'cancelled'); }], ['logo-google', '#16a34a', () => openExternalUrl(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Nieto Green Care - ${lead.customer}`)}&details=${encodeURIComponent(lead.address)}`)]]} /></Card>)}</>}
        {tab === 'clientes' && <CustomerHistory houses={houses} orders={orders} invoices={invoices} session={session} reload={loadData} />}
        {tab === 'agenda' && <><SectionTitle title="Agenda del Día" action="Hoy" onPress={() => setSelectedDate(texasDate())} /><Calendar current={selectedDate} markedDates={{ [selectedDate]: { selected: true, selectedColor: '#15803d' } }} onDayPress={({ dateString }) => setSelectedDate(dateString)} /><ScrollView horizontal><View><View style={styles.tableRow}>{['ID', 'Fecha', 'Domicilio', 'Servicio', 'Precio', 'Status', 'Invoices', 'Notas'].map((label) => <Text key={label} style={[styles.tableHeader, label === 'Notas' ? styles.tableNotes : styles.tableCell]}>{label}</Text>)}</View>{visibleOrders.map((order) => { const house = getHouse(order.houseId); const worker = workers.find((item) => item.id === order.workerId); const invoice = invoices.find((item) => item.id === order.invoiceId); const workerOnly = role === 'worker'; const actions: [keyof typeof Ionicons.glyphMap, string, () => void][] = workerOnly ? [['checkmark-done-outline', '#0f766e', () => updateStatus(order.id, 'FINALIZADA')], ['cash-outline', '#16a34a', () => setPaymentTarget({ type: 'order', id: order.id })]] : [['checkmark-done-outline', '#0f766e', () => updateStatus(order.id, 'FINALIZADA')], ['ban-outline', '#6b7280', () => updateStatus(order.id, 'CANCELADA')], ['albums-outline', order.paid ? '#cbd5e1' : '#2563eb', () => setTab('clientes')], ['cash-outline', order.paid ? '#cbd5e1' : '#16a34a', () => setPaymentTarget({ type: 'order', id: order.id })], ['trash-outline', '#dc2626', () => deleteOrder(order.id)]]; return <View key={order.id} style={styles.tableRow}><Text style={styles.tableCell}>{order.id}</Text><Text style={styles.tableCell}>{order.date}</Text><Text style={styles.tableCell}>{house?.address ?? 'Dirección pendiente'}</Text><Text style={styles.tableCell}>{order.service}{worker ? ` · ${worker.name}` : ''}</Text><Text style={styles.tableCell}>${order.price.toFixed(2)}</Text><Text style={styles.tableCell}>{order.paid ? 'PAGADO' : order.status}</Text><Text style={styles.tableCell}>{invoice?.number ?? invoice?.id ?? '—'}</Text><View style={styles.tableNotes}><Text style={styles.notes}>{order.notes || '—'}</Text><Actions items={actions} />{!workerOnly && <View style={styles.segment}>{[{ id: '', name: 'Sin asignar' }, ...workers.filter((item) => item.active)].map((member) => <Pressable key={member.id} style={[styles.segmentButton, order.workerId === (member.id || undefined) && styles.segmentActive]} onPress={() => { void (async () => { if (await updateOrder(order.id, { crew_member_id: member.id || null })) await loadData(); })(); }}><Text style={styles.segmentText}>{member.name}</Text></Pressable>)}</View>}</View></View>; })}</View></ScrollView>{!visibleOrders.length && <EmptyState text="No hay órdenes agendadas para esta fecha" />}</>}
        {tab === 'casas' && <><SectionTitle title="Casas y clientes" action="Agregar nueva" onPress={() => setEditingHouse(emptyHouse())} /><TextInput accessibilityLabel="Buscar casas por dirección o cliente" style={styles.input} value={houseSearch} onChangeText={setHouseSearch} placeholder="Buscar por dirección, ciudad o cliente" />{visibleHouses.map((house) => <Card key={house.id} title={house.client} meta={`${house.address} - ${house.frequency} - $${house.price}`} status={house.active ? 'ACTIVA' : 'INACTIVA'} tone={house.active ? 'green' : 'gray'}><Text style={styles.notes}>{house.notes || 'Sin notas'}</Text><Actions items={[['list-outline', '#2563eb', () => createInvoice(house.id)], ['create-outline', '#eab308', () => setEditingHouse(house)], ['trash-outline', '#dc2626', () => deleteHouse(house.id)]]} /><Text style={styles.cardMeta}>Ordenes recientes: {orders.filter((order) => order.houseId === house.id).slice(-50).length}</Text></Card>)}{visibleHouses.length === 0 && <EmptyState text="No se encontraron casas con esa búsqueda" />}</>}
        {tab === 'invoices' && <><SectionTitle title="Invoices" /><View style={styles.segment}>{(['todos', 'pagado', 'no_pagado'] as const).map((item) => <Pressable key={item} style={[styles.segmentButton, invoiceFilter === item && styles.segmentActive]} onPress={() => setInvoiceFilter(item)}><Text style={styles.segmentText}>{item.replace('_', ' ')}</Text></Pressable>)}</View>{filteredInvoices.map((invoice) => <Card key={invoice.id} title={getHouse(invoice.houseId)?.client ?? 'Cliente'} meta={`${invoice.number ?? invoice.id} - ${invoice.createdAt}`} status={invoice.paid ? 'PAGADO' : 'NO PAGADO'} tone={invoice.paid ? 'green' : 'red'}><Text style={styles.total}>${invoice.total.toFixed(2)}</Text><Actions items={[['eye-outline', '#2563eb', () => setPaymentTarget({ type: 'invoice', id: invoice.id })], ['document-attach-outline', '#eab308', () => void shareInvoice(invoice.id).catch(error => setMessage(error.message))]]} /></Card>)}</>}
        {tab === 'trabajadores' && <AdminManagement key="trabajadores" mode="trabajadores" onChanged={loadData} />}
        {tab === 'precios' && <AdminManagement key="precios" mode="precios" onChanged={loadData} />}
        {tab === 'galeria' && <AdminManagement key="galeria" mode="galeria" onChanged={loadData} />}
        {tab === 'opiniones' && <AdminManagement key="opiniones" mode="opiniones" onChanged={loadData} />}
        {tab === 'qr' && <><SectionTitle title="Codigo QR del cotizador" /><View style={styles.qrBox}><Ionicons name="qr-code-outline" size={132} color="#052e16" /><Text style={styles.cardTitle}>Cotizador publico</Text><Text style={styles.cardMeta}>{SITE_URL}/quote</Text><Pressable style={styles.primaryButton} onPress={() => openExternalUrl(`${SITE_URL}/quote`)}><Text style={styles.primaryText}>Abrir cotizador</Text></Pressable></View></>}
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
function weekRange(date = texasDate()) {
  const startDate = new Date(`${date}T00:00:00Z`);
  const day = startDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  startDate.setUTCDate(startDate.getUTCDate() + diff);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  return { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function normalizePhone(value: string) { return value.replace(/\D/g, '').slice(-10); }
function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function buildWeeklySummary(rows: OrderRow[], start: string, end: string): WeeklySummary {
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
function OrderCard({ order, house, worker, workerOnly, onStatus, onPay, onDelete, onHistory, workers, onAssign }: { workers: Worker[]; onAssign: (id:string|null)=>void; order: Order; house?: House; worker?: Worker; workerOnly?: boolean; onStatus: (id: string, status: Status) => void; onPay: (id: string) => void; onDelete: (id: string) => void; onHistory: () => void }) {
  const rowStyle = order.status === 'FINALIZADA' ? styles.doneCard : order.status === 'CANCELADA' ? styles.canceledCard : undefined;
  return <View style={[styles.card, rowStyle]}><View style={styles.cardHeader}><View style={styles.grow}><Text style={styles.cardTitle}>{house?.address ?? 'Direccion pendiente'}</Text><Text style={styles.cardMeta}>{order.service} - {worker?.name ?? 'Sin asignar'}</Text><Text style={styles.total}>${order.price.toFixed(2)}</Text></View><StatusPill label={order.paid ? 'PAGADO' : order.status} tone={order.paid ? 'green' : order.status === 'CANCELADA' ? 'gray' : 'white'} /></View><Text style={styles.cardMeta}>{order.paid ? 'Pagado' : order.paidAmount > 0 ? 'Pago parcial' : 'Pago pendiente'} · Método: {order.paymentMethod || 'Sin registrar'} · Saldo: ${Math.max(0, order.price - order.paidAmount).toFixed(2)}</Text>{order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}{!workerOnly&&<View><Text style={styles.label}>Asignar trabajador a esta visita</Text><View style={styles.segment}>{[{id:'',name:'Sin asignar'},...workers].map(member=><Pressable key={member.id} style={[styles.segmentButton,order.workerId===member.id&&styles.segmentActive]} onPress={()=>onAssign(member.id||null)}><Text style={styles.segmentText}>{member.name}</Text></Pressable>)}</View></View>}<Actions items={workerOnly ? [['checkmark-done-outline', '#0f766e', () => onStatus(order.id, 'FINALIZADA')], ['cash-outline', '#16a34a', () => onPay(order.id)]] : [['checkmark-done-outline', '#0f766e', () => onStatus(order.id, 'FINALIZADA')], ['ban-outline', '#6b7280', () => onStatus(order.id, 'CANCELADA')], ['albums-outline', order.paid ? '#cbd5e1' : '#2563eb', onHistory], ['cash-outline', order.paid ? '#cbd5e1' : '#16a34a', () => onPay(order.id)], ['trash-outline', '#dc2626', () => onDelete(order.id)]]} /></View>;
}
function IconButton({ color, icon, onPress }: { color: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { return <Pressable style={[styles.iconButton, { backgroundColor: color }]} onPress={onPress}><Ionicons name={icon} size={18} color="white" /></Pressable>; }
function StatusPill({ label, tone }: { label: string; tone: 'green' | 'gray' | 'red' | 'white' }) { return <Text style={[styles.pill, styles[`${tone}Pill`]]}>{label}</Text>; }
function HouseModal({ house, onClose, onSave }: { house: House | null; onClose: () => void; onSave: (house: House) => Promise<void> }) {
  const [draft, setDraft] = useState<House | null>(house);
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  useEffect(() => setDraft(house), [house]);
  if (!draft) return null;
  return <Modal visible={!!house} animationType="slide"><SafeAreaView style={styles.modal}><SectionTitle title="Casa / cliente" action="Cerrar" onPress={onClose} /><ScrollView contentContainerStyle={styles.content}>{(['client', 'address', 'city', 'zipCode', 'phone', 'email', 'notes'] as const).map((key) => <Field key={key} label={key} value={String(draft[key] ?? '')} multiline={key === 'notes'} onChangeText={(value) => setDraft({ ...draft, [key]: value })} />)}<Text style={styles.label}>Frecuencia</Text><View style={styles.segment}>{['Cada 7 dias','Cada 14 dias','Una vez'].map(value=><Pressable key={value} style={[styles.segmentButton,draft.frequency===value&&styles.segmentActive]} onPress={()=>setDraft({...draft,frequency:value})}><Text style={styles.segmentText}>{value}</Text></Pressable>)}</View><Field label="Precio" value={String(draft.price)} keyboardType="numeric" onChangeText={(price) => setDraft({ ...draft, price: Number(price) || 0 })} />{saveError!==''&&<Text accessibilityLiveRegion="polite">{saveError}</Text>}<Pressable disabled={saving} style={styles.primaryButton} onPress={async()=>{if(saving)return;setSaving(true);setSaveError('');try{await onSave(draft);}catch(error){setSaveError(error instanceof Error?error.message:'No se pudo guardar.');}finally{setSaving(false);}}}><Text style={styles.primaryText}>Guardar casa y generar orden</Text></Pressable></ScrollView></SafeAreaView></Modal>;
}
function PaymentModal({ visible, method, note, onMethod, onNote, onClose, onSave }: { visible: boolean; method: PayMethod; note: string; onMethod: (method: PayMethod) => void; onNote: (note: string) => void; onClose: () => void; onSave: () => void }) {
  return <Modal visible={visible} transparent animationType="fade"><View style={styles.overlay}><View style={styles.paymentBox}><SectionTitle title="Registrar pago" action="Cerrar" onPress={onClose} /><Text style={styles.cardMeta}>Fecha: {texasDate()}</Text><View style={styles.segment}>{(['Cash', 'CashApp', 'Venmo', 'Zelle'] as PayMethod[]).map((item) => <Pressable key={item} style={[styles.segmentButton, method === item && styles.segmentActive]} onPress={() => onMethod(item)}><Text style={styles.segmentText}>{item}</Text></Pressable>)}</View><Field label="Nota opcional" value={note} onChangeText={onNote} multiline /><Pressable style={styles.primaryButton} onPress={onSave}><Text style={styles.primaryText}>Marcar como pagado</Text></Pressable></View></View></Modal>;
}
function Field(props: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'numeric'; multiline?: boolean; secureTextEntry?: boolean; disabled?: boolean }) {
  return <View><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.textarea]} placeholder={props.label} /></View>;
}
function EmptyState({ text }: { text: string }) { return <View style={styles.empty}><Ionicons name="calendar-clear-outline" size={38} color="#64748b" /><Text style={styles.emptyText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  panelHeader:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,paddingVertical:14,backgroundColor:'#ffffff',borderBottomWidth:1,borderBottomColor:'#e8efeb'},
  menuTrigger:{width:42,height:42,borderRadius:12,backgroundColor:'#f0f8f2',alignItems:'center',justifyContent:'center'},
  panelLogo:{width:38,height:38,borderRadius:12},panelBrand:{fontSize:13,fontWeight:'800',color:'#14532d'},panelCaption:{fontSize:11,color:'#64748b',marginTop:3},
  sectionBar:{paddingHorizontal:20,paddingTop:20,paddingBottom:12},sectionEyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.6,color:'#729180'},currentSection:{fontSize:26,fontWeight:'800',color:'#142d20',marginTop:4},
  syncNotice:{flexDirection:'row',alignItems:'center',gap:8,paddingBottom:8},syncText:{flex:1,fontSize:12,lineHeight:17,color:'#64748b'},

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
  tableRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tableCell: { width: 118, color: '#0f172a', padding: 10, fontSize: 12 },
  tableHeader: { width: 118, color: '#14532d', backgroundColor: '#dcfce7', padding: 10, fontWeight: '900', fontSize: 12 },
  tableNotes: { width: 280, padding: 8, gap: 6 },
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
