alter table if exists public.material_deliveries
  add column if not exists school_id uuid references public.schools(id) on delete set null,
  add column if not exists recipient_teacher_id uuid references public.teachers(id) on delete set null,
  add column if not exists recipient_student_id uuid references public.students(id) on delete set null;

create index if not exists material_deliveries_school_idx on public.material_deliveries (school_id);
create index if not exists material_deliveries_teacher_idx on public.material_deliveries (recipient_teacher_id);
create index if not exists material_deliveries_student_idx on public.material_deliveries (recipient_student_id);
