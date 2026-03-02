create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  class_name text,
  name text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists students_school_idx on public.students (school_id);
create index if not exists students_class_idx on public.students (class_id);
create index if not exists students_active_idx on public.students (active);
create index if not exists students_name_idx on public.students (name);
