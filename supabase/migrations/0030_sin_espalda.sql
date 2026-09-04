-- VitalFit · Migración 30: catálogo de medidas — sale espalda
--
-- 'Espalda' se desactiva (histórico intacto, mismo patrón que las migraciones 25, 28 y 29).

update public.measurement_types
  set is_active = false
  where code = 'espalda';
