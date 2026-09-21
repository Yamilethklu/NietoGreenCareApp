export const ALLOWED_ADMINS = ['yamilethklunder@gmail.com', 'nietogreencarellc@gmail.com'] as const;

export function isAllowedAdmin(email: string | null | undefined): boolean {
  return Boolean(email && ALLOWED_ADMINS.includes(email.trim().toLowerCase() as (typeof ALLOWED_ADMINS)[number]));
}