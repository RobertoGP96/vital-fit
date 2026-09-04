-- VitalFit · Migración 29: catálogo de medidas — sale cadera
--
-- 'Cadera' se desactiva (histórico intacto, mismo patrón que las migraciones 25 y 28).

update public.measurement_types
  set is_active = false
  where code = 'cadera';
