-- VitalFit · Migración 28: catálogo de medidas — sale cintura, entra muslo superior
--
-- 'Cintura' se desactiva (histórico intacto, mismo patrón que la migración 25).
-- 'Muslo superior' entra en el grupo de pierna, entre glúteos (70) y pierna (80).

update public.measurement_types
  set is_active = false
  where code = 'cintura';

insert into public.measurement_types (code, name_es, category, canonical_unit, sort_order)
values ('muslo_superior', 'Muslo superior', 'longitud', 'cm', 75)
on conflict (code) do update
  set is_active = true, name_es = excluded.name_es, sort_order = excluded.sort_order;
