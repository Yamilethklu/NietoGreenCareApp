import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './auth';

export const siteUrl = 'https://nietogreecare-site.vercel.app';
export async function adminRequest(path: string, method = 'GET', body?: unknown) {
  const session = (await supabase?.auth.getSession())?.data.session;
  if (!session) throw new Error('Inicia sesión nuevamente.');
  const response = await fetch(`${siteUrl}/api/admin/${path}`, { method, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo guardar. Revisa los datos y la conexión.');
  return result.data;
}

export async function shareInvoice(id: string, invoiceNumber?: string) {
  const session = (await supabase?.auth.getSession())?.data.session;
  if (!session) throw new Error('Inicia sesión nuevamente.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  const folio = invoiceNumber?.replace(/[^a-z0-9_-]/gi, '-').slice(0, 80) || id.replace(/[^a-z0-9-]/gi, '').slice(0, 8);
  const directory = new Directory(Paths.cache, `invoice-share-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  directory.create();
  const target = new File(directory, `Invoice-${folio}.pdf`);
  try {
    const file = await File.downloadFileAsync(`${siteUrl}/api/admin/operations/invoice-file?id=${encodeURIComponent(id)}`, target, { headers: { Authorization: `Bearer ${session.access_token}` } });
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Invoice' });
  } finally { if (directory.exists) directory.delete(); }
}
