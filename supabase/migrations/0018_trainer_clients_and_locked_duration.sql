-- VitalFit · Migración 18: delimitación de roles
--
--  1. El ENTRENADOR registra clientes (antes solo admin). El cliente recién
--     creado se auto-asigna a su creador (si no es admin) para que pueda verlo
--     y trabajarlo de inmediato — sin esperar al coordinador.
--  2. La duración de horarios/sesiones queda "determinada": cuando la crea un
--     entrenador se fuerza el default del tipo de sesión (o 60 min); fijarla o
--     cambiarla después es exclusivo de coordinador/admin.
--     Exentos: contexto de servicio (auth.uid() null, patrón migración 17) y
--     sesiones materializadas desde plantilla (heredan la duración del slot,
--     que ya quedó protegida al crearse la plantilla).

-- 18.1 Helper: ¿staff activo (cualquier rol)?
create or replace function public.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

revoke execute on function public.is_active_staff() from public, anon;
grant  execute on function public.is_active_staff() to authenticated;

-- 18.2 clients: INSERT para cualquier staff activo.
drop policy clients_insert on public.clients;
create policy clients_insert on public.clients for insert to authenticated
  with check ( (select public.is_active_staff()) );

-- 18.3 Auto-asignación del creador (definer: un entrenador no puede escribir
-- en trainer_client_assignments por RLS, pero ESTA vía controlada sí).
create or replace function public.auto_assign_client_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is not null
     and exists (select 1 from public.profiles p
                 where p.id = v_uid and p.is_active and p.role <> 'admin') then
    insert into public.trainer_client_assignments (trainer_id, client_id, assigned_by)
    values (v_uid, new.id, v_uid)
    on conflict (trainer_id, client_id) where revoked_at is null do nothing;
  end if;
  return new;
end $$;

create trigger trg_auto_assign_client_creator
  after insert on public.clients
  for each row execute function public.auto_assign_client_creator();

-- 18.4 Duración de plantillas: determinada por el tipo; solo coordinador/admin
-- la fijan o cambian.
create or replace function public.lock_schedule_duration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_coordinator_or_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.duration_min := coalesce(
      (select st.default_duration_min from public.session_types st
        where st.id = new.session_type_id), 60);
  elsif new.duration_min is distinct from old.duration_min then
    raise exception 'Solo el coordinador puede cambiar la duración';
  end if;
  return new;
end $$;

create trigger trg_lock_schedule_duration
  before insert or update on public.schedules
  for each row execute function public.lock_schedule_duration();

-- 18.5 Duración de sesiones: mismo criterio. Las generadas desde plantilla
-- (schedule_id) conservan la duración del slot aunque las materialice un
-- entrenador con generate_sessions.
create or replace function public.lock_session_duration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_coordinator_or_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.schedule_id is null then
      new.duration_min := coalesce(
        (select st.default_duration_min from public.session_types st
          where st.id = new.session_type_id), 60);
    end if;
  elsif new.duration_min is distinct from old.duration_min then
    raise exception 'Solo el coordinador puede cambiar la duración';
  end if;
  return new;
end $$;

create trigger trg_lock_session_duration
  before insert or update on public.sessions
  for each row execute function public.lock_session_duration();
