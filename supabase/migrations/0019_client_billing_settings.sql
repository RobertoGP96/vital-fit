-- VitalFit · Migración 19: configuración de cobro por cliente + alertas de pago
-- Cada cliente lleva su "tipo de pago" (plan preferido) y período; el cobro puede
-- pausarse cuando el cliente abandona los entrenamientos (sin recordatorios) y
-- reactivarse al retomar. La vista v_billing_alerts alimenta la campana de
-- notificaciones: por vencer (≤ billing_reminder_days) y vencidos (faltan por pagar).

alter table public.clients
  add column billing_enabled       boolean not null default true,
  add column billing_plan_id       uuid references public.membership_plans(id) on delete set null,
  add column billing_period_days   int check (billing_period_days is null or billing_period_days between 1 and 366),
  add column billing_reminder_days int not null default 5
    check (billing_reminder_days between 1 and 60);

comment on column public.clients.billing_enabled is
  'false = cobro pausado (cliente que abandonó; sin recordatorios hasta retomar)';
comment on column public.clients.billing_plan_id is
  'Tipo de pago preferido del cliente (plan por defecto al renovar)';
comment on column public.clients.billing_period_days is
  'Período de pago personalizado en días; NULL = usar duration_days del plan';
comment on column public.clients.billing_reminder_days is
  'Con cuántos días de antelación avisar del vencimiento (default 5)';

create index idx_clients_billing_plan on public.clients (billing_plan_id)
  where billing_plan_id is not null;

-- Estado de cobro por cliente activo con cobro habilitado. security_invoker:
-- la RLS de clients manda (cada entrenador ve solo las alertas de SUS clientes).
create view public.v_billing_alerts with (security_invoker = true) as
select
  c.id                                             as client_id,
  c.full_name,
  c.billing_reminder_days,
  c.billing_plan_id,
  p.name                                           as plan_name,
  coalesce(c.billing_period_days, p.duration_days) as period_days,
  m.ends_on                                        as due_on,
  (m.ends_on - current_date)                       as days_left,
  case
    when m.ends_on is null                                   then 'sin_membresia'
    when m.ends_on < current_date                            then 'vencido'
    when m.ends_on - current_date <= c.billing_reminder_days then 'por_vencer'
    else 'al_dia'
  end                                              as alert_level
from public.clients c
left join public.membership_plans p on p.id = c.billing_plan_id
left join lateral (
  select cm.ends_on
  from public.client_memberships cm
  where cm.client_id = c.id
    and cm.status in ('activa', 'vencida')
  order by cm.ends_on desc
  limit 1
) m on true
where c.is_active
  and c.billing_enabled;
