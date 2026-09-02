-- VitalFit · Migración 2: profiles (staff) + creación automática desde auth.users

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'trainer',
  full_name   text not null,
  phone       text,
  avatar_url  text,
  specialty   text,
  hired_on    date,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- SEGURO SOLO porque el signup público está deshabilitado en Auth:
-- únicamente código con service key crea usuarios, así que app_metadata es confiable.
-- El rol se escribe en app_metadata (viaja en el JWT) y se espeja aquí.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'trainer')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
