-- VitalFit · Migración 26: límite de sesiones diarias por cliente
--
-- Cada cliente tiene un máximo de sesiones por día (por defecto 1) que fija
-- el coordinador o su entrenador desde la ficha. La regla se aplica en los
-- dos puntos donde se eligen clientes:
--   · Plan del mes: cada bloque activo equivale a una sesión diaria, así que
--     un cliente no puede estar distribuido en más bloques activos de un mes
--     que su límite.
--   · Ajuste del día: al sumarlo a una sesión concreta se cuentan las
--     sesiones no canceladas que ya tiene esa fecha (programadas o
--     completadas) más los bloques activos aún sin sesión abierta; si llegó
--     al límite, no entra.
-- Los mensajes de los triggers están pensados para mostrarse tal cual en la UI.

alter table public.clients add column max_daily_sessions int not null default 1
  check (max_daily_sessions between 1 and 10);

-- Sesiones comprometidas del cliente en una fecha: materializadas no
-- canceladas (menos la excluida) + bloques activos del mes donde está
-- distribuido y cuya sesión de ese día aún no se abrió.
create or replace function public.client_sessions_on(
  p_client_id uuid, p_date date, p_exclude_session uuid default null
) returns int language sql stable security definer set search_path = '' as $$
  select (
    select count(*) from public.session_participants sp
    join public.sessions s on s.id = sp.session_id
    where sp.client_id = p_client_id
      and s.session_date = p_date
      and s.status <> 'cancelada'
      and (p_exclude_session is null or s.id <> p_exclude_session)
  )::int
  + (
    select count(*) from public.session_block_participants bp
    join public.session_blocks b on b.id = bp.block_id
    where bp.client_id = p_client_id
      and b.is_active
      and b.month = date_trunc('month', p_date::timestamp)::date
      and not exists (select 1 from public.sessions s2
                      where s2.block_id = b.id and s2.session_date = p_date)
  )::int;
$$;
revoke execute on function public.client_sessions_on(uuid, date, uuid) from public, anon;
grant  execute on function public.client_sessions_on(uuid, date, uuid) to authenticated;

-- Ajuste del día: no sumar a una sesión a quien ya llegó a su límite.
create or replace function public.enforce_client_daily_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_date date;
  v_status public.session_status;
  v_max int;
  v_name text;
begin
  select session_date, status into v_date, v_status
    from public.sessions where id = new.session_id;
  if v_date is null or v_status = 'cancelada' then
    return new;
  end if;
  select max_daily_sessions, full_name into v_max, v_name
    from public.clients where id = new.client_id;
  if public.client_sessions_on(new.client_id, v_date, new.session_id)
       >= coalesce(v_max, 1) then
    raise exception '«%» ya alcanzó su límite de % sesión(es) ese día.',
      coalesce(v_name, 'El cliente'), coalesce(v_max, 1);
  end if;
  return new;
end $$;

create trigger trg_client_daily_limit before insert on public.session_participants
  for each row execute function public.enforce_client_daily_limit();

-- Plan del mes: no distribuir en más bloques activos que el límite diario.
create or replace function public.enforce_client_block_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_month date;
  v_max int;
  v_name text;
  v_used int;
begin
  select month into v_month from public.session_blocks where id = new.block_id;
  if v_month is null then
    return new;
  end if;
  select max_daily_sessions, full_name into v_max, v_name
    from public.clients where id = new.client_id;
  select count(*) into v_used
    from public.session_block_participants bp
    join public.session_blocks b on b.id = bp.block_id
    where bp.client_id = new.client_id
      and b.month = v_month
      and b.is_active
      and b.id <> new.block_id;
  if v_used >= coalesce(v_max, 1) then
    raise exception '«%» ya está en % bloque(s) del mes y su límite es % sesión(es) al día.',
      coalesce(v_name, 'El cliente'), v_used, coalesce(v_max, 1);
  end if;
  return new;
end $$;

create trigger trg_client_block_limit before insert on public.session_block_participants
  for each row execute function public.enforce_client_block_limit();

-- Abrir la sesión del día: la copia de la distribución respeta el límite.
-- Si un cliente quedó sobre-distribuido (le bajaron el límite después de
-- repartir el mes), se omite de esta sesión en lugar de impedir abrirla;
-- entrará en el bloque que le quede dentro de su cupo.
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
  join public.clients c on c.id = bp.client_id
  where bp.block_id = p_block_id
    and public.client_sessions_on(bp.client_id, p_date, v_id) < c.max_daily_sessions
  on conflict (session_id, client_id) do nothing;

  return v_id;
end $$;
