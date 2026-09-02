-- VitalFit · Migración 22: bloques de sesión mensuales (plan del coordinador)
--
-- Nuevo modelo de agenda: el gimnasio funciona como UN grupo. El coordinador
-- define, mes a mes, los bloques horarios del día (ej. 06:30–08:00, 08:00–10:00)
-- que se repiten TODOS los días de ese mes, y distribuye a los clientes entre
-- bloques (uno o varios por bloque). Ya no hay tipo de sesión (es general) ni
-- plantillas semanales por entrenador; schedules/session_types quedan como
-- legado sin uso en la app.
--
-- Las ocurrencias diarias se siguen materializando en `sessions` (vía
-- open_block_session) para registrar asistencia y ajustes puntuales del día.
-- Esas sesiones son del grupo: trainer_id pasa a ser opcional (NULL = grupal).

-- 22.1 Bloques del mes -------------------------------------------------------

create table public.session_blocks (
  id         uuid primary key default gen_random_uuid(),
  month      date not null check (extract(day from month) = 1), -- día 1 del mes
  start_time time not null,
  end_time   time not null,
  capacity   int check (capacity is null or capacity > 0),      -- NULL = sin límite
  is_active  boolean not null default true,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index idx_blocks_month on public.session_blocks (month, start_time);
create trigger trg_blocks_updated before update on public.session_blocks
  for each row execute function public.set_updated_at();

-- Dos bloques activos del mismo mes no pueden solaparse.
alter table public.session_blocks add constraint no_block_overlap
  exclude using gist (
    month with =,
    public.timerange(start_time, end_time) with &&
  ) where (is_active);

-- Distribución mensual: clientes que asisten a ese bloque cada día del mes.
create table public.session_block_participants (
  block_id  uuid not null references public.session_blocks(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  added_by  uuid default auth.uid() references public.profiles(id) on delete set null,
  added_at  timestamptz not null default now(),
  primary key (block_id, client_id)
);
create index idx_blockpart_client on public.session_block_participants (client_id);

-- Aforo del bloque (mismo criterio que enforce_session_capacity).
create or replace function public.enforce_block_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_capacity int;
  v_count int;
begin
  select capacity into v_capacity from public.session_blocks where id = new.block_id;
  if v_capacity is not null then
    select count(*) into v_count from public.session_block_participants
      where block_id = new.block_id;
    if v_count >= v_capacity then
      raise exception 'El bloque ya alcanzó su aforo (%).', v_capacity;
    end if;
  end if;
  return new;
end $$;

create trigger trg_block_capacity before insert on public.session_block_participants
  for each row execute function public.enforce_block_capacity();

-- 22.2 Sesiones grupales: trainer_id opcional + vínculo al bloque -------------

alter table public.sessions alter column trainer_id drop not null;
alter table public.sessions add column block_id uuid
  references public.session_blocks(id) on delete set null;
-- Un bloque produce a lo sumo una sesión por fecha.
create unique index uq_session_per_block_date
  on public.sessions (block_id, session_date) where block_id is not null;

-- ¿Es una sesión del grupo (sin entrenador fijo)?
create or replace function public.is_group_session(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id and s.trainer_id is null
  );
$$;
revoke execute on function public.is_group_session(uuid) from public, anon;
grant  execute on function public.is_group_session(uuid) to authenticated;

-- La duración de una sesión de bloque viene del rango del bloque: el trigger
-- de la migración 18 ya no debe pisarla cuando la abre un entrenador.
create or replace function public.lock_session_duration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_coordinator_or_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.schedule_id is null and new.block_id is null then
      new.duration_min := coalesce(
        (select st.default_duration_min from public.session_types st
          where st.id = new.session_type_id), 60);
    end if;
  elsif new.duration_min is distinct from old.duration_min then
    raise exception 'Solo el coordinador puede cambiar la duración';
  end if;
  return new;
end $$;

-- 22.3 RLS de bloques ---------------------------------------------------------

alter table public.session_blocks            enable row level security;
alter table public.session_block_participants enable row level security;

-- Todo el staff ve el plan del mes (el calendario es del grupo entero);
-- solo coordinador/admin lo definen.
create policy blocks_select on public.session_blocks for select to authenticated
  using ( true );
create policy blocks_insert on public.session_blocks for insert to authenticated
  with check ( (select public.is_coordinator_or_admin()) );
create policy blocks_update on public.session_blocks for update to authenticated
  using      ( (select public.is_coordinator_or_admin()) )
  with check ( (select public.is_coordinator_or_admin()) );
create policy blocks_delete on public.session_blocks for delete to authenticated
  using ( (select public.is_coordinator_or_admin()) );

create policy blockpart_select on public.session_block_participants for select to authenticated
  using ( true );
create policy blockpart_insert on public.session_block_participants for insert to authenticated
  with check ( (select public.is_coordinator_or_admin()) );
create policy blockpart_delete on public.session_block_participants for delete to authenticated
  using ( (select public.is_coordinator_or_admin()) );

-- 22.4 El calendario es del grupo: ajustar políticas existentes ---------------

-- Los nombres de TODOS los clientes deben verse en la distribución de bloques,
-- así que cualquier staff activo lee el roster (los datos hijos —medidas,
-- historia, fotos, dieta— siguen exigiendo asignación).
drop policy clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated
  using ( (select public.is_active_staff()) );

-- Sesiones del grupo (trainer_id null) visibles para todo el staff.
drop policy sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated
  using ( trainer_id is null
          or trainer_id = (select auth.uid())
          or (select public.is_coordinator_or_admin())
          or (select public.session_has_my_client(id)) );

-- Cualquier staff activo puede completar/cancelar una sesión del grupo.
drop policy sessions_update on public.sessions;
create policy sessions_update on public.sessions for update to authenticated
  using      ( (trainer_id is null and (select public.is_active_staff()))
               or trainer_id = (select auth.uid())
               or (select public.is_coordinator_or_admin()) )
  with check ( (trainer_id is null and (select public.is_active_staff()))
               or trainer_id = (select auth.uid())
               or (select public.is_coordinator_or_admin()) );

-- Participantes de sesiones del grupo: visibles para todo el staff; el ajuste
-- puntual del día lo hace el coordinador (cualquier cliente) o un entrenador
-- con acceso al cliente.
drop policy sesspart_select on public.session_participants;
create policy sesspart_select on public.session_participants for select to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or (select public.is_session_trainer(session_id))
          or (select public.is_group_session(session_id)) );

drop policy sesspart_insert on public.session_participants;
create policy sesspart_insert on public.session_participants for insert to authenticated
  with check (
    ( (select public.is_coordinator_or_admin())
      and ( (select public.is_group_session(session_id))
            or (select public.session_trainer_has_client(session_id, client_id)) ) )
    or
    ( (select public.is_session_trainer(session_id))
      and (select public.has_client_access(client_id)) )
    or
    ( (select public.is_group_session(session_id))
      and (select public.has_client_access(client_id)) )
  );

drop policy sesspart_delete on public.session_participants;
create policy sesspart_delete on public.session_participants for delete to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.is_session_trainer(session_id))
          or ( (select public.is_group_session(session_id))
               and (select public.has_client_access(client_id)) ) );

-- Asistencia: en sesiones del grupo cualquier staff activo puede pasar lista
-- (el equipo entero dirige el bloque).
drop policy attendance_all on public.attendance_records;
create policy attendance_all on public.attendance_records for all to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or (select public.is_session_trainer(session_id))
          or ( (select public.is_group_session(session_id))
               and (select public.is_active_staff()) ) )
  with check ( (select public.is_coordinator_or_admin())
               or (select public.has_client_access(client_id))
               or (select public.is_session_trainer(session_id))
               or ( (select public.is_group_session(session_id))
                    and (select public.is_active_staff()) ) );

-- 22.5 Abrir la sesión de un día concreto -------------------------------------
-- Idempotente: crea (si no existe) la ocurrencia del bloque en esa fecha y
-- copia la distribución vigente. DEFINER con validaciones propias para que
-- cualquier staff activo pueda abrirla (pasar lista, ajustar el día).

create or replace function public.open_block_session(p_block_id uuid, p_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_block public.session_blocks%rowtype;
  v_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'Solo el personal activo puede abrir sesiones';
  end if;

  select * into v_block from public.session_blocks
    where id = p_block_id and is_active;
  if not found then
    raise exception 'Bloque no encontrado o inactivo';
  end if;
  if date_trunc('month', p_date::timestamp)::date <> v_block.month then
    raise exception 'La fecha no pertenece al mes del bloque';
  end if;

  select id into v_id from public.sessions
    where block_id = p_block_id and session_date = p_date;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.sessions
      (trainer_id, block_id, session_date, start_time, duration_min, capacity, created_by)
  values (null, p_block_id, p_date, v_block.start_time,
          greatest(1, (extract(epoch from (v_block.end_time - v_block.start_time)) / 60)::int),
          v_block.capacity, (select auth.uid()))
  on conflict (block_id, session_date) where block_id is not null do nothing
  returning id into v_id;

  -- Carrera con otra apertura simultánea: ya existe, devolverla sin recopiar.
  if v_id is null then
    select id into v_id from public.sessions
      where block_id = p_block_id and session_date = p_date;
    return v_id;
  end if;

  insert into public.session_participants (session_id, client_id, added_by)
  select v_id, bp.client_id, (select auth.uid())
  from public.session_block_participants bp
  where bp.block_id = p_block_id
  on conflict (session_id, client_id) do nothing;

  return v_id;
end $$;

revoke execute on function public.open_block_session(uuid, date) from public, anon;
grant  execute on function public.open_block_session(uuid, date) to authenticated;
