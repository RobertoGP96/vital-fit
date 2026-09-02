-- VitalFit · Migración 20: mantenimiento diario de estados de pago
-- Programa refresh_payment_statuses() (pendiente→vencido, membresías vencidas)
-- cada día a las 03:10. cron.schedule con el mismo nombre es un upsert, por lo
-- que re-ejecutar esta migración es seguro.

create extension if not exists pg_cron;

select cron.schedule(
  'vitalfit-refresh-payments',
  '10 3 * * *',
  'select public.refresh_payment_statuses()'
);
