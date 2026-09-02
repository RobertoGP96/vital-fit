-- VitalFit · Migración 9: historia clínica (patologías, lesiones, notas)
-- Datos de salud: el modelo de asignación ya los restringe a entrenadores
-- asignados + admin. El coordinador NO los ve sin asignación.

create table public.medical_records (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  record_type  public.medical_record_type not null default 'nota_clinica',
  title        text not null,          -- 'Hipertensión', 'Lesión de rodilla'
  description  text,
  diagnosed_on date,
  is_current   boolean not null default true,  -- condición activa vs histórica
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_medical_client on public.medical_records (client_id, is_current);
create trigger trg_medical_updated before update on public.medical_records
  for each row execute function public.set_updated_at();

alter table public.medical_records enable row level security;

create policy medical_select on public.medical_records for select to authenticated
  using ( (select public.has_client_access(client_id)) );
create policy medical_insert on public.medical_records for insert to authenticated
  with check ( (select public.has_client_access(client_id)) );
create policy medical_update on public.medical_records for update to authenticated
  using      ( (select public.has_client_access(client_id)) )
  with check ( (select public.has_client_access(client_id)) );
-- Datos clínicos: borrado solo admin.
create policy medical_delete on public.medical_records for delete to authenticated
  using ( (select public.is_admin()) );
