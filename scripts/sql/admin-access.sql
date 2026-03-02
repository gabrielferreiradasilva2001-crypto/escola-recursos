-- Executar no SQL Editor do Supabase

create table if not exists public.admin_access (
  user_id uuid primary key,
  allowed_periods text[] not null default '{}'::text[],
  allowed_locations text[] not null default '{}'::text[],
  default_period text,
  default_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists idx_admin_access_default_period
  on public.admin_access (default_period);

create index if not exists idx_admin_access_default_location
  on public.admin_access (default_location);

-- Se a tabela admins ainda não existir no seu projeto:
create table if not exists public.admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

-- Trigger opcional para updated_at
create or replace function public.set_admin_access_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_access_updated_at on public.admin_access;
create trigger trg_admin_access_updated_at
before update on public.admin_access
for each row
execute function public.set_admin_access_updated_at();

