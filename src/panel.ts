export type Status = 'SOLICITADA' | 'FINALIZADA' | 'CANCELADA';
export type PayMethod = 'Cash' | 'CashApp' | 'Venmo' | 'Zelle';
export type House = { id: string; planId?: string; client: string; address: string; city?: string; zipCode?: string; phone: string; email: string; frequency: string; service: string; price: number; active: boolean; notes: string; firstDate?: string };
export type Order = { id: string; houseId: string; date: string; service: string; price: number; status: Status; paid: boolean; paidAmount: number; paymentMethod?: string; workerId?: string; notes?: string; invoiceId?: string };
export type Invoice = { id: string; houseId: string; createdAt: string; orderIds: string[]; items?: { orderId: string; total: number }[]; number?: string; total: number; paid: boolean; sentAt?: string | null };
export type Worker = { id: string; name: string; email: string; active: boolean };

export const STATUSES: Status[] = ['SOLICITADA', 'FINALIZADA', 'CANCELADA'];
export const PAY_METHODS: PayMethod[] = ['Cash', 'CashApp', 'Venmo', 'Zelle'];
export const PAGE_SIZE = 50;

export function dbPay(method: PayMethod) { return method === 'CashApp' ? 'cash_app' : method.toLowerCase(); }
export function payLabel(method?: string | null) {
  return method === 'cash_app' ? 'Cash App' : method === 'venmo' ? 'Venmo' : method === 'zelle' ? 'Zelle' : method === 'cash' ? 'Cash' : method ?? '';
}
export function isDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)); }
export function shiftDate(date: string, days: number) {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}
