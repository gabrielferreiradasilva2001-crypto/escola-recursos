-- Executar uma vez no SQL Editor do Supabase

create table if not exists public.activity_submissions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  created_by_name text not null,
  location text,
  description text not null,
  photo_name text not null,
  photo_path text not null unique,
  mime_type text,
  size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text
);

create index if not exists idx_activity_submissions_batch_id
  on public.activity_submissions (batch_id);

create index if not exists idx_activity_submissions_created_by
  on public.activity_submissions (created_by);

create index if not exists idx_activity_submissions_status
  on public.activity_submissions (status);

create index if not exists idx_activity_submissions_created_at
  on public.activity_submissions (created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-activity-photos',
  'school-activity-photos',
  false,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Compatibilidade para banco já existente
alter table public.activity_submissions
  add column if not exists location text;
