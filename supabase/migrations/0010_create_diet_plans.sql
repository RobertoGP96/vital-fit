-- VitalFit · Migración 10: planes/notas de dieta

create table public.diet_plans (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  title           text not null,
  content         text,               -- cuerpo en markdown
  starts_on       date,
  ends_on         date,
  is_active       boolean not null default true,
  attachment_path text,               -- futuro: PDF en bucket 'documents'
  created_by      uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
create index idx_diet_client on public.diet_plans (client_id) where is_active;
create trigger trg_diet_updated before update on public.diet_plans
  for each row execute function public.set_updated_at();

alter table public.diet_plans enable row level security;

create policy diet_select on public.diet_plans for select to authenticated
  using ( (select public.has_client_access(client_id)) );
create policy diet_insert on public.diet_plans for insert to authenticated
  with check ( (select public.has_client_access(client_id)) );
create policy diet_update on public.diet_plans for update to authenticated
  using      ( (select public.has_client_access(client_id)) )
  with check ( (select public.has_client_access(client_id)) );
create policy diet_delete on public.diet_plans for delete to authenticated
  using ( (select public.is_admin()) );
