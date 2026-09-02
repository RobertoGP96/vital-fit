-- VitalFit · Migración 6: RLS de las tablas núcleo
-- Todas las políticas son TO authenticated: anon no tiene acceso a NADA.

alter table public.profiles                   enable row level security;
alter table public.clients                    enable row level security;
alter table public.trainer_client_assignments enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────
-- Cualquier staff activo ve a colegas activos (necesario para listas/agendas);
-- perfiles inactivos solo los ve el admin y el propio usuario.
create policy profiles_select on public.profiles for select to authenticated
  using ( is_active or id = (select auth.uid()) or (select public.is_admin()) );

-- El alta normal es vía trigger handle_new_user (definer, ignora RLS).
create policy profiles_insert_admin on public.profiles for insert to authenticated
  with check ( (select public.is_admin()) );

create policy profiles_update on public.profiles for update to authenticated
  using      ( id = (select auth.uid()) or (select public.is_admin()) )
  with check ( id = (select auth.uid()) or (select public.is_admin()) );

create policy profiles_delete_admin on public.profiles for delete to authenticated
  using ( (select public.is_admin()) );

-- RLS es por fila, no por columna: este trigger impide que un no-admin
-- cambie role/is_active (de sí mismo o de otros) aunque pueda editar su perfil.
create or replace function public.protect_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Solo un administrador puede cambiar rol o estado';
  end if;
  return new;
end $$;

create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_privileged_cols();

-- ── clients ──────────────────────────────────────────────────────────────
-- El coordinador ve el roster completo (necesita asignar), pero los datos
-- hijos (medidas, historia, fotos, dieta) siguen exigiendo asignación.
create policy clients_select on public.clients for select to authenticated
  using ( (select public.has_client_access(id)) or (select public.is_coordinator_or_admin()) );

create policy clients_insert on public.clients for insert to authenticated
  with check ( (select public.is_admin()) );

create policy clients_update on public.clients for update to authenticated
  using      ( (select public.has_client_access(id)) )
  with check ( (select public.has_client_access(id)) );

create policy clients_delete on public.clients for delete to authenticated
  using ( (select public.is_admin()) );

-- ── trainer_client_assignments ───────────────────────────────────────────
-- Escritura: admin y coordinador (puede asignar a cualquiera, incluido él mismo).
create policy assign_select on public.trainer_client_assignments for select to authenticated
  using ( trainer_id = (select auth.uid()) or (select public.is_coordinator_or_admin()) );

create policy assign_insert on public.trainer_client_assignments for insert to authenticated
  with check ( (select public.is_coordinator_or_admin()) );

create policy assign_update on public.trainer_client_assignments for update to authenticated
  using      ( (select public.is_coordinator_or_admin()) )
  with check ( (select public.is_coordinator_or_admin()) );

create policy assign_delete on public.trainer_client_assignments for delete to authenticated
  using ( (select public.is_admin()) );
