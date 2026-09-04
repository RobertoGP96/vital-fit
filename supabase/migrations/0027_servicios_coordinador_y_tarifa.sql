-- VitalFit · Migración 27: tipos de servicio del coordinador + tarifa en el cobro
--
-- membership_plans pasa a ser el catálogo de "servicios" del gimnasio
-- (mensualidad, quincena, paquete de sesiones…), cada uno con su TARIFA
-- (price). Cambios:
--   1) El COORDINADOR también configura los servicios (antes solo admin):
--      crea, edita y desactiva. Es quien organiza la oferta del gimnasio.
--   2) El cobro lleva la tarifa determinada por el servicio del cliente:
--      cobrar_mensualidad ahora deriva el importe de la tarifa cuando no se
--      pasa, y un entrenador NO puede cobrar un importe distinto de ella
--      (acuerdos especiales = coordinador/admin). Sin servicio con tarifa,
--      el importe libre sigue funcionando como hasta ahora.
--   3) v_mensualidades expone importe_editable para que la UI sepa si debe
--      ofrecer el campo de importe o mostrar la tarifa fija.
-- Cada cliente ya elige su servicio en clients.billing_plan_id (0019).

-- 27.1 El coordinador gestiona el catálogo de servicios.
drop policy plans_insert on public.membership_plans;
create policy plans_insert on public.membership_plans for insert to authenticated
  with check ( (select public.is_coordinator_or_admin()) );
drop policy plans_update on public.membership_plans;
create policy plans_update on public.membership_plans for update to authenticated
  using      ( (select public.is_coordinator_or_admin()) )
  with check ( (select public.is_coordinator_or_admin()) );
drop policy plans_delete on public.membership_plans;
create policy plans_delete on public.membership_plans for delete to authenticated
  using ( (select public.is_coordinator_or_admin()) );

-- 27.2 RPC: el importe sale de la tarifa del servicio del cliente.
--   · p_amount NULL → se cobra la tarifa (error claro si no tiene servicio).
--   · p_amount ≠ tarifa → solo coordinador/admin (acuerdo puntual).
--   · Cliente sin servicio con tarifa → importe libre (igual que antes).
create or replace function public.cobrar_mensualidad(
  p_client_id uuid,
  p_amount    numeric default null,
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
  v_amount         numeric;
  v_cubierto_hasta date;
  v_periodo_dias   int;
  v_starts         date;
  v_ends           date;
  v_membership_id  uuid;
  v_payment_id     uuid;
begin
  -- Margen de 1 día por diferencia horaria servidor/gimnasio.
  if v_paid > current_date + 1 then
    raise exception 'La fecha de cobro no puede ser futura';
  end if;
  -- Mismo criterio que la RLS de INSERT, pero con mensaje entendible (la vista
  -- deja VER a todo el staff, cobrar no).
  if not public.has_client_access(p_client_id) then
    raise exception 'Solo el entrenador asignado o un admin pueden cobrar a este cliente';
  end if;

  select c.billing_plan_id, c.billing_period_days, c.billing_enabled,
         p.duration_days, p.price as tarifa, p.name as servicio
    into v_cfg
  from public.clients c
  left join public.membership_plans p on p.id = c.billing_plan_id
  where c.id = p_client_id;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  -- La tarifa del servicio manda sobre el importe.
  if p_amount is null then
    if v_cfg.tarifa is null then
      raise exception 'El cliente no tiene un servicio con tarifa: asígnale uno o indica el importe';
    end if;
    v_amount := v_cfg.tarifa;
  else
    if p_amount <= 0 then
      raise exception 'El importe debe ser mayor que cero';
    end if;
    if v_cfg.tarifa is not null
       and p_amount <> v_cfg.tarifa
       and not public.is_coordinator_or_admin() then
      raise exception 'La tarifa de "%" es % CUP: solo un coordinador o admin puede cobrar un importe distinto',
        v_cfg.servicio, trim_scale(v_cfg.tarifa);
    end if;
    v_amount := p_amount;
  end if;

  -- Serializa cobros del mismo cliente dentro de la transacción: dos cobros
  -- simultáneos ya no leen la misma cobertura ni duplican el período.
  perform pg_advisory_xact_lock(hashtextextended('cobrar_mensualidad:' || p_client_id::text, 0));

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
    (p_client_id, v_cfg.billing_plan_id, v_starts, v_ends, v_amount, 'activa')
  returning id into v_membership_id;

  insert into public.payments
    (client_id, concept, membership_id, amount, method, status,
     paid_on, period_start, period_end, reference, notes)
  values
    (p_client_id, 'mensualidad', v_membership_id, v_amount, p_method, 'pagado',
     v_paid, v_starts, v_ends, p_reference, p_notes)
  returning id into v_payment_id;

  -- Cobrar reactiva el cobro: si estaba pausado es que el cliente retomó.
  if not v_cfg.billing_enabled then
    update public.clients set billing_enabled = true where id = p_client_id;
  end if;

  return query select v_payment_id, v_starts, v_ends;
end;
$$;

-- 27.3 Vista con importe_editable (misma definición de 0024 + columna al final):
-- la UI ofrece el campo de importe solo a quien puede apartarse de la tarifa
-- (coordinador/admin) o cuando el cliente no tiene servicio con tarifa.
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
  (select public.has_client_access(c.id))          as puede_cobrar,
  ( (select public.is_coordinator_or_admin()) or p.price is null ) as importe_editable
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
