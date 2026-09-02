-- VitalFit · Migración 5: helpers de seguridad para RLS
-- SECURITY DEFINER STABLE: leen profiles/asignaciones sin recursión de RLS.
-- Invocarlas SIEMPRE como (select public.is_admin()) en las políticas → InitPlan
-- (una evaluación por statement, patrón documentado de Supabase).

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.is_active
  );
$$;

create or replace function public.is_coordinator_or_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'coordinator')
      and p.is_active
  );
$$;

create or replace function public.is_trainer_of(p_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.trainer_client_assignments a
    join public.profiles p on p.id = a.trainer_id
    where a.trainer_id = (select auth.uid())
      and a.client_id  = p_client_id
      and a.revoked_at is null
      and p.is_active                -- staff desactivado pierde todo de inmediato
  );
$$;

create or replace function public.has_client_access(p_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.is_trainer_of(p_client_id);
$$;

-- Cast seguro para las políticas de Storage (el path podría no ser un uuid válido).
create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

revoke execute on function
  public.is_admin(), public.is_coordinator_or_admin(),
  public.is_trainer_of(uuid), public.has_client_access(uuid), public.try_uuid(text)
  from public, anon;

grant execute on function
  public.is_admin(), public.is_coordinator_or_admin(),
  public.is_trainer_of(uuid), public.has_client_access(uuid), public.try_uuid(text)
  to authenticated;
