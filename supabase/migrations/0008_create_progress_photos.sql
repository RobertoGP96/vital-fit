-- VitalFit · Migración 8: fotos de progreso (metadatos; binarios en Storage)

create table public.progress_photos (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  storage_path text not null unique,   -- '<client_id>/<yyyy-mm-dd>_<uuid>.webp' en bucket progress-photos
  pose         public.photo_pose not null default 'frente',
  taken_on     date not null default current_date,
  notes        text,
  uploaded_by  uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_photos_client_date on public.progress_photos (client_id, taken_on desc);

alter table public.progress_photos enable row level security;

create policy photos_select on public.progress_photos for select to authenticated
  using ( (select public.has_client_access(client_id)) );
create policy photos_insert on public.progress_photos for insert to authenticated
  with check ( (select public.has_client_access(client_id)) );
create policy photos_update on public.progress_photos for update to authenticated
  using      ( (select public.has_client_access(client_id)) )
  with check ( (select public.has_client_access(client_id)) );
create policy photos_delete on public.progress_photos for delete to authenticated
  using ( (select public.is_admin())
          or (uploaded_by = (select auth.uid()) and (select public.has_client_access(client_id))) );
