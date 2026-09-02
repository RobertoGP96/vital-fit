-- VitalFit · Migración 17: el trigger de columnas privilegiadas debe permitir
-- el contexto de servicio.
--
-- Bug: la Admin API (service key) ejecuta UPDATE en public.profiles con
-- auth.uid() = null → is_admin() = false → el trigger abortaba. Eso rompía:
--   · el espejo del rol tras crear cuentas (GoTrue aplica app_metadata DESPUÉS
--     del INSERT, así que handle_new_user nunca ve el rol y deja 'trainer'),
--   · promover/degradar coordinador y desactivar/reactivar cuentas,
--   · la reparación del seed del primer admin.
-- La RLS ya impide todo UPDATE a anon (políticas TO authenticated), así que
-- solo la service key o una conexión directa llegan aquí sin uid: se eximen.

create or replace function public.protect_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null
     and not public.is_admin()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Solo un administrador puede cambiar rol o estado';
  end if;
  return new;
end $$;
