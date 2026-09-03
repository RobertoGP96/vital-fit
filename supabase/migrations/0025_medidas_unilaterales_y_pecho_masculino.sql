-- VitalFit · Migración 25: medidas de extremidades unificadas y pecho solo masculino
--
-- 1) Las extremidades pasan a medirse una sola vez (sin izquierda/derecha).
--    La fila "izquierda" se reutiliza como la medida única para conservar su
--    histórico; la "derecha" se desactiva (sus valores históricos se conservan).
-- 2) El catálogo gana only_for_sex: una medida puede restringirse a un sexo.
--    'Pecho' queda solo para clientes masculinos.

alter table public.measurement_types
  add column if not exists only_for_sex public.sex;

comment on column public.measurement_types.only_for_sex is
  'Si no es null, la medida solo aplica a clientes de ese sexo (p. ej. pecho → masculino).';

update public.measurement_types
  set only_for_sex = 'masculino'
  where code = 'pecho';

do $$
declare
  pair record;
begin
  for pair in
    select * from (values
      ('pierna_izquierda',      'pierna_derecha',      'pierna',      'Pierna'),
      ('pantorrilla_izquierda', 'pantorrilla_derecha', 'pantorrilla', 'Pantorrilla'),
      ('brazo_izquierdo',       'brazo_derecho',       'brazo',       'Brazo')
    ) as v(left_code, right_code, new_code, new_name)
  loop
    -- Reutilizar la fila izquierda como medida única, salvo que ya exista.
    if not exists (select 1 from public.measurement_types where code = pair.new_code) then
      update public.measurement_types
        set code = pair.new_code, name_es = pair.new_name
        where code = pair.left_code;
    end if;

    -- Cualquier resto de la pareja se desactiva; el histórico queda intacto.
    update public.measurement_types
      set is_active = false
      where code in (pair.left_code, pair.right_code);
  end loop;
end $$;
