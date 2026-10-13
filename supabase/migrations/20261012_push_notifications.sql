-- Avisos de nuevas solicitudes: tokens de dispositivo del dueño + realtime.
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  platform text,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "admin gestiona sus tokens" on public.push_tokens;
create policy "admin gestiona sus tokens" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

-- Realtime para que la app abierta se actualice al instante.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads') then
    alter publication supabase_realtime add table public.leads;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'work_orders') then
    alter publication supabase_realtime add table public.work_orders;
  end if;
end $$;
