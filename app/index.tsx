import { PanelNavigation, panelSections, type PanelTab } from '../components/PanelNavigation';
import { AdminManagement } from '../components/AdminManagement';
import { shareInvoice, adminRequest, siteUrl } from '../services/admin';
import { CustomerHistory } from '../components/CustomerHistory';
import { texasDate, enableDailyReminder, disableDailyReminder, onAgendaNotification } from '../services/daily-agenda';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as Updates from 'expo-updates';
import { supabase, finishGoogleSignIn, signInWithGoogle, rememberAccessRole, restoreAccessRole } from '../services/auth';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const APP_LOGO = require('../assets/icon.png');

type Status = 'SOLICITADO' | 'FINALIZADA' | 'CANCELADA';
type LeadStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
type PayMethod = 'Cash' | 'CashApp' | 'Venmo' | 'Zelle';
type Tab = PanelTab;
type House = { id: string; planId?: string; client: string; address: string; city?: string; zipCode?: string; phone: string; email: string; frequency: string; service: string; price: number; active: boolean; notes: string; details?: string };
type Order = { id: string; houseId: string; date: string; service: string; price: number; status: Status; paid: boolean; paidAmount: number; paymentMethod?: string; workerId?: string; notes?: string; invoiceId?: string };
type Invoice = { id: string; houseId: string; createdAt: string; orderIds: string[]; number?: string; total: number; paid: boolean; sentAt?: string | null };
type Worker = { id: string; name: string; email: string; active: boolean };
type Lead = { id: string; customer: string; phone: string; email: string; address: string; reference: string; services: string; areaSqFt: number; details: string; ownerNotes: string; gateCode?: string; status: LeadStatus; finalPrice: number };
type Role = 'admin' | 'worker' | null;
type WeeklySummary = { id?: string; weekStart: string; weekEnd: string; completed: number; cancelled: number; unpaid: number; paid: number; total: number; notes: string };
type LeadRow = { id: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null; address: string | null; reference_code: string | null; selected_services: string[] | null; area_sq_ft: number | null; details: string | null; additional_notes: string | null; gate_code: string | null; status: string | null; final_price: number | null; city: string | null; zip_code: string | null; created_at: string };
type WorkerRow = { id: string; full_name: string | null; email: string | null; active: boolean | null; phone: string | null };
type PlanRow = { id: string; lead_id: string; cadence: string | null; active: boolean | null; price_per_visit: number | null; notes: string | null; created_at: string };
type OrderRow = { id: string; lead_id: string | null; service_date: string | null; status: string | null; price: number | null; paid_amount: number | null; payment_method: string | null; crew_member_id: string | null; notes: string | null };
type InvoiceRow = { id: string; order_id: string; invoice_number: string; issued_at: string | null; total: number | null; sent_at: string | null; created_at: string };

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('agenda');
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef<ScrollView>(null);
  const [selectedDate, setSelectedDate] = useState(texasDate);
  const dayRef = useRef(texasDate());
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const loadingRef = useRef(false);
  const reloadRequestedRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>('admin');
  const [authorized, setAuthorized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [message, setMessage] = useState(supabase ? 'Inicia sesion para vincular con el panel web' : 'Faltan variables de Supabase');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<'todos' | 'pagado' | 'no_pagado'>('todos');
  const [invoicePage, setInvoicePage] = useState(0);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [editingLeadNote, setEditingLeadNote] = useState<Lead | null>(null);
  const [acceptingLead, setAcceptingLead] = useState<Lead | null>(null);
  const [historyFocusHouseId, setHistoryFocusHouseId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'order' | 'invoice'; id: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(texasDate());
  const [orderPriceDrafts, setOrderPriceDrafts] = useState<Record<string, string>>({});
  const [orderDateDrafts, setOrderDateDrafts] = useState<Record<string, string>>({});
  const [orderNoteDrafts, setOrderNoteDrafts] = useState<Record<string, string>>({});
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Status | 'unpaid'>('all');
  const [orderWorkerFilter, setOrderWorkerFilter] = useState('all');
  const [requestDateFilter, setRequestDateFilter] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualDate, setManualDate] = useState(texasDate());
  const [manualAddress, setManualAddress] = useState('');
  const [manualService, setManualService] = useState('Yard');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualPrice, setManualPrice] = useState('');

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
    void applyAvailableUpdate();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void applyAvailableUpdate();
    });
    return () => listener.remove();
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
      if (allowed) setTab('agenda');
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

  const visibleOrders = useMemo(() => orders.filter((order) => {
    if (order.date !== selectedDate) return false;
    if (role === 'worker' && !workerMatches(order, session?.user.email)) return false;
    return true;
  }).sort((a, b) => a.id.localeCompare(b.id)), [orders, selectedDate, role, session]);
  const visibleRequestOrders = useMemo(() => orders.filter((order) => {
    if (requestDateFilter && order.date !== requestDateFilter) return false;
    if (orderStatusFilter === 'unpaid' && order.paidAmount >= order.price) return false;
    if (orderStatusFilter !== 'all' && orderStatusFilter !== 'unpaid' && order.status !== orderStatusFilter) return false;
    if (orderWorkerFilter !== 'all' && order.workerId !== orderWorkerFilter) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [orders, requestDateFilter, orderStatusFilter, orderWorkerFilter]);
  const visibleLeads = useMemo(() => leads.filter((lead) => lead.status !== 'cancelled'), [leads]);
  const specialServiceLeads = useMemo(() => visibleLeads.filter(isSpecialServiceLead), [visibleLeads]);
  const quoteLeads = useMemo(() => visibleLeads.filter((lead) => !isSpecialServiceLead(lead)), [visibleLeads]);
  const sortedInvoices = useMemo(() => invoices.filter((invoice) => invoiceFilter === 'todos' || (invoiceFilter === 'pagado' ? invoice.paid : !invoice.paid)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [invoiceFilter, invoices]);
  const invoicePageStart = Math.min(invoicePage, Math.max(0, Math.ceil(sortedInvoices.length / 50) - 1)) * 50;
  const filteredInvoices = useMemo(() => sortedInvoices.slice(invoicePageStart, invoicePageStart + 50), [sortedInvoices, invoicePageStart]);
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
      const response = await fetch(`${siteUrl}/api/crew/orders?date=${encodeURIComponent(selectedDate)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
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
    const [leadRows, workerRows, planRows, orderRows, invoiceRows] = await Promise.all([
      readAll<LeadRow>('leads', 'created_at', 'id,customer_name,customer_phone,customer_email,address,reference_code,selected_services,area_sq_ft,details,additional_notes,gate_code,status,final_price,city,zip_code,created_at', false),
      readAll<WorkerRow>('crew_members', 'full_name', 'id,full_name,email,active,phone', true),
      readAll<PlanRow>('service_plans', 'created_at', 'id,lead_id,cadence,active,price_per_visit,notes,created_at', false),
      readAll<OrderRow>('work_orders', 'service_date', 'id,lead_id,service_date,status,price,paid_amount,payment_method,crew_member_id,notes', false),
      readAll<InvoiceRow>('work_invoices', 'created_at', 'id,order_id,invoice_number,issued_at,total,sent_at,created_at', false),
    ]);
    const loadError = [leadRows, workerRows, planRows, orderRows, invoiceRows].find(result => result.error)?.error;
    if (loadError) throw new Error(`No se pudo cargar el historial completo: ${loadError.message}`);
    const pendingSections: string[] = [];
    const leadData = leadRows.data ?? [];
    const planByLead = new Map<string, PlanRow>();
    for(const plan of planRows.data??[]){const prior=planByLead.get(String(plan.lead_id));if(!prior||(!prior.active&&plan.active))planByLead.set(String(plan.lead_id),plan);}
    const ordersById = new Map((orderRows.data ?? []).map((row) => [String(row.id), row]));
    const invoiceByOrder = new Map((invoiceRows.data ?? []).map((row) => [String(row.order_id), row]));
    setLeads(leadData.map((row) => ({ id: row.id, customer: row.customer_name ?? 'Cliente', phone: row.customer_phone ?? '', email: row.customer_email ?? '', address: row.address ?? '', reference: row.reference_code ?? String(row.id).slice(0, 8), services: Array.isArray(row.selected_services) ? row.selected_services.join(', ') : 'Corte de cesped', areaSqFt: Number(row.area_sq_ft ?? 0), details: row.details ?? '', ownerNotes: row.additional_notes ?? '', gateCode: row.gate_code ?? undefined, status: mapLeadStatus(row.status ?? undefined), finalPrice: Number(row.final_price ?? 0) })));
    setHouses(leadData.map((row) => { const plan = planByLead.get(String(row.id)); return { id: row.id, planId: plan?.id, client: row.customer_name ?? 'Cliente', address: row.address ?? '', city: row.city ?? '', zipCode: row.zip_code ?? '', phone: row.customer_phone ?? '', email: row.customer_email ?? '', frequency: mapCadence(plan?.cadence ?? undefined), service: Array.isArray(row.selected_services) ? row.selected_services.join(', ') : 'Corte de yarda', price: Number(plan?.price_per_visit ?? row.final_price ?? 0), active: Boolean(plan?.active ?? row.status !== 'cancelled'), notes: plan?.notes ?? row.additional_notes ?? '', details: row.details ?? '' }; }));
    if (workerRows.data) setWorkers(workerRows.data.map((row) => ({ id: row.id, name: row.full_name ?? 'Trabajador', email: row.email ?? '', active: Boolean(row.active ?? true) })));
    if (orderRows.data) setOrders(orderRows.data.map((row) => { const price = Number(row.price ?? 0); const paidAmount = Number(row.paid_amount ?? 0); const invoice = invoiceByOrder.get(String(row.id)); return { id: row.id, houseId: row.lead_id ?? '', date: String(row.service_date ?? texasDate()).slice(0, 10), service: (leadData.find((lead) => lead.id === row.lead_id)?.selected_services ?? ['Corte de yarda']).join(', '), price, status: mapOrderStatus(row.status ?? undefined), paid: paidAmount >= price && price > 0, paidAmount, paymentMethod: row.payment_method ?? undefined, workerId: row.crew_member_id ?? undefined, notes: row.notes ?? undefined, invoiceId: invoice?.id }; }));
    if (invoiceRows.data) {
      const groups=new Map<string,InvoiceRow[]>();
      for(const row of invoiceRows.data){const key=String(row.invoice_number).startsWith('NGC-G-')?String(row.invoice_number).split('/')[0]:row.invoice_number;groups.set(key,[...(groups.get(key)??[]),row]);}
      setInvoices(Array.from(groups.entries()).map(([key,rows])=>{const row=rows[0];const first=ordersById.get(String(row.order_id));return {id:row.id,houseId:first?.lead_id??'',createdAt:String(row.issued_at??texasDate()).slice(0,10),orderIds:rows.map(item=>item.order_id),number:key,total:rows.reduce((sum,item)=>sum+Number(item.total),0),paid:rows.every(item=>Number(ordersById.get(String(item.order_id))?.paid_amount??0)>=Number(item.total)),sentAt:rows.find(item=>item.sent_at)?.sent_at};}));
    }
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
  async function updateStatus(id: string, status: Status) {
    if (await updateOrder(id, { status: dbOrderStatus(status) })) await loadData();
  }
  async function updateOrder(id: string, changes: Record<string, unknown>) {
    if (!session) return false;
    try {
      const response = await fetch(`${siteUrl}/api/${role === 'worker' ? 'crew/orders' : 'admin/operations'}`, { method: role === 'worker' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(role === 'worker' ? { id, ...changes } : { action: 'order', order: { id, ...changes } }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo guardar');
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar el cambio'); return false; }
  }
  function priceDraft(order: Order) {
    return orderPriceDrafts[order.id] ?? String(order.price);
  }
  async function saveOrderPrice(order: Order) {
    const value = Number(priceDraft(order));
    if (!Number.isFinite(value) || value < 0) return setMessage('Ingrese un precio válido.');
    if (await updateOrder(order.id, { price: value })) {
      setOrderPriceDrafts((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      await loadData();
      setMessage('Precio actualizado.');
    }
  }
  async function saveOrderDetails(order: Order) {
    const date = (orderDateDrafts[order.id] ?? order.date).trim();
    const notes = (orderNoteDrafts[order.id] ?? order.notes ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      setMessage('La fecha debe tener el formato AAAA-MM-DD.');
      return;
    }
    if (await updateOrder(order.id, { service_date: date, notes: notes || null })) {
      setOrderDateDrafts((current) => { const next = { ...current }; delete next[order.id]; return next; });
      setOrderNoteDrafts((current) => { const next = { ...current }; delete next[order.id]; return next; });
      await loadData();
      setEditingOrderId(null);
      setMessage('Fecha y notas de la orden actualizadas.');
    }
  }
  async function saveLeadNote(id: string, note: string) {
    try {
      await saveRow('leads', id, { additional_notes: note });
      setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ownerNotes: note } : lead));
      setHouses((current) => current.map((house) => house.id === id ? { ...house, notes: note } : house));
      setEditingLeadNote(null);
      setMessage('Nota guardada en la solicitud y en el historial del cliente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la nota.');
    }
  }
  async function acceptLeadRequest(lead: Lead, date: string, note: string, cadence: 'weekly' | 'bi_weekly') {
    try {
      const house = houses.find((item) => item.id === lead.id);
      await adminRequest('operations', 'POST', {
        action: 'mobile_house',
        id: lead.id,
        house: {
          customer_name: lead.customer.trim(),
          customer_phone: lead.phone.trim(),
          customer_email: lead.email.trim() || null,
          address: lead.address.trim(),
          city: house?.city?.trim() || 'Directo',
          zip_code: house?.zipCode && /^\d{5}$/.test(house.zipCode) ? house.zipCode : '00000',
        },
        cadence,
        first_date: date,
        price: lead.finalPrice,
        notes: note || null,
      });
      await saveRow('leads', lead.id, { status: 'scheduled', additional_notes: note });
      await loadData();
      setAcceptingLead(null);
      setMessage('Solicitud aceptada y agregada al calendario.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo aceptar la solicitud.');
    }
  }
  async function deleteLeadRequest(id: string) {
    try {
      await saveRow('leads', id, { status: 'cancelled', cancelled_at: new Date().toISOString() });
      setLeads((current) => current.filter((lead) => lead.id !== id));
      setMessage('Solicitud eliminada de la lista.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la solicitud.');
    }
  }
  function deleteOrder(id: string) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    if (order.paidAmount > 0 || order.invoiceId) {
      setMessage('No se puede eliminar una orden con pagos o factura. Elimine primero la factura pendiente si corresponde.');
      return;
    }
    Alert.alert('Eliminar orden', 'La orden se eliminará de forma permanente. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void (async () => {
        try {
          await adminRequest('operations', 'POST', { action: 'order_delete', id });
          await loadData();
          setMessage('Orden eliminada.');
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la orden.');
        }
      })() },
    ]);
  }
  async function saveHouse(house: House) {
    try {
      const cadence = house.frequency === 'Cada 7 dias' ? 'weekly' : house.frequency === 'Cada 14 dias' ? 'bi_weekly' : house.frequency === 'Cada 8 dias' ? 'every_8_days' : house.frequency === 'Cada 15 dias' ? 'every_15_days' : house.frequency === 'Una vez' ? 'one_time' : null;
      if(!cadence) throw new Error('Seleccione una frecuencia válida.');
      await adminRequest('operations','POST',{action:'mobile_house',id:/^[0-9a-f-]{36}$/i.test(house.id)?house.id:null,house:{customer_name:house.client.trim(),customer_phone:house.phone.trim(),customer_email:house.email.trim()||null,address:house.address.trim(),city:house.city?.trim()||'',zip_code:house.zipCode?.trim()||''},cadence,first_date:selectedDate,price:house.price,notes:house.notes||null});
      await loadData();setEditingHouse(null);setMessage('Casa y visitas futuras guardadas.');
    } catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar.');throw error;}
  }
  function openCustomerHistory(houseId?: string) {
    if (houseId) setHistoryFocusHouseId(houseId);
    setTab('clientes');
  }
  function clearManualRequest() {
    setManualName('');
    setManualDate(texasDate());
    setManualAddress('');
    setManualService('Yard');
    setManualPhone('');
    setManualEmail('');
    setManualNote('');
    setManualPrice('');
  }
  async function saveManualRequest() {
    const name = manualName.trim();
    const date = manualDate.trim();
    const address = manualAddress.trim();
    const service = manualService.trim();
    const phone = manualPhone.trim();
    const email = manualEmail.trim();
    const note = manualNote.trim();
    const price = Number(manualPrice);
    if (name.length < 2 || address.length < 5 || service.length < 2 || phone.length < 7) return setMessage('Complete nombre, fecha, dirección, servicio y teléfono.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return setMessage('La fecha debe tener el formato AAAA-MM-DD.');
    if (!Number.isFinite(price) || price < 0) return setMessage('Ingrese un precio válido.');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setMessage('Ingrese un correo válido o deje el campo vacío.');
    try {
      const existing = houses.find((house) => normalizeSearch(house.client.trim()) === normalizeSearch(name));
      const result = await adminRequest('operations', 'POST', {
        action: 'mobile_house',
        id: null,
        house: {
          customer_name: name,
          customer_phone: existing?.phone || phone,
          customer_email: existing?.email || email || null,
          address,
          city: existing?.city || 'Directo',
          zip_code: existing?.zipCode && /^\d{5}$/.test(existing.zipCode) ? existing.zipCode : '00000',
        },
        cadence: 'one_time',
        first_date: date,
        price,
        notes: note || null,
      });
      const savedId = isRecord(result) && typeof result.id === 'string' ? result.id : undefined;
      if (savedId) await saveRow('leads', savedId, { selected_services: [service], details: service, additional_notes: note || null });
      await loadData();
      clearManualRequest();
      setSelectedDate(date);
      setTab('agenda');
      setMessage(existing ? 'Solicitud agregada al historial del cliente y a la agenda.' : 'Cliente nuevo creado y solicitud agregada a la agenda.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la nueva solicitud.');
    }
  }
  async function acceptSpecialService(id: string) {
    const lead = leads.find((item) => item.id === id);
    if (!lead) {
      setMessage('No se encontró la solicitud de servicio especial. Actualiza la app e inténtalo de nuevo.');
      return;
    }
    const house = houses.find((item) => item.id === lead.id);
    try {
      await adminRequest('operations', 'POST', {
        action: 'mobile_house',
        id: lead.id,
        house: {
          customer_name: lead.customer.trim(),
          customer_phone: lead.phone.trim(),
          customer_email: lead.email.trim() || null,
          address: lead.address.trim(),
          city: house?.city?.trim() || 'Directo',
          zip_code: house?.zipCode && /^\d{5}$/.test(house.zipCode) ? house.zipCode : '00000',
        },
        cadence: 'one_time',
        first_date: selectedDate,
        price: lead.finalPrice,
        notes: lead.ownerNotes || null,
      });
      await saveRow('leads', id, { status: 'scheduled' });
      await loadData();
      setMessage(`Servicio especial aceptado y agregado a la agenda del ${selectedDate}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo aceptar el servicio especial.');
    }
  }
  async function deleteInvoice(invoiceId: string) {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    const hasPayment = invoice.orderIds.some((id) => Number(orders.find((order) => order.id === id)?.paidAmount ?? 0) > 0);
    if (invoice.paid || hasPayment || invoice.sentAt) {
      setMessage('Solo se pueden eliminar facturas no enviadas y sin pagos registrados.');
      return;
    }
    Alert.alert('Eliminar factura', 'La factura se eliminará y sus visitas quedarán disponibles para incluirlas en otra factura. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void (async () => {
        try {
          await adminRequest('operations/invoices', 'POST', { action: 'delete', invoice_id: invoiceId });
          await loadData();
          setMessage('Factura eliminada. Las visitas quedaron disponibles para facturarse de nuevo.');
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la factura.');
        }
      })() },
    ]);
  }

  async function sendInvoice(invoiceId: string) {
    try {
      await adminRequest('operations/invoices', 'POST', { action: 'send', invoice_id: invoiceId });
      await loadData();
      setMessage('Factura enviada al correo del cliente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo enviar la factura.');
    }
  }

  async function registerPayment() {
    if (!paymentTarget) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || paymentDate > texasDate()) { setMessage('Seleccione una fecha de pago válida, no futura.'); return; }
    if(paymentTarget.type === 'invoice'){
      if(!session)return;
      try{
        const response=await fetch(`${siteUrl}/api/admin/operations/invoices`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'pay',invoice_id:paymentTarget.id,payment_method:dbPay(paymentMethod),payment_date:paymentDate})});
        const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'No se pudo registrar el pago');
        await loadData();setPaymentTarget(null);setPaymentNote('');setMessage('Pago guardado en el sitio y la app.');
      }catch(error){setMessage(error instanceof Error?error.message:'No se pudo registrar el pago');}
      return;
    }
    const order = orders.find(item => item.id === paymentTarget.id);
    if (!order || !(await updateOrder(order.id, { paid_amount: order.price, payment_method: dbPay(paymentMethod), paid_at: `${paymentDate}T12:00:00.000Z`, notes: paymentNote || order.notes || null }))) return;
    await loadData();
    setPaymentTarget(null); setPaymentNote('');
  }
  function workerMatches(order: Order, email?: string | null) {
    if (!email) return false;
    const worker = workers.find((item) => item.id === order.workerId);
    return worker?.email.toLowerCase() === email.toLowerCase();
  }
  function orderTone(order: Order): 'green' | 'gray' | undefined {
    return order.status === 'FINALIZADA' ? 'green' : order.status === 'CANCELADA' ? 'gray' : undefined;
  }
  function orderCardStyle(order: Order) {
    return order.status === 'FINALIZADA' ? styles.doneCard : order.status === 'CANCELADA' ? styles.canceledCard : undefined;
  }
  function renderAgendaOrder(order: Order) {
    const house = getHouse(order.houseId);
    return <View key={order.id} style={[styles.card, orderCardStyle(order)]}>
      <View style={styles.cardHeader}>
        <View style={styles.grow}>
          <Text style={styles.cardTitle}>{house?.client ?? 'Cliente'}</Text>
          <Text style={styles.cardMeta}>{house?.address ?? 'Dirección pendiente'}</Text>
          <Text style={styles.ownerNote}>Nota del dueño: {order.notes || house?.notes || 'Sin notas'}</Text>
        </View>
        <StatusPill label={order.paid ? 'PAGADO' : order.status} tone={order.paid ? 'green' : order.status === 'CANCELADA' ? 'gray' : 'white'} />
      </View>
      <View style={styles.priceRow}>
        <View style={styles.grow}><Field label="Precio" value={priceDraft(order)} keyboardType="numeric" onChangeText={(value) => setOrderPriceDrafts((current) => ({ ...current, [order.id]: value }))} /></View>
        <Pressable style={styles.smallButton} onPress={() => void saveOrderPrice(order)}><Text style={styles.smallButtonText}>Guardar precio</Text></Pressable>
      </View>
      <View style={styles.actionLabels}>
        <Pressable style={[styles.actionButton, styles.doneAction]} onPress={() => Alert.alert('Estado del trabajo', 'Selecciona el estado', [{ text: 'Realizado', onPress: () => void updateStatus(order.id, 'FINALIZADA') }, { text: 'Cancelado', style: 'destructive', onPress: () => void updateStatus(order.id, 'CANCELADA') }, { text: 'Cerrar', style: 'cancel' }])}><Ionicons name="checkmark-done-outline" size={18} color="#052e16" /><Text style={styles.actionText}>{order.status === 'FINALIZADA' ? 'Realizado ▾' : order.status === 'CANCELADA' ? 'Cancelado ▾' : 'Estado ▾'}</Text></Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: order.paid ? '#fde047' : '#facc15' }]} onPress={() => Alert.alert('Estado de pago', 'Selecciona el estado de cobro', [{ text: 'Pagado', onPress: () => { if (!order.paid) setPaymentTarget({ type: 'order', id: order.id }); } }, { text: 'Pendiente', onPress: () => { void (async () => { if (await updateOrder(order.id, { paid_amount: 0, payment_method: null })) await loadData(); })(); } }, { text: 'Cerrar', style: 'cancel' }])}><Ionicons name="cash-outline" size={18} color="#422006" /><Text style={styles.actionText}>{order.paid ? 'Pagado ▾' : 'Pendiente ▾'}</Text></Pressable>
        <Pressable style={[styles.actionButton, styles.historyAction]} onPress={() => openCustomerHistory(order.houseId)}><Ionicons name="albums-outline" size={18} color="#ffffff" /><Text style={[styles.actionText, styles.lightActionText]}>Historial</Text></Pressable>
      </View>
    </View>;
  }
  function renderSolicitudOrder(order: Order) {
    const house = getHouse(order.houseId);
    const invoiceLabel = order.invoiceId ? `Invoice ${order.invoiceId.slice(0, 8)}` : 'Sin invoice';
    return <View key={order.id} style={[styles.card, orderCardStyle(order)]}>
      <View style={styles.cardHeader}>
        <View style={styles.grow}>
          <Text style={styles.cardTitle}>Solicitud {order.id.slice(0, 8)}</Text>
          <Text style={styles.cardMeta}>Fecha: {order.date}</Text>
          <Text style={styles.cardMeta}>Domicilio: {house?.address ?? 'Dirección pendiente'}</Text>
          <Text style={styles.cardMeta}>Servicio: {order.service || house?.service || 'Yard'}</Text>
          <Text style={styles.cardMeta}>{invoiceLabel} · {order.paid ? 'Pagado' : 'No pagado'}</Text>
        </View>
        <StatusPill label={order.status} tone={orderTone(order) ?? 'white'} />
      </View>
      <View style={styles.priceRow}>
        <View style={styles.grow}><Field label="Precio" value={priceDraft(order)} keyboardType="numeric" onChangeText={(value) => setOrderPriceDrafts((current) => ({ ...current, [order.id]: value }))} /></View>
        <Pressable style={styles.smallButton} onPress={() => void saveOrderPrice(order)}><Text style={styles.smallButtonText}>Guardar precio</Text></Pressable>
      </View>
      <Field label="Notas personales del dueño" value={orderNoteDrafts[order.id] ?? (order.notes || house?.notes || '')} multiline onChangeText={(value) => setOrderNoteDrafts((current) => ({ ...current, [order.id]: value }))} />
      <Pressable style={styles.smallButton} onPress={() => void saveOrderDetails({ ...order, notes: orderNoteDrafts[order.id] ?? order.notes })}><Text style={styles.smallButtonText}>Guardar nota</Text></Pressable>
      {!role || role === 'admin' ? <View><Text style={styles.label}>Trabajador</Text><View style={styles.segment}>{[{ id: '', name: 'Sin asignar' }, ...workers.filter((item) => item.active)].map((member) => <Pressable key={member.id || 'none'} style={[styles.segmentButton, order.workerId === (member.id || undefined) && styles.segmentActive]} onPress={() => { void (async () => { if (await updateOrder(order.id, { crew_member_id: member.id || null })) await loadData(); })(); }}><Text style={styles.segmentText}>{member.name}</Text></Pressable>)}</View></View> : null}
      <View style={styles.actionLabels}>
        <Pressable style={[styles.actionButton, styles.doneAction]} onPress={() => Alert.alert('Estatus', 'Selecciona el estatus', [{ text: 'Solicitada', onPress: () => void updateStatus(order.id, 'SOLICITADO') }, { text: 'Finalizada', onPress: () => void updateStatus(order.id, 'FINALIZADA') }, { text: 'Cancelada', style: 'destructive', onPress: () => void updateStatus(order.id, 'CANCELADA') }, { text: 'Cerrar', style: 'cancel' }])}><Ionicons name="checkmark-circle-outline" size={18} color="#052e16" /><Text style={styles.actionText}>Estatus ▾</Text></Pressable>
        <Pressable style={[styles.actionButton, styles.historyAction]} onPress={() => openCustomerHistory(order.houseId)}><Ionicons name="albums-outline" size={18} color="#ffffff" /><Text style={[styles.actionText, styles.lightActionText]}>Historial</Text></Pressable>
        <Pressable style={[styles.actionButton, styles.payAction]} disabled={order.paid} onPress={() => setPaymentTarget({ type: 'order', id: order.id })}><Ionicons name="cash-outline" size={18} color="#052e16" /><Text style={styles.actionText}>{order.paid ? 'Pagado' : '$ Pago'}</Text></Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: '#eab308' }]} onPress={() => setEditingOrderId((current) => current === order.id ? null : order.id)}><Ionicons name="create-outline" size={18} color="#422006" /><Text style={styles.actionText}>{editingOrderId === order.id ? 'Cerrar edición' : 'Editar'}</Text></Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: '#dc2626' }]} onPress={() => deleteOrder(order.id)}><Ionicons name="trash-outline" size={18} color="#ffffff" /><Text style={[styles.actionText, styles.lightActionText]}>Eliminar</Text></Pressable>
      </View>
      {editingOrderId === order.id && <>
        <Field label="Fecha (AAAA-MM-DD)" value={orderDateDrafts[order.id] ?? order.date} onChangeText={(value) => setOrderDateDrafts((current) => ({ ...current, [order.id]: value }))} />
        <Field label="Notas de la orden" value={orderNoteDrafts[order.id] ?? (order.notes ?? '')} onChangeText={(value) => setOrderNoteDrafts((current) => ({ ...current, [order.id]: value }))} />
        <Pressable style={styles.smallButton} onPress={() => void saveOrderDetails(order)}><Text style={styles.smallButtonText}>Guardar edición</Text></Pressable>
      </>}
    </View>;
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
      <PanelNavigation open={menuOpen} worker={role==='worker'} active={tab} onClose={()=>setMenuOpen(false)} onSelect={next=>{setTab(next);contentRef.current?.scrollTo({y:0,animated:false});}} onWebsite={()=>openExternalUrl(siteUrl)} onSignOut={()=>void signOut()} onReminder={()=>void enableNotifications()} />
      <ScrollView ref={contentRef} contentContainerStyle={styles.content}>
        <View style={styles.syncNotice}><Ionicons name="cloud-outline" size={16} color="#64748b"/><Text accessibilityLiveRegion="polite" style={styles.syncText}>{message}</Text></View>
        {tab === 'nueva' && <><SectionTitle title="Nueva Solicitud" /><Card title="Registrar trabajo directo" meta="Para clientes que contactan al dueño directamente"><Field label="Nombre del cliente" value={manualName} onChangeText={setManualName} /><Field label="Fecha del servicio (AAAA-MM-DD)" value={manualDate} onChangeText={setManualDate} /><Field label="Dirección de la propiedad" value={manualAddress} onChangeText={setManualAddress} /><Field label="Servicio a realizar" value={manualService} onChangeText={setManualService} /><Field label="Teléfono de contacto" value={manualPhone} onChangeText={setManualPhone} /><Field label="Correo electrónico (opcional)" value={manualEmail} onChangeText={setManualEmail} /><Field label="Nota del dueño" value={manualNote} multiline onChangeText={setManualNote} /><Field label="Precio ajustable" value={manualPrice} keyboardType="numeric" onChangeText={setManualPrice} /><Pressable style={styles.primaryButton} onPress={() => void saveManualRequest()}><Text style={styles.primaryText}>Guardar solicitud</Text></Pressable></Card></>}
        {tab === 'solicitudes' && <><SectionTitle title="Solicitudes" action={requestDateFilter ? 'Quitar filtro' : undefined} onPress={() => setRequestDateFilter(null)} /><Text style={styles.label}>Filtrar por fecha</Text><Calendar current={requestDateFilter ?? selectedDate} markedDates={requestDateFilter ? { [requestDateFilter]: { selected: true, selectedColor: '#15803d' } } : {}} onDayPress={({ dateString }) => setRequestDateFilter(dateString)} /><Text style={styles.label}>Filtrar por estatus</Text><View style={styles.segment}>{([{ key: 'all', label: 'Todas' }, { key: 'SOLICITADO', label: 'Solicitadas' }, { key: 'FINALIZADA', label: 'Finalizadas' }, { key: 'CANCELADA', label: 'Canceladas' }, { key: 'unpaid', label: 'No pagadas' }] as const).map((item) => <Pressable key={item.key} style={[styles.segmentButton, orderStatusFilter === item.key && styles.segmentActive]} onPress={() => setOrderStatusFilter(item.key)}><Text style={styles.segmentText}>{item.label}</Text></Pressable>)}</View><Text style={styles.label}>Filtrar por trabajador</Text><View style={styles.segment}>{[{ id: 'all', name: 'Todos' }, { id: '', name: 'Sin asignar' }, ...workers.filter((item) => item.active)].map((member) => <Pressable key={member.id || 'none'} style={[styles.segmentButton, orderWorkerFilter === member.id && styles.segmentActive]} onPress={() => setOrderWorkerFilter(member.id)}><Text style={styles.segmentText}>{member.name}</Text></Pressable>)}</View>{quoteLeads.map((lead) => <Card key={lead.id} title={lead.customer} meta={`Nueva cotización ${lead.reference}`} status={leadLabel(lead.status)} tone={lead.status === 'completed' || lead.status === 'scheduled' ? 'green' : 'white'}><Text style={styles.cardMeta}>{lead.address}</Text><Text style={styles.total}>${lead.finalPrice.toFixed(2)}</Text><Text style={styles.notes}>{lead.services}. {lead.details || 'Sin detalles adicionales'}{lead.gateCode ? ` Codigo: ${lead.gateCode}` : ''}</Text>{lead.ownerNotes ? <Text style={styles.ownerNote}>Nota del dueño: {lead.ownerNotes}</Text> : null}<Text style={styles.cardMeta}>Acepta la solicitud para elegir la fecha de inicio y guardar una nota corta para el historial.</Text><View style={styles.actions}><IconButton color="#16a34a" icon="checkmark-outline" onPress={() => setAcceptingLead(lead)} disabled={lead.status === 'scheduled'} /><IconButton color="#dc2626" icon="trash-outline" onPress={() => void deleteLeadRequest(lead.id)} /></View></Card>)}{visibleRequestOrders.map((order) => renderSolicitudOrder(order))}{!quoteLeads.length && !visibleRequestOrders.length && <EmptyState text="No hay solicitudes para este filtro" />}</>}
        {tab === 'especiales' && <><SectionTitle title="Servicio Especial" /><Text style={styles.cardMeta}>Solicitudes de servicios especiales recibidas desde el sitio web o contacto directo.</Text>{specialServiceLeads.map((lead) => <Card key={lead.id} title={lead.customer} meta={lead.reference} status={lead.status === 'scheduled' ? 'ACEPTADA' : leadLabel(lead.status)} tone={lead.status === 'scheduled' || lead.status === 'completed' ? 'green' : 'white'}><Text style={styles.cardMeta}>{lead.address}</Text><Text style={styles.cardMeta}>{lead.phone} · {lead.email || 'Sin correo'}</Text><Text style={styles.notes}>{lead.services}. {lead.details || 'Sin detalles adicionales'}</Text>{lead.ownerNotes ? <Text style={styles.ownerNote}>Nota del dueño: {lead.ownerNotes}</Text> : null}<View style={styles.actionLabels}><Pressable style={[styles.actionButton, styles.doneAction]} disabled={lead.status === 'scheduled'} onPress={() => void acceptSpecialService(lead.id)}><Ionicons name="checkmark-outline" size={18} color="#052e16" /><Text style={styles.actionText}>{lead.status === 'scheduled' ? 'Aceptada' : 'Aceptada'}</Text></Pressable><Pressable style={[styles.actionButton, { backgroundColor: '#dc2626' }]} onPress={() => void deleteLeadRequest(lead.id)}><Ionicons name="trash-outline" size={18} color="#ffffff" /><Text style={[styles.actionText, styles.lightActionText]}>Eliminar</Text></Pressable></View></Card>)}{!specialServiceLeads.length && <EmptyState text="No hay servicios especiales pendientes." />}</>}
        {tab === 'clientes' && <CustomerHistory houses={houses} orders={orders} invoices={invoices} session={session} reload={loadData} focusHouseId={historyFocusHouseId} onFocused={() => setHistoryFocusHouseId(null)} />}
        {tab === 'agenda' && <><SectionTitle title="Agenda del Día" action="Hoy" onPress={() => setSelectedDate(texasDate())} /><Text style={styles.cardMeta}>Trabajos programados para {selectedDate}</Text>{visibleOrders.map((order) => renderAgendaOrder(order))}{!visibleOrders.length && <EmptyState text="No hay trabajos agendados para hoy" />}</>}
        {tab === 'invoices' && <><SectionTitle title="Facturas y pagos" /><View style={styles.segment}>{(['todos', 'pagado', 'no_pagado'] as const).map((item) => <Pressable key={item} style={[styles.segmentButton, invoiceFilter === item && styles.segmentActive]} onPress={() => { setInvoiceFilter(item); setInvoicePage(0); }}><Text style={styles.segmentText}>{item === 'todos' ? 'Todas' : item === 'pagado' ? 'Pagadas' : 'Sin pagar'}</Text></Pressable>)}</View>{filteredInvoices.map((invoice) => <Card key={invoice.id} title={getHouse(invoice.houseId)?.client ?? 'Cliente'} meta={`${invoice.number ?? invoice.id} - ${invoice.createdAt}`} status={invoice.paid ? 'PAGADO' : invoice.sentAt ? 'ENVIADA' : 'NO PAGADO'} tone={invoice.paid ? 'green' : 'red'}><Text style={styles.total}>${invoice.total.toFixed(2)}</Text><Actions items={[['eye-outline', '#2563eb', () => setPaymentTarget({ type: 'invoice', id: invoice.id })], ['send-outline', invoice.sentAt ? '#cbd5e1' : '#0f766e', () => void sendInvoice(invoice.id), Boolean(invoice.sentAt)], ['document-attach-outline', '#eab308', () => void shareInvoice(invoice.id).catch(error => setMessage(error.message))], ['trash-outline', '#dc2626', () => void deleteInvoice(invoice.id), Boolean(invoice.sentAt) || invoice.paid || invoice.orderIds.some((id) => Number(orders.find((order) => order.id === id)?.paidAmount ?? 0) > 0)]]} /></Card>)}{sortedInvoices.length > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 16 }}><Pressable accessibilityRole="button" disabled={invoicePageStart === 0} style={[styles.smallButton, invoicePageStart === 0 && { opacity: 0.45 }]} onPress={() => setInvoicePage((page) => Math.max(0, page - 1))}><Text style={styles.smallButtonText}>Más recientes</Text></Pressable><Text style={styles.cardMeta}>{invoicePageStart + 1}–{Math.min(invoicePageStart + 50, sortedInvoices.length)} de {sortedInvoices.length}</Text><Pressable accessibilityRole="button" disabled={invoicePageStart + 50 >= sortedInvoices.length} style={[styles.smallButton, invoicePageStart + 50 >= sortedInvoices.length && { opacity: 0.45 }]} onPress={() => setInvoicePage((page) => page + 1)}><Text style={styles.smallButtonText}>Anteriores</Text></Pressable></View>}{!filteredInvoices.length && <EmptyState text="No hay facturas para este filtro." />}</>}
        {tab === 'trabajadores' && <AdminManagement key="trabajadores" mode="trabajadores" onChanged={loadData} />}
      </ScrollView>
      <HouseModal house={editingHouse} onClose={() => setEditingHouse(null)} onSave={saveHouse} />
      <AcceptLeadModal lead={acceptingLead} onClose={() => setAcceptingLead(null)} onSave={(lead, date, note, cadence) => void acceptLeadRequest(lead, date, note, cadence)} />
      <LeadNoteModal lead={editingLeadNote} onClose={() => setEditingLeadNote(null)} onSave={(id, note) => void saveLeadNote(id, note)} />
      <PaymentModal visible={!!paymentTarget} method={paymentMethod} note={paymentNote} date={paymentDate} onDate={setPaymentDate} onMethod={setPaymentMethod} onNote={setPaymentNote} onClose={() => setPaymentTarget(null)} onSave={registerPayment} />
    </SafeAreaView>
  );
}

async function applyAvailableUpdate() {
  try {
    if (!Updates.isEnabled) return;
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch {
    // La app debe seguir funcionando aunque el servicio de updates no responda.
  }
}
function mapOrderStatus(status?: string): Status { if (status === 'completed' || status === 'FINALIZADA') return 'FINALIZADA'; if (status === 'cancelled' || status === 'CANCELADA') return 'CANCELADA'; return 'SOLICITADO'; }
function dbOrderStatus(status: Status) { return status === 'FINALIZADA' ? 'completed' : status === 'CANCELADA' ? 'cancelled' : 'scheduled'; }
function mapLeadStatus(status?: string): LeadStatus { if (status === 'scheduled') return 'scheduled'; if (status === 'completed') return 'completed'; if (status === 'cancelled') return 'cancelled'; return 'pending'; }
function leadLabel(status: LeadStatus) { return status === 'scheduled' ? 'PROGRAMADO' : status === 'completed' ? 'COMPLETADO' : status === 'cancelled' ? 'CANCELADO' : 'PENDIENTE'; }
function dbPay(method: PayMethod) { return method === 'CashApp' ? 'cash_app' : method.toLowerCase(); }
function mapCadence(cadence?: string) { return cadence === 'weekly' ? 'Cada 7 dias' : cadence === 'every_8_days' ? 'Cada 8 dias' : cadence === 'every_15_days' ? 'Cada 15 dias' : cadence === 'one_time' ? 'Una vez' : 'Cada 14 dias'; }
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
function isSpecialServiceLead(lead: Lead) {
  const value = normalizeSearch(`${lead.services} ${lead.details}`);
  if (!value.trim()) return false;
  return !/(weekly_biweekly_lawn_service|corte|cesped|lawn|yard)/.test(value);
}
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

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Pressable style={styles.smallButton} onPress={onPress}><Text style={styles.smallButtonText}>{action}</Text></Pressable>}</View>;
}
function Card({ title, meta, status, tone = 'white', children }: { title: string; meta?: string; status?: string; tone?: 'green' | 'gray' | 'red' | 'white'; children?: ReactNode }) {
  return <View style={styles.card}><View style={styles.cardHeader}><View style={styles.grow}><Text style={styles.cardTitle}>{title}</Text>{meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}</View>{status ? <StatusPill label={status} tone={tone} /> : null}</View>{children}</View>;
}
function Actions({ items }: { items: [keyof typeof Ionicons.glyphMap, string, () => void, boolean?][] }) {
  return <View style={styles.actions}>{items.map(([icon, color, onPress, disabled], index) => <IconButton key={`${icon}-${index}`} color={color} icon={icon} onPress={onPress} disabled={disabled} />)}</View>;
}
function IconButton({ color, icon, onPress, disabled }: { color: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} style={[styles.iconButton, { backgroundColor: color }]} onPress={onPress}><Ionicons name={icon} size={18} color="white" /></Pressable>; }
function StatusPill({ label, tone }: { label: string; tone: 'green' | 'gray' | 'red' | 'white' }) { return <Text style={[styles.pill, styles[`${tone}Pill`]]}>{label}</Text>; }
function HouseModal({ house, onClose, onSave }: { house: House | null; onClose: () => void; onSave: (house: House) => Promise<void> }) {
  const [draft, setDraft] = useState<House | null>(house);
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  useEffect(() => setDraft(house), [house]);
  if (!draft) return null;
  return <Modal visible={!!house} animationType="slide"><SafeAreaView style={styles.modal}><SectionTitle title="Casa / cliente" action="Cerrar" onPress={onClose} /><ScrollView contentContainerStyle={styles.content}>{(['client', 'address', 'city', 'zipCode', 'phone', 'email', 'notes'] as const).map((key) => <Field key={key} label={key} value={String(draft[key] ?? '')} multiline={key === 'notes'} onChangeText={(value) => setDraft({ ...draft, [key]: value })} />)}<Text style={styles.label}>Frecuencia</Text><View style={styles.segment}>{['Cada 7 dias','Cada 8 dias','Cada 14 dias','Cada 15 dias','Una vez'].map(value=><Pressable key={value} style={[styles.segmentButton,draft.frequency===value&&styles.segmentActive]} onPress={()=>setDraft({...draft,frequency:value})}><Text style={styles.segmentText}>{value}</Text></Pressable>)}</View><Field label="Precio" value={String(draft.price)} keyboardType="numeric" onChangeText={(price) => setDraft({ ...draft, price: Number(price) || 0 })} />{saveError!==''&&<Text accessibilityLiveRegion="polite">{saveError}</Text>}<Pressable disabled={saving} style={styles.primaryButton} onPress={async()=>{if(saving)return;setSaving(true);setSaveError('');try{await onSave(draft);}catch(error){setSaveError(error instanceof Error?error.message:'No se pudo guardar.');}finally{setSaving(false);}}}><Text style={styles.primaryText}>Guardar casa y generar orden</Text></Pressable></ScrollView></SafeAreaView></Modal>;
}
function PaymentModal({ visible, method, note, date, onDate, onMethod, onNote, onClose, onSave }: { visible: boolean; method: PayMethod; note: string; date: string; onDate: (date: string) => void; onMethod: (method: PayMethod) => void; onNote: (note: string) => void; onClose: () => void; onSave: () => void }) {
  return <Modal visible={visible} transparent animationType="fade"><View style={styles.overlay}><View style={styles.paymentBox}><SectionTitle title="Registrar pago" action="Cerrar" onPress={onClose} /><Field label="Fecha de pago (AAAA-MM-DD)" value={date} onChangeText={onDate} /><View style={styles.segment}>{(['Cash', 'CashApp', 'Venmo', 'Zelle'] as PayMethod[]).map((item) => <Pressable key={item} style={[styles.segmentButton, method === item && styles.segmentActive]} onPress={() => onMethod(item)}><Text style={styles.segmentText}>{item}</Text></Pressable>)}</View><Field label="Nota opcional" value={note} onChangeText={onNote} multiline /><Pressable style={styles.primaryButton} onPress={onSave}><Text style={styles.primaryText}>Marcar como pagado</Text></Pressable></View></View></Modal>;
}
function AcceptLeadModal({ lead, onClose, onSave }: { lead: Lead | null; onClose: () => void; onSave: (lead: Lead, date: string, note: string, cadence: 'weekly' | 'bi_weekly') => void }) {
  const [date, setDate] = useState(texasDate());
  const [note, setNote] = useState('');
  const [cadence, setCadence] = useState<'weekly' | 'bi_weekly'>('bi_weekly');
  useEffect(() => {
    setDate(texasDate());
    setNote(lead?.ownerNotes ?? '');
    setCadence('bi_weekly');
  }, [lead]);
  return <Modal visible={!!lead} animationType="slide"><SafeAreaView style={styles.modal}><SectionTitle title="Aceptar solicitud" action="Cerrar" onPress={onClose} /><ScrollView contentContainerStyle={styles.content}>{lead ? <><Card title={lead.customer} meta={lead.address} status={`$${lead.finalPrice.toFixed(2)}`} tone="green"><Text style={styles.cardMeta}>{lead.phone} · {lead.email || 'Sin correo'}</Text><Text style={styles.notes}>{lead.services}. {lead.details || 'Sin detalles adicionales'}</Text></Card><Text style={styles.label}>Fecha de inicio</Text><Calendar current={date} markedDates={{ [date]: { selected: true, selectedColor: '#15803d' } }} onDayPress={({ dateString }) => setDate(dateString)} /><Text style={styles.label}>Frecuencia</Text><View style={styles.segment}>{([{ key: 'weekly', label: 'Cada 7 dias' }, { key: 'bi_weekly', label: 'Cada 14 dias' }] as const).map((item) => <Pressable key={item.key} style={[styles.segmentButton, cadence === item.key && styles.segmentActive]} onPress={() => setCadence(item.key)}><Text style={styles.segmentText}>{item.label}</Text></Pressable>)}</View><Field label="Nota para el historial" value={note} multiline onChangeText={setNote} /><Pressable style={styles.primaryButton} onPress={() => onSave(lead, date, note.trim(), cadence)}><Text style={styles.primaryText}>Guardar en calendario</Text></Pressable></> : null}</ScrollView></SafeAreaView></Modal>;
}
function LeadNoteModal({ lead, onClose, onSave }: { lead: Lead | null; onClose: () => void; onSave: (id: string, note: string) => void }) {
  const [note, setNote] = useState('');
  useEffect(() => setNote(lead?.ownerNotes ?? ''), [lead]);
  return <Modal visible={!!lead} animationType="slide"><SafeAreaView style={styles.modal}><SectionTitle title="Notas de solicitud" action="Cerrar" onPress={onClose} /><ScrollView contentContainerStyle={styles.content}>{lead ? <><Card title={lead.customer} meta={lead.address}><Text style={styles.cardMeta}>{lead.phone} · {lead.email || 'Sin correo'}</Text><Text style={styles.notes}>{lead.services}. {lead.details || 'Sin detalles adicionales'}</Text></Card><Field label="Nota del dueño" value={note} multiline onChangeText={setNote} /><Pressable style={styles.primaryButton} onPress={() => onSave(lead.id, note.trim())}><Text style={styles.primaryText}>Guardar nota en historial</Text></Pressable></> : null}</ScrollView></SafeAreaView></Modal>;
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
  ownerNote: { color: '#14532d', backgroundColor: '#dcfce7', padding: 9, borderRadius: 8, fontWeight: '700' },
  noteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#bbf7d0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  noteButtonText: { color: '#052e16', fontWeight: '900' },
  orderOps: { gap: 9 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  actionLabels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  doneAction: { backgroundColor: '#86efac' },
  payAction: { backgroundColor: '#bbf7d0' },
  historyAction: { backgroundColor: '#2563eb' },
  cancelAction: { backgroundColor: '#e5e7eb' },
  disabledAction: { backgroundColor: '#cbd5e1', opacity: 0.7 },
  actionText: { color: '#052e16', fontWeight: '900' },
  lightActionText: { color: '#ffffff' },
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