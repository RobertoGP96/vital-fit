-- VitalFit · Migración 13: pagos manuales en CUP
-- Mensualidades (membresías) como flujo principal + conceptos excepcionales
-- (sesión suelta, otro). Entrenadores registran pagos de SUS clientes asignados;
-- editar/eliminar es solo del admin.

create table public.membership_plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,      -- 'Mensualidad', 'Quincena', '10 sesiones'
  description       text,
  price             numeric(12,2) not null check (price >= 0),
  currency          char(3) not null default 'CUP',
  duration_days     int not null check (duration_days > 0),
  sessions_included int check (sessions_included is null or sessions_included > 0), -- NULL = ilimitadas
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_plans_updated before update on public.membership_plans
  for each row execute function public.set_updated_at();

create table public.client_memberships (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  plan_id      uuid references public.membership_plans(id) on delete set null,
  starts_on    date not null,
  ends_on      date not null,
  price_agreed numeric(12,2) not null check (price_agreed >= 0), -- puede diferir del plan
  status       public.membership_status not null default 'activa',
  notes        text,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index idx_memberships_client on public.client_memberships (client_id, ends_on desc);
create trigger trg_memberships_updated before update on public.client_memberships
  for each row execute function public.set_updated_at();

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete restrict, -- historial financiero sobrevive
  concept       public.payment_concept not null default 'mensualidad',
  membership_id uuid references public.client_memberships(id) on delete set null, -- para concept = mensualidad
  session_id    uuid references public.sessions(id) on delete set null,           -- para concept = sesion_suelta
  amount        numeric(12,2) not null check (amount > 0),
  currency      char(3) not null default 'CUP',
  method        public.payment_method not null default 'efectivo',
  status        public.payment_status not null default 'pagado',
  paid_on       date,                    -- obligatorio cuando status = 'pagado'
  due_on        date,                    -- pendientes: de aquí se deriva 'vencido'
  period_start  date,
  period_end    date,
  reference     text,                    -- nº de referencia de transferencia
  notes         text,
  recorded_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (status <> 'pagado' or paid_on is not null),
  check (period_start is null or period_end is null or period_end >= period_start)
);
create index idx_payments_client_date on public.payments (client_id, paid_on desc);
create index idx_payments_open on public.payments (due_on) where status <> 'pagado';
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.membership_plans   enable row level security;
alter table public.client_memberships enable row level security;
alter table public.payments           enable row level security;

-- Catálogo de planes: lectura staff, escritura admin.
create policy plans_select on public.membership_plans for select to authenticated using ( true );
create policy plans_insert on public.membership_plans for insert to authenticated
  with check ( (select public.is_admin()) );
create policy plans_update on public.membership_plans for update to authenticated
  using ( (select public.is_admin()) ) with check ( (select public.is_admin()) );
create policy plans_delete on public.membership_plans for delete to authenticated
  using ( (select public.is_admin()) );

-- Membresías: leer con acceso al cliente; crear como los pagos; editar solo admin.
create policy memberships_select on public.client_memberships for select to authenticated
  using ( (select public.has_client_access(client_id)) );
create policy memberships_insert on public.client_memberships for insert to authenticated
  with check ( (select public.is_admin())
               or ((select public.has_client_access(client_id))
                   and created_by = (select auth.uid())) );
create policy memberships_update on public.client_memberships for update to authenticated
  using ( (select public.is_admin()) ) with check ( (select public.is_admin()) );
create policy memberships_delete on public.client_memberships for delete to authenticated
  using ( (select public.is_admin()) );

-- Pagos: entrenador asignado registra (queda como recorded_by); solo admin edita/borra.
create policy payments_select on public.payments for select to authenticated
  using ( (select public.has_client_access(client_id)) );
create policy payments_insert on public.payments for insert to authenticated
  with check ( (select public.is_admin())
               or ((select public.has_client_access(client_id))
                   and recorded_by = (select auth.uid())) );
create policy payments_update on public.payments for update to authenticated
  using ( (select public.is_admin()) ) with check ( (select public.is_admin()) );
create policy payments_delete on public.payments for delete to authenticated
  using ( (select public.is_admin()) );
