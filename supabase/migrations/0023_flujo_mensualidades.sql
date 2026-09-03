-- VitalFit · Migración 23: flujo de mensualidades legible y en un solo sitio
--
-- Modelo mental único: cada cliente tiene una COBERTURA ("cubierto hasta") que
-- se extiende al cobrar. Cobrar una mensualidad es UNA operación atómica
-- (cobrar_mensualidad) que crea el período y el recibo juntos, derivando fechas
-- e importe de la configuración de cobro del cliente. El estado del cliente
-- (pausado / sin_mensualidad / vencido / por_vencer / al_dia) vive en UNA sola
-- vista (v_mensualidades) que leen la campana, el panel, /pagos y la ficha.
--
-- Sustituye a v_billing_alerts (0019) y v_payment_overview (0015), que
-- derivaban el vencimiento con criterios distintos cada una.

-- 23.1 Cobro atómico de mensualidad. SECURITY INVOKER: la RLS de inserción de
-- client_memberships y payments sigue mandando (el entrenador solo cobra a sus
-- clientes; created_by/recorded_by = auth.uid() por default de columna).
create or replace function public.cobrar_mensualidad(
  p_client_id uuid,
  p_amount    numeric,
  p_method    public.payment_method default 'efectivo',
  p_paid_on   date default current_date,
  p_reference text default null,
  p_notes     text default null
) returns table (payment_id uuid, period_start date, period_end date)
language plpgsql
set search_path = ''
as $$
declare
  v_cfg            record;
  v_cubierto_hasta date;
  v_periodo_dias   int;
  v_starts         date;
  v_ends           date;
  v_membership_id  uuid;
  v_payment_id     uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El importe debe ser mayor que cero';
  end if;

  -- Bajo RLS, un cliente ajeno simplemente no aparece.
  select c.billing_plan_id, c.billing_period_days, c.billing_enabled,
         p.duration_days
    into v_cfg
  from public.clients c
  left join public.membership_plans p on p.id = c.billing_plan_id
  where c.id = p_client_id;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  v_periodo_dias := coalesce(v_cfg.billing_period_days, v_cfg.duration_days, 30);

  select max(cm.ends_on) into v_cubierto_hasta
  from public.client_memberships cm
  where cm.client_id = p_client_id
    and cm.status in ('activa', 'vencida');

  -- El nuevo período continúa la cobertura vigente; si ya venció (o no hay),
  -- empieza el día del cobro.
  if v_cubierto_hasta is not null and v_cubierto_hasta >= p_paid_on then
    v_starts := v_cubierto_hasta + 1;
  else
    v_starts := p_paid_on;
  end if;
  v_ends := v_starts + v_periodo_dias - 1;

  insert into public.client_memberships
    (client_id, plan_id, starts_on, ends_on, price_agreed, status)
  values
    (p_client_id, v_cfg.billing_plan_id, v_starts, v_ends, p_amount, 'activa')
  returning id into v_membership_id;

  insert into public.payments
    (client_id, concept, membership_id, amount, method, status,
     paid_on, period_start, period_end, reference, notes)
  values
    (p_client_id, 'mensualidad', v_membership_id, p_amount, p_method, 'pagado',
     p_paid_on, v_starts, v_ends, p_reference, p_notes)
  returning id into v_payment_id;

  -- Cobrar reactiva el cobro: si estaba pausado es que el cliente retomó.
  if not v_cfg.billing_enabled then
    update public.clients set billing_enabled = true where id = p_client_id;
  end if;

  return query select v_payment_id, v_starts, v_ends;
end;
$$;

revoke execute on function public.cobrar_mensualidad(uuid, numeric, public.payment_method, date, text, text)
  from public, anon;
grant execute on function public.cobrar_mensualidad(uuid, numeric, public.payment_method, date, text, text)
  to authenticated;

-- 23.2 Única fuente del estado de mensualidad por cliente. security_invoker:
-- la RLS de clients manda (cada entrenador ve solo los suyos).
create view public.v_mensualidades with (security_invoker = true) as
select
  c.id                                             as client_id,
  c.full_name,
  c.billing_enabled,
  c.billing_plan_id,
  p.name                                           as plan_name,
  coalesce(c.billing_period_days, p.duration_days) as periodo_dias,
  coalesce(p.price, m.price_agreed)                as precio,  -- sugerido al cobrar
  m.ends_on                                        as cubierto_hasta,
  (m.ends_on - current_date)                       as dias,    -- negativo = venció
  case
    when not c.billing_enabled                               then 'pausado'
    when m.ends_on is null                                   then 'sin_mensualidad'
    when m.ends_on < current_date                            then 'vencido'
    when m.ends_on - current_date <= c.billing_reminder_days then 'por_vencer'
    else 'al_dia'
  end                                              as estado
from public.clients c
left join public.membership_plans p on p.id = c.billing_plan_id
left join lateral (
  select cm.ends_on, cm.price_agreed
  from public.client_memberships cm
  where cm.client_id = c.id
    and cm.status in ('activa', 'vencida')
  order by cm.ends_on desc
  limit 1
) m on true
where c.is_active;

-- 23.3 Retirar las vistas sustituidas (cada una derivaba el vencimiento con un
-- criterio distinto; toda la UI lee ahora v_mensualidades).
drop view if exists public.v_billing_alerts;
drop view if exists public.v_payment_overview;
