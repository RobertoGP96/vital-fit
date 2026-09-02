-- VitalFit · Migración 21: romper recursión infinita de RLS en agenda
--
-- Las políticas de sessions ↔ session_participants (y schedules ↔
-- schedule_participants) se referenciaban mutuamente con subconsultas
-- directas: al evaluar la política de una tabla, Postgres aplicaba el RLS de
-- la otra, que volvía a la primera → "infinite recursion detected in policy
-- for relation sessions". Resultado: NINGÚN usuario autenticado podía leer ni
-- crear sesiones u horarios.
--
-- Arreglo: las subconsultas cruzadas pasan a funciones SECURITY DEFINER
-- (leen sin RLS, mismo patrón que is_admin/has_client_access de la migración
-- 5), y las políticas se recrean usando esos helpers. La semántica de acceso
-- no cambia.

-- 21.1 Helpers para sesiones ------------------------------------------------

-- ¿Es el usuario el entrenador de la sesión?
create or replace function public.is_session_trainer(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id and s.trainer_id = (select auth.uid())
  );
$$;

-- ¿Participa en la sesión algún cliente al que el usuario tenga acceso?
create or replace function public.session_has_my_client(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.session_participants sp
    where sp.session_id = p_session_id
      and public.has_client_access(sp.client_id)
  );
$$;

-- ¿Está el cliente asignado (vigente) al entrenador de la sesión?
create or replace function public.session_trainer_has_client(
  p_session_id uuid, p_client_id uuid
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.sessions s
    join public.trainer_client_assignments a
      on a.trainer_id = s.trainer_id
     and a.client_id  = p_client_id
     and a.revoked_at is null
    where s.id = p_session_id
  );
$$;

-- 21.2 Helpers para plantillas (espejo) --------------------------------------

create or replace function public.is_schedule_trainer(p_schedule_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.schedules s
    where s.id = p_schedule_id and s.trainer_id = (select auth.uid())
  );
$$;

create or replace function public.schedule_has_my_client(p_schedule_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.schedule_participants sp
    where sp.schedule_id = p_schedule_id
      and public.has_client_access(sp.client_id)
  );
$$;

create or replace function public.schedule_trainer_has_client(
  p_schedule_id uuid, p_client_id uuid
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.schedules s
    join public.trainer_client_assignments a
      on a.trainer_id = s.trainer_id
     and a.client_id  = p_client_id
     and a.revoked_at is null
    where s.id = p_schedule_id
  );
$$;

revoke execute on function
  public.is_session_trainer(uuid), public.session_has_my_client(uuid),
  public.session_trainer_has_client(uuid, uuid),
  public.is_schedule_trainer(uuid), public.schedule_has_my_client(uuid),
  public.schedule_trainer_has_client(uuid, uuid)
  from public, anon;

grant execute on function
  public.is_session_trainer(uuid), public.session_has_my_client(uuid),
  public.session_trainer_has_client(uuid, uuid),
  public.is_schedule_trainer(uuid), public.schedule_has_my_client(uuid),
  public.schedule_trainer_has_client(uuid, uuid)
  to authenticated;

-- 21.3 Recrear políticas de plantillas ---------------------------------------

drop policy sched_select on public.schedules;
create policy sched_select on public.schedules for select to authenticated
  using ( trainer_id = (select auth.uid())
          or (select public.is_coordinator_or_admin())
          or (select public.schedule_has_my_client(id)) );

drop policy schedpart_select on public.schedule_participants;
create policy schedpart_select on public.schedule_participants for select to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or (select public.is_schedule_trainer(schedule_id)) );

drop policy schedpart_insert on public.schedule_participants;
create policy schedpart_insert on public.schedule_participants for insert to authenticated
  with check (
    ( (select public.is_coordinator_or_admin())
      and (select public.schedule_trainer_has_client(schedule_id, client_id)) )
    or
    ( (select public.is_schedule_trainer(schedule_id))
      and (select public.has_client_access(client_id)) )
  );

drop policy schedpart_delete on public.schedule_participants;
create policy schedpart_delete on public.schedule_participants for delete to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.is_schedule_trainer(schedule_id)) );

-- 21.4 Recrear políticas de sesiones -----------------------------------------

drop policy sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated
  using ( trainer_id = (select auth.uid())
          or (select public.is_coordinator_or_admin())
          or (select public.session_has_my_client(id)) );

drop policy sesspart_select on public.session_participants;
create policy sesspart_select on public.session_participants for select to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or (select public.is_session_trainer(session_id)) );

drop policy sesspart_insert on public.session_participants;
create policy sesspart_insert on public.session_participants for insert to authenticated
  with check (
    ( (select public.is_coordinator_or_admin())
      and (select public.session_trainer_has_client(session_id, client_id)) )
    or
    ( (select public.is_session_trainer(session_id))
      and (select public.has_client_access(client_id)) )
  );

drop policy sesspart_delete on public.session_participants;
create policy sesspart_delete on public.session_participants for delete to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.is_session_trainer(session_id)) );

-- 21.5 Asistencia: misma condición, vía helper (evita depender del RLS de
-- sessions dentro de la política y es más barato).

drop policy attendance_all on public.attendance_records;
create policy attendance_all on public.attendance_records for all to authenticated
  using ( (select public.is_coordinator_or_admin())
          or (select public.has_client_access(client_id))
          or (select public.is_session_trainer(session_id)) )
  with check ( (select public.is_coordinator_or_admin())
               or (select public.has_client_access(client_id))
               or (select public.is_session_trainer(session_id)) );
