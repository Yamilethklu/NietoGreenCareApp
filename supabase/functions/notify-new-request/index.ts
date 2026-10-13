// Envía una notificación push al dueño cada vez que entra una solicitud nueva.
// Se dispara con Database Webhooks (INSERT en public.leads y public.work_orders).
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 });
  const payload = await request.json();
  if (payload.type !== 'INSERT') return Response.json({ skipped: 'not insert' });

  const record = payload.record ?? {};
  let body = '';
  if (payload.table === 'leads') {
    body = `${record.customer_name ?? 'Cliente'} · ${record.address ?? ''}`.trim();
  } else if (payload.table === 'work_orders') {
    // Las visitas recurrentes generadas por el sistema (plan_id) no son solicitudes nuevas.
    if (record.plan_id) return Response.json({ skipped: 'recurring visit' });
    const { data: lead } = await admin.from('leads').select('customer_name,address').eq('id', record.lead_id).maybeSingle();
    body = `${lead?.customer_name ?? 'Cliente'} · ${lead?.address ?? ''} · ${record.service_date ?? ''}`.trim();
  } else {
    return Response.json({ skipped: 'unknown table' });
  }

  const { data: rows, error } = await admin.from('push_tokens').select('token').eq('role', 'admin');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const tokens = (rows ?? []).map((row) => row.token as string);
  if (!tokens.length) return Response.json({ sent: 0 });

  const messages = tokens.map((to) => ({ to, title: 'Nueva solicitud', body, sound: 'default', channelId: 'new-requests', data: { screen: 'solicitudes' } }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await response.json().catch(() => ({}));

  // Quita tokens de dispositivos que ya no existen.
  const dead = (result.data ?? []).map((ticket: any, index: number) => (ticket?.details?.error === 'DeviceNotRegistered' ? tokens[index] : null)).filter(Boolean);
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);

  return Response.json({ sent: tokens.length - dead.length });
});
