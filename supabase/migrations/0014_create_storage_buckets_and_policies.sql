-- VitalFit · Migración 14: buckets de Storage (PRIVADOS) y sus políticas
-- Convención de path: el primer segmento es el client_id → las políticas
-- reutilizan has_client_access, espejo exacto del modelo de tablas.
--   progress-photos/<client_id>/<yyyy-mm-dd>_<uuid>.webp
--   avatars/<user_id>/avatar.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- En algunos proyectos la conexión "postgres" no es owner de storage.objects
-- y CREATE POLICY falla con "must be owner". En ese caso avisamos y estas 4
-- políticas se crean a mano en Dashboard → Storage → Policies (mismas
-- expresiones). try_uuid: si el primer segmento no es uuid, deniega sin error.
do $$
begin
  create policy photos_select on storage.objects for select to authenticated
    using ( bucket_id = 'progress-photos'
            and public.has_client_access(public.try_uuid((storage.foldername(name))[1])) );

  create policy photos_insert on storage.objects for insert to authenticated
    with check ( bucket_id = 'progress-photos'
                 and public.has_client_access(public.try_uuid((storage.foldername(name))[1])) );

  create policy photos_delete on storage.objects for delete to authenticated
    using ( bucket_id = 'progress-photos'
            and ( public.is_admin()
                  or public.has_client_access(public.try_uuid((storage.foldername(name))[1])) ) );

  create policy avatars_rw on storage.objects for all to authenticated
    using ( bucket_id = 'avatars'
            and ( (storage.foldername(name))[1] = (select auth.uid())::text
                  or public.is_admin() ) )
    with check ( bucket_id = 'avatars'
                 and ( (storage.foldername(name))[1] = (select auth.uid())::text
                       or public.is_admin() ) );
exception
  when insufficient_privilege then
    raise notice 'AVISO: sin permiso para crear políticas en storage.objects. Créalas en Dashboard → Storage → Policies (ver comentarios de esta migración).';
  when duplicate_object then
    raise notice 'Políticas de storage ya existentes — saltando.';
end $$;
