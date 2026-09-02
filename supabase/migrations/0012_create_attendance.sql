-- VitalFit · Migración 12: asistencia OPCIONAL, por participante
-- Sin fila = "no se registró" (perfectamente válido). En una sesión grupal se
-- marca a cada cliente por separado — o a ninguno. Nunca es obligatoria.

create table public.attendance_records (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  attended      boolean not null,
  checked_in_at timestamptz,
  notes         text,
  recorded_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (session_id, client_id)
);
create index idx_attendance_client on public.attendance_records (client_id);

alter table public.attendance_records enable row level security;

-- Gestión: entrenador de la sesión, coordinador o admin; también un entrenador
-- asignado al cliente (p. ej. registró la asistencia de su cliente en una grupal ajena).
create policy attendance_all on public.attendance_records for all to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or exists (select 1 from public.sessions s
                     where s.id = session_id and s.trainer_id = (select auth.uid())) )
  with check ( (select public.is_coordinator_or_admin())
               or (select public.has_client_access(client_id))
               or exists (select 1 from public.sessions s
                          where s.id = session_id and s.trainer_id = (select auth.uid())) );
