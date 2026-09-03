-- VitalFit · Migración 24: refuerzo del flujo de mensualidades (tras revisión)
--
-- 1) Lectura de client_memberships abierta a todo el staff activo, igual que
--    clients desde 0022: v_mensualidades es security_invoker y con la política
--    antigua (solo entrenador asignado/admin) un coordinador o un entrenador
--    no asignado veía la cobertura vacía → estados falsos ('sin_mensualidad')
--    en toda la app. Escribir sigue restringido como estaba.
-- 2) cobrar_mensualidad: guard de acceso con mensaje claro, bloqueo advisory
--    por cliente (dos cobros simultáneos ya no duplican el período) y cota
--    superior de fecha (un año tecleado mal no envenena la cadena).
-- 3) v_mensualidades expone puede_cobrar: la UI solo ofrece "Cobrar" (y la
--    campana solo avisa) a quien de verdad puede cobrar a ese cliente.

-- 24.1 Ver cobertura = todo el staff activo (el estado del gimnasio es global).
drop policy memberships_select on public.client_memberships;
create policy memberships_select on public.client_memberships for select to authenticated
  using ( (select public.is_active_staff()) );

-- 24.2 RPC endurecido.
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
  v_paid           date := coalesce(p_paid_on, current_date);
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
  -- Margen de 1 día por diferencia horaria servidor/gimnasio.
  if v_paid > current_date + 1 then
    raise exception 'La fecha de cobro no puede ser futura';
  end if;
  -- Mismo criterio que la RLS de INSERT, pero con mensaje entendible (la vista
  -- deja VER a todo el staff, cobrar no).
  if not public.has_client_access(p_client_id) then
    raise exception 'Solo el entrenador asignado o un admin pueden cobrar a este cliente';
  end if;

  -- Serializa cobros del mismo cliente dentro de la transacción: dos cobros
  -- simultáneos ya no leen la misma cobertura ni duplican el período.
  perform pg_advisory_xact_lock(hashtextextended('cobrar_mensualidad:' || p_client_id::text, 0));

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
  if v_cubierto_hasta is not null and v_cubierto_hasta >= v_paid then
    v_starts := v_cubierto_hasta + 1;
  else
    v_starts := v_paid;
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
     v_paid, v_starts, v_ends, p_reference, p_notes)
  returning id into v_payment_id;

  -- Cobrar reactiva el cobro: si estaba pausado es que el cliente retomó.
  if not v_cfg.billing_enabled then
    update public.clients set billing_enabled = true where id = p_client_id;
  end if;

  return query select v_payment_id, v_starts, v_ends;
end;
$$;

-- 24.3 Vista con puede_cobrar (misma definición de 0023 + columna al final).
create or replace view public.v_mensualidades with (security_invoker = true) as
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
  end                                              as estado,
  (select public.has_client_access(c.id))          as puede_cobrar
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
