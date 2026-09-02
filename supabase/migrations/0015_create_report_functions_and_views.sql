-- VitalFit · Migración 15: funciones de reporte, generación de sesiones y vistas
-- Todo SECURITY INVOKER (y vistas con security_invoker = true): RLS sigue mandando —
-- un entrenador consultando un cliente no asignado simplemente recibe cero filas.

-- 15.1 Serie temporal de medidas para gráficas (rango y métricas arbitrarias).
create or replace function public.get_measurement_series(
  p_client_id uuid,
  p_from date default null,
  p_to date default null,
  p_type_codes text[] default null
) returns table (
  measured_at date, type_code text, type_name text, canonical_unit text, value numeric
) language sql stable set search_path = '' as $$
  select r.measured_at, t.code, t.name_es, t.canonical_unit, v.value
  from public.measurement_records r
  join public.measurement_values v on v.record_id = r.id
  join public.measurement_types  t on t.id = v.measurement_type_id
  where r.client_id = p_client_id
    and (p_from is null or r.measured_at >= p_from)
    and (p_to   is null or r.measured_at <= p_to)
    and (p_type_codes is null or t.code = any(p_type_codes))
  order by r.measured_at, t.sort_order;
$$;

-- 15.2 Informe de evolución: primera/última/delta por métrica en el rango.
create or replace function public.get_progress_summary(
  p_client_id uuid, p_from date, p_to date
) returns table (
  type_code text, type_name text, canonical_unit text,
  first_date date, first_value numeric, last_date date, last_value numeric, delta numeric
) language sql stable set search_path = '' as $$
  with series as (
    select * from public.get_measurement_series(p_client_id, p_from, p_to, null)
  ), firsts as (
    select distinct on (type_code) type_code, type_name, canonical_unit, measured_at, value
    from series order by type_code, measured_at asc
  ), lasts as (
    select distinct on (type_code) type_code, measured_at, value
    from series order by type_code, measured_at desc
  )
  select f.type_code, f.type_name, f.canonical_unit,
         f.measured_at, f.value, l.measured_at, l.value, l.value - f.value
  from firsts f join lasts l using (type_code);
$$;

-- 15.3 Resumen de asistencia POR PARTICIPANTE, respetando su carácter opcional.
create or replace function public.get_attendance_summary(
  p_client_id uuid, p_from date, p_to date
) returns table (
  total_sessions bigint, attended bigint, missed bigint, not_tracked bigint, attendance_pct numeric
) language sql stable set search_path = '' as $$
  select count(*),
         count(*) filter (where a.attended),
         count(*) filter (where a.attended = false),
         count(*) filter (where a.id is null),
         round(100.0 * count(*) filter (where a.attended)
               / nullif(count(*) filter (where a.id is not null), 0), 1)
  from public.sessions s
  join public.session_participants sp
    on sp.session_id = s.id and sp.client_id = p_client_id
  left join public.attendance_records a
    on a.session_id = s.id and a.client_id = p_client_id
  where s.session_date between p_from and p_to
    and s.status <> 'cancelada';
$$;

-- 15.4 Materializa ocurrencias desde las plantillas activas (idempotente) y
-- copia sus participantes. INVOKER: la RLS de INSERT sigue aplicando (un
-- entrenador genera las suyas; coordinador/admin las de todos).
create or replace function public.generate_sessions(p_from date, p_to date)
returns integer language sql set search_path = '' as $$
  with new_sessions as (
    insert into public.sessions
      (trainer_id, session_type_id, schedule_id, session_date, start_time, duration_min, capacity)
    select cs.trainer_id, cs.session_type_id, cs.id, d::date, cs.start_time, cs.duration_min, cs.capacity
    from public.schedules cs
    cross join generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
    where cs.is_active
      and extract(isodow from d) = cs.weekday
      and d::date >= cs.starts_on
      and (cs.ends_on is null or d::date <= cs.ends_on)
    on conflict (schedule_id, session_date) where schedule_id is not null do nothing
    returning id, schedule_id
  ), new_participants as (
    insert into public.session_participants (session_id, client_id)
    select ns.id, sp.client_id
    from new_sessions ns
    join public.schedule_participants sp on sp.schedule_id = ns.schedule_id
    on conflict (session_id, client_id) do nothing
    returning 1
  )
  select coalesce((select count(*) from new_sessions), 0)::int;
$$;

-- 15.5 Vistas de conveniencia.
create view public.v_latest_measurements with (security_invoker = true) as
  select distinct on (r.client_id, v.measurement_type_id)
         r.client_id, t.code, t.name_es, v.value, t.canonical_unit, r.measured_at
  from public.measurement_records r
  join public.measurement_values v on v.record_id = r.id
  join public.measurement_types  t on t.id = v.measurement_type_id
  order by r.client_id, v.measurement_type_id, r.measured_at desc;

create view public.v_weekly_schedule with (security_invoker = true) as
  select cs.id, cs.weekday, cs.start_time, cs.duration_min, cs.capacity,
         cs.trainer_id, p.full_name as trainer_name,
         st.name as session_type, st.color,
         (select count(*) from public.schedule_participants sp
           where sp.schedule_id = cs.id) as participant_count
  from public.schedules cs
  join public.profiles p  on p.id = cs.trainer_id
  left join public.session_types st on st.id = cs.session_type_id
  where cs.is_active;

create view public.v_payment_overview with (security_invoker = true) as
  select c.id as client_id, c.full_name,
         m.id as membership_id, m.ends_on as membership_ends_on, m.status as membership_status,
         (m.ends_on - current_date) as days_remaining,
         lp.last_paid_on, lp.last_amount
  from public.clients c
  left join lateral (select * from public.client_memberships cm
                     where cm.client_id = c.id order by cm.ends_on desc limit 1) m on true
  left join lateral (select p.paid_on as last_paid_on, p.amount as last_amount
                     from public.payments p
                     where p.client_id = c.id and p.status = 'pagado'
                     order by p.paid_on desc limit 1) lp on true
  where c.is_active;

-- 15.6 Mantenimiento diario (DEFINER; ejecutar vía pg_cron, nunca desde clientes).
create or replace function public.refresh_payment_statuses()
returns void language sql security definer set search_path = '' as $$
  update public.payments set status = 'vencido'
    where status = 'pendiente' and due_on is not null and due_on < current_date;
  update public.client_memberships set status = 'vencida'
    where status = 'activa' and ends_on < current_date;
$$;
revoke execute on function public.refresh_payment_statuses() from public, anon, authenticated;

-- Programación (requiere extensión pg_cron habilitada en el proyecto; ejecutar aparte):
--   select cron.schedule('vitalfit-refresh-payments', '10 3 * * *',
--                        $cron$select public.refresh_payment_statuses()$cron$);
