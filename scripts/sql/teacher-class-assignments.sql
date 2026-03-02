create table if not exists public.teacher_class_assignments (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, class_id)
);

create index if not exists teacher_class_assignments_teacher_idx
  on public.teacher_class_assignments (teacher_id);

create index if not exists teacher_class_assignments_class_idx
  on public.teacher_class_assignments (class_id);
