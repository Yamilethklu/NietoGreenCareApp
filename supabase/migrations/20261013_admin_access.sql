-- Normaliza el acceso de administradores para la app iOS.
-- No contiene claves ni secretos. Es idempotente y se puede ejecutar varias veces.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists admin_users_email_lower_key
  on public.admin_users (lower(email));

create table if not exists public.admin_profiles (
  id uuid primary key,
  email text,
  created_at timestamptz default now()
);

alter table public.admin_profiles
  add column if not exists email text,
  add column if not exists created_at timestamptz default now();

create unique index if not exists admin_profiles_email_lower_key
  on public.admin_profiles (lower(email))
  where email is not null;

alter table public.admin_users enable row level security;
alter table public.admin_profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.id = auth.uid()
       or lower(coalesce(ap.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Correos administrativos conocidos para que el panel pueda abrir en iOS.
-- Si alguno no existe todavía en auth.users, queda autorizado por email en admin_users
-- y funcionará cuando inicie sesión con ese mismo correo.
insert into public.admin_users (email, full_name, is_active)
values
  ('yamilethklunder@gmail.com', 'Yamileth Klunder', true),
  ('nietogreencare@gmail.com', 'Nieto Green Care', true),
  ('njaime0514@gmail.com', 'Jaime Nieto', true),
  ('marlenniieto@icloud.com', 'Marlen Nieto', true)
on conflict (lower(email)) do update
set is_active = excluded.is_active,
    full_name = coalesce(public.admin_users.full_name, excluded.full_name);

insert into public.admin_profiles (id, email)
select u.id, lower(u.email)
from auth.users u
where lower(u.email) in (
  'yamilethklunder@gmail.com',
  'nietogreencare@gmail.com',
  'njaime0514@gmail.com',
  'marlenniieto@icloud.com'
)
on conflict (id) do update
set email = excluded.email;
