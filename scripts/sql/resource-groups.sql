create extension if not exists pgcrypto;

create table if not exists public.resource_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.school_resource_groups (
  school_id uuid not null references public.schools(id) on delete cascade,
  group_id uuid not null references public.resource_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (school_id, group_id)
);

create index if not exists idx_school_resource_groups_group_id
  on public.school_resource_groups(group_id);
