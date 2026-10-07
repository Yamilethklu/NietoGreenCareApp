import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { supabase } from '../../services/auth';

type Property = { id: string; customer_name: string | null; customer_phone: string | null; address: string | null; selected_services: string[] | null };
type WorkOrder = { id: string; service_date: string | null; status: string | null; price: number | null; paid_amount: number | null; notes: string | null };
type WorkInvoice = { id: string; order_id: string; invoice_number: string; issued_at: string | null; total: number | null };
type PropertyInvoice = { id: string; number: string; date: string; total: number; orderIds: string[]; paid: boolean };

const button = { backgroundColor: '#15803d', padding: 12, borderRadius: 8, marginTop: 8 } as const;
const card = { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 10, gap: 6 } as const;

export default function PropertyHistoryScreen() {
  const { propertyId: rawPropertyId } = useLocalSearchParams<{ propertyId: string | string[] }>();
  const propertyId = Array.isArray(rawPropertyId) ? rawPropertyId[0] : rawPropertyId;
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [invoices, setInvoices] = useState<PropertyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadPropertyHistory() {
      setLoading(true);
      setError('');
      try {
        if (!propertyId || !supabase) throw new Error('No se pudo cargar el historial de esta propiedad.');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) throw new Error('Inicia sesión para ver este historial.');
        const { data: propertyData, error: propertyError } = await supabase
          .from('leads')
          .select('id,customer_name,customer_phone,address,selected_services')
          .eq('id', propertyId)
          .maybeSingle();
        if (propertyError) throw propertyError;
        if (!propertyData) throw new Error('No se encontró esta propiedad.');
        const { data: orderData, error: orderError } = await supabase
          .from('work_orders')
          .select('id,service_date,status,price,paid_amount,notes')
          .eq('lead_id', propertyId)
          .order('service_date', { ascending: false });
        if (orderError) throw orderError;
        const propertyOrders = (orderData ?? []) as WorkOrder[];
        const orderIds = propertyOrders.map((order) => order.id);
        let propertyInvoices: WorkInvoice[] = [];
        if (orderIds.length) {
          const { data: invoiceData, error: invoiceError } = await supabase
            .from('work_invoices')
            .select('id,order_id,invoice_number,issued_at,total')
            .in('order_id', orderIds)
            .order('issued_at', { ascending: false });
          if (invoiceError) throw invoiceError;
          propertyInvoices = (invoiceData ?? []) as WorkInvoice[];
        }
        const orderById = new Map(propertyOrders.map((order) => [order.id, order]));
        const grouped = new Map<string, WorkInvoice[]>();
        for (const invoice of propertyInvoices) {
          const key = invoice.invoice_number.startsWith('NGC-G-') ? invoice.invoice_number.split('/')[0] : invoice.invoice_number;
          grouped.set(key, [...(grouped.get(key) ?? []), invoice]);
        }
        if (!active) return;
        setProperty(propertyData as Property);
        setOrders(propertyOrders);
        setInvoices([...grouped.entries()].map(([number, rows]) => ({
          id: rows[0].id,
          number,
          date: String(rows[0].issued_at ?? '').slice(0, 10),
          total: rows.reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0),
          orderIds: rows.map((invoice) => invoice.order_id),
          paid: rows.every((invoice) => {
            const order = orderById.get(invoice.order_id);
            return Number(order?.paid_amount ?? 0) >= Number(invoice.total ?? 0);
          }),
        })));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPropertyHistory();
    return () => { active = false; };
  }, [propertyId]);

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Pressable style={button} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Volver al historial general</Text></Pressable>
      {loading ? <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#15803d" /> : error ? <Text accessibilityRole="alert" style={{ marginTop: 18, color: '#991b1b' }}>{error}</Text> : property ? <>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#14532d', marginTop: 18 }}>{property.address || 'Dirección no disponible'}</Text>
        <Text style={{ color: '#334155', marginTop: 6 }}>{property.customer_name || 'Cliente'} · {property.customer_phone || 'Sin teléfono'}</Text>
        {property.selected_services?.length ? <Text style={{ color: '#475569', marginTop: 4 }}>{property.selected_services.join(', ')}</Text> : null}
        <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 22 }}>Órdenes de trabajo</Text>
        {orders.length ? orders.map((order) => <View key={order.id} style={card}>
          <Text style={{ fontWeight: '800', color: '#0f172a' }}>{order.service_date?.slice(0, 10) || 'Sin fecha'} · {order.status || 'Sin estado'}</Text>
          <Text>Precio: ${Number(order.price ?? 0).toFixed(2)} · Pagado: ${Number(order.paid_amount ?? 0).toFixed(2)}</Text>
          {order.notes ? <Text>{order.notes}</Text> : null}
        </View>) : <Text style={{ color: '#64748b', marginTop: 8 }}>No hay órdenes para esta propiedad.</Text>}
        <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 22 }}>Invoices</Text>
        {invoices.length ? invoices.map((invoice) => <View key={invoice.id} style={card}>
          <Text style={{ fontWeight: '800', color: '#0f172a' }}>{invoice.number} · {invoice.date || 'Sin fecha'}</Text>
          <Text>Total: ${invoice.total.toFixed(2)} · {invoice.paid ? 'Pagada' : 'Pendiente'}</Text>
        </View>) : <Text style={{ color: '#64748b', marginTop: 8 }}>No hay invoices para esta propiedad.</Text>}
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}
