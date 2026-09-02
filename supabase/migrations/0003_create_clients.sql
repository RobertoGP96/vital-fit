-- VitalFit · Migración 3: clients (registros, sin login)

create table public.clients (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  phone            text,
  email            text,                          -- solo contacto, no login
  birth_date       date,
  sex              public.sex,
  marital_status   public.marital_status,
  height_cm        numeric(5,2) check (height_cm is null or (height_cm > 0 and height_cm < 300)),
  preferred_units  public.unit_system not null default 'metric',
  emergency_contact_name  text,
  emergency_contact_phone text,
  goals            text,
  notes            text,
  is_active        boolean not null default true, -- baja = soft delete
  created_by       uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- El peso NO vive aquí: es serie temporal en measurement_values (tipo 'peso').
create index idx_clients_active_name on public.clients (full_name) where is_active;

create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();
