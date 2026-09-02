-- VitalFit · Migración 11: horarios y sesiones (individuales y GRUPALES)
-- Modelo: schedules = plantilla semanal del entrenador (slot); sessions = ocurrencias.
-- Los clientes asistentes viven en tablas de participantes (1 fila = individual,
-- varias = grupal). Fecha/hora locales del gimnasio (date + time, sin timezone).

create table public.session_types (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null unique,   -- 'Fuerza', 'Funcional', 'Valoración'
  description          text,
  default_duration_min int not null default 60 check (default_duration_min > 0),
  color                text,                   -- hex para la agenda, ej. '#17C964'
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);

-- Plantilla semanal recurrente del ENTRENADOR (weekday ISO: 1 = lunes).
create table public.schedules (
  id              uuid primary key default gen_random_uuid(),
  trainer_id      uuid not null references public.profiles(id) on delete restrict,
  session_type_id uuid references public.session_types(id) on delete set null,
  weekday         smallint not null check (weekday between 1 and 7),
  start_time      time not null,
  duration_min    int not null default 60 check (duration_min > 0),
  capacity        int check (capacity is null or capacity > 0),  -- NULL = sin límite
  starts_on       date not null default current_date,
  ends_on         date,
  is_active       boolean not null default true,
  created_by      uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index idx_sched_trainer on public.schedules (trainer_id, weekday) where is_active;
create trigger trg_sched_updated before update on public.schedules
  for each row execute function public.set_updated_at();

-- Un entrenador no puede tener dos slots activos solapados el mismo día.
alter table public.schedules add constraint no_trainer_overlap
  exclude using gist (
    trainer_id with =,
    weekday    with =,
    public.timerange(start_time, start_time + make_interval(mins => duration_min)) with &&
  ) where (is_active);

-- Clientes que asisten recurrentemente a un slot.
create table public.schedule_participants (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  added_by    uuid default auth.uid() references public.profiles(id) on delete set null,
  added_at    timestamptz not null default now(),
  primary key (schedule_id, client_id)
);
create index idx_schedpart_client on public.schedule_participants (client_id);

-- Ocurrencias materializadas (desde plantilla vía generate_sessions, o ad-hoc).
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  trainer_id      uuid not null references public.profiles(id) on delete restrict,
  session_type_id uuid references public.session_types(id) on delete set null,
  schedule_id     uuid references public.schedules(id) on delete set null,
  session_date    date not null,
  start_time      time not null,
  duration_min    int not null default 60 check (duration_min > 0),
  capacity        int check (capacity is null or capacity > 0),
  status          public.session_status not null default 'programada',
  notes           text,
  created_by      uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Generación idempotente: una plantilla produce a lo sumo una sesión por fecha.
create unique index uq_session_per_schedule_date
  on public.sessions (schedule_id, session_date) where schedule_id is not null;
create index idx_sessions_trainer_date on public.sessions (trainer_id, session_date);
create index idx_sessions_date on public.sessions (session_date);
create trigger trg_sessions_updated before update on public.sessions
  for each row execute function public.set_updated_at();

-- Asistentes de una sesión concreta.
create table public.session_participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  added_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  added_at   timestamptz not null default now(),
  primary key (session_id, client_id)
);
create index idx_sesspart_client on public.session_participants (client_id);

-- Aforo: no exceder capacity (si está definida).
create or replace function public.enforce_session_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_capacity int;
  v_count int;
begin
  select capacity into v_capacity from public.sessions where id = new.session_id;
  if v_capacity is not null then
    select count(*) into v_count from public.session_participants
      where session_id = new.session_id;
    if v_count >= v_capacity then
      raise exception 'La sesión ya alcanzó su capacidad (%).', v_capacity;
    end if;
  end if;
  return new;
end $$;

create trigger trg_session_capacity before insert on public.session_participants
  for each row execute function public.enforce_session_capacity();

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.session_types        enable row level security;
alter table public.schedules            enable row level security;
alter table public.schedule_participants enable row level security;
alter table public.sessions             enable row level security;
alter table public.session_participants enable row level security;

-- Catálogo de tipos: lectura staff, escritura admin.
create policy stypes_select on public.session_types for select to authenticated using ( true );
create policy stypes_insert on public.session_types for insert to authenticated
  with check ( (select public.is_admin()) );
create policy stypes_update on public.session_types for update to authenticated
  using ( (select public.is_admin()) ) with check ( (select public.is_admin()) );
create policy stypes_delete on public.session_types for delete to authenticated
  using ( (select public.is_admin()) );

-- Plantillas: cada entrenador gestiona las suyas; coordinador/admin planifican las de todos.
create policy sched_select on public.schedules for select to authenticated
  using ( trainer_id = (select auth.uid())
          or (select public.is_coordinator_or_admin())
          or exists (select 1 from public.schedule_participants sp
                     where sp.schedule_id = schedules.id
                       and public.has_client_access(sp.client_id)) );
create policy sched_insert on public.schedules for insert to authenticated
  with check ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) );
create policy sched_update on public.schedules for update to authenticated
  using      ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) )
  with check ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) );
create policy sched_delete on public.schedules for delete to authenticated
  using ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) );

-- Participantes de plantilla: el dueño agrega SUS clientes asignados;
-- coordinador/admin agregan clientes asignados al entrenador del slot.
create policy schedpart_select on public.schedule_participants for select to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or exists (select 1 from public.schedules s
                     where s.id = schedule_id and s.trainer_id = (select auth.uid())) );
create policy schedpart_insert on public.schedule_participants for insert to authenticated
  with check (
    ( (select public.is_coordinator_or_admin())
      and exists (select 1 from public.schedules s
                  join public.trainer_client_assignments a
                    on a.trainer_id = s.trainer_id and a.client_id = schedule_participants.client_id
                   and a.revoked_at is null
                  where s.id = schedule_id) )
    or
    ( exists (select 1 from public.schedules s
              where s.id = schedule_id and s.trainer_id = (select auth.uid()))
      and (select public.has_client_access(client_id)) )
  );
create policy schedpart_delete on public.schedule_participants for delete to authenticated
  using ( (select public.is_coordinator_or_admin())
          or exists (select 1 from public.schedules s
                     where s.id = schedule_id and s.trainer_id = (select auth.uid())) );

-- Sesiones: mismo patrón que plantillas.
create policy sessions_select on public.sessions for select to authenticated
  using ( trainer_id = (select auth.uid())
          or (select public.is_coordinator_or_admin())
          or exists (select 1 from public.session_participants sp
                     where sp.session_id = sessions.id
                       and public.has_client_access(sp.client_id)) );
create policy sessions_insert on public.sessions for insert to authenticated
  with check ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) );
create policy sessions_update on public.sessions for update to authenticated
  using      ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) )
  with check ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) );
create policy sessions_delete on public.sessions for delete to authenticated
  using ( (select public.is_admin())
          or trainer_id = (select auth.uid())
          or (select public.is_coordinator_or_admin()) );

-- Participantes de sesión: espejo de schedule_participants.
create policy sesspart_select on public.session_participants for select to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or exists (select 1 from public.sessions s
                     where s.id = session_id and s.trainer_id = (select auth.uid())) );
create policy sesspart_insert on public.session_participants for insert to authenticated
  with check (
    ( (select public.is_coordinator_or_admin())
      and exists (select 1 from public.sessions s
                  join public.trainer_client_assignments a
                    on a.trainer_id = s.trainer_id and a.client_id = session_participants.client_id
                   and a.revoked_at is null
                  where s.id = session_id) )
    or
    ( exists (select 1 from public.sessions s
              where s.id = session_id and s.trainer_id = (select auth.uid()))
      and (select public.has_client_access(client_id)) )
  );
create policy sesspart_delete on public.session_participants for delete to authenticated
  using ( (select public.is_coordinator_or_admin())
          or exists (select 1 from public.sessions s
                     where s.id = session_id and s.trainer_id = (select auth.uid())) );
