-- VitalFit · Migración 7: medidas corporales (extensibles, repetibles, con unidad canónica)

-- Catálogo extensible: el admin agrega filas (brazo, pecho…), no columnas.
create table public.measurement_types (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,        -- clave estable para la app: 'peso', 'abdomen'
  name_es         text not null,               -- etiqueta UI: 'Peso', 'Abdomen'
  category        public.measurement_category not null default 'longitud',
  canonical_unit  text not null default 'cm' check (canonical_unit in ('cm', 'kg', '%')),
  sort_order      int  not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Un registro = una toma de medidas en una fecha (un submit del formulario).
create table public.measurement_records (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  measured_at  date not null default current_date,
  input_units  public.unit_system not null default 'metric', -- con qué unidades se midió ese día
  notes        text,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_mrec_client_date on public.measurement_records (client_id, measured_at desc);
create trigger trg_mrec_updated before update on public.measurement_records
  for each row execute function public.set_updated_at();

-- Valores SIEMPRE en la unidad canónica (cm/kg/%). La UI convierte (1 in = 2.54 cm).
create table public.measurement_values (
  id                  uuid primary key default gen_random_uuid(),
  record_id           uuid not null references public.measurement_records(id) on delete cascade,
  measurement_type_id uuid not null references public.measurement_types(id) on delete restrict,
  value               numeric(6,2) not null check (value > 0),
  unique (record_id, measurement_type_id)
);
create index idx_mval_type on public.measurement_values (measurement_type_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.measurement_types   enable row level security;
alter table public.measurement_records enable row level security;
alter table public.measurement_values  enable row level security;

-- Catálogo: lectura para todo staff, escritura solo admin.
create policy mtypes_select on public.measurement_types for select to authenticated using ( true );
create policy mtypes_insert on public.measurement_types for insert to authenticated
  with check ( (select public.is_admin()) );
create policy mtypes_update on public.measurement_types for update to authenticated
  using ( (select public.is_admin()) ) with check ( (select public.is_admin()) );
create policy mtypes_delete on public.measurement_types for delete to authenticated
  using ( (select public.is_admin()) );

create policy mrec_select on public.measurement_records for select to authenticated
  using ( (select public.has_client_access(client_id)) );
create policy mrec_insert on public.measurement_records for insert to authenticated
  with check ( (select public.has_client_access(client_id)) );
create policy mrec_update on public.measurement_records for update to authenticated
  using      ( (select public.has_client_access(client_id)) )
  with check ( (select public.has_client_access(client_id)) );
-- Borrar: admin, o el autor corrigiendo su propio registro.
create policy mrec_delete on public.measurement_records for delete to authenticated
  using ( (select public.is_admin())
          or (created_by = (select auth.uid()) and (select public.has_client_access(client_id))) );

-- Valores: derivan el acceso del registro padre.
create policy mval_all on public.measurement_values for all to authenticated
  using ( exists (select 1 from public.measurement_records r
                  where r.id = record_id and public.has_client_access(r.client_id)) )
  with check ( exists (select 1 from public.measurement_records r
                       where r.id = record_id and public.has_client_access(r.client_id)) );
