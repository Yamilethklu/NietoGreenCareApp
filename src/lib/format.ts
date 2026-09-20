import type { Lead } from '@/src/types/models';
export const clientName = (lead: Lead) => lead.client_name ?? lead.name ?? 'Cliente sin nombre';
export const serviceList = (lead: Lead) => Array.isArray(lead.services) ? lead.services : lead.services?.split(',').map((item) => item.trim()) ?? [];
export const asMoney = (amount: number | string | null | undefined) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
export const dateKey = (value?: string) => value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);