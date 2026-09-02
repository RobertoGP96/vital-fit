-- VitalFit · Migración 4: asignaciones entrenador↔cliente (pivote de control de acceso)

create table public.trainer_client_assignments (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles(id) on delete cascade,
  client_id   uuid not null references public.clients(id)  on delete cascade,
  assigned_by uuid default auth.uid() references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  revoked_at  timestamptz,          -- NULL = activa; revocar = timestamp, nunca DELETE
  notes       text
);

-- Una asignación ACTIVA por (entrenador, cliente); re-asignar tras revocar está permitido.
create unique index uq_active_assignment
  on public.trainer_client_assignments (trainer_id, client_id)
  where revoked_at is null;

create index idx_assign_trainer on public.trainer_client_assignments (trainer_id) where revoked_at is null;
create index idx_assign_client  on public.trainer_client_assignments (client_id)  where revoked_at is null;
