-- VitalFit · Migración 16: seeds de catálogos

-- Tipos de medida (unidad canónica métrica; la UI convierte a pulgadas si el
-- cliente prefiere imperial).
insert into public.measurement_types (code, name_es, category, canonical_unit, sort_order) values
  ('peso',                 'Peso',                 'peso',       'kg', 10),
  ('grasa_corporal',       'Grasa corporal',       'porcentaje', '%',  20),
  ('pecho',                'Pecho',                'longitud',   'cm', 30),
  ('espalda',              'Espalda',              'longitud',   'cm', 35),
  ('cintura',              'Cintura',              'longitud',   'cm', 40),
  ('abdomen',              'Abdomen',              'longitud',   'cm', 50),
  ('cadera',               'Cadera',               'longitud',   'cm', 60),
  ('gluteos',              'Glúteos',              'longitud',   'cm', 70),
  ('pierna_izquierda',     'Pierna izquierda',     'longitud',   'cm', 80),
  ('pierna_derecha',       'Pierna derecha',       'longitud',   'cm', 81),
  ('pantorrilla_izquierda','Pantorrilla izquierda','longitud',   'cm', 90),
  ('pantorrilla_derecha',  'Pantorrilla derecha',  'longitud',   'cm', 91),
  ('brazo_izquierdo',      'Brazo izquierdo',      'longitud',   'cm', 100),
  ('brazo_derecho',        'Brazo derecho',        'longitud',   'cm', 101)
on conflict (code) do nothing;

-- Tipos de sesión (colores de la paleta del diseño).
insert into public.session_types (name, default_duration_min, color) values
  ('Fuerza',      60, '#17C964'),
  ('Funcional',   60, '#3B82F6'),
  ('Cardio',      45, '#F59E0B'),
  ('Valoración',  30, '#A855F7')
on conflict (name) do nothing;

-- Planes de membresía de ejemplo (en CUP; el admin los ajustará a los precios reales).
insert into public.membership_plans (name, description, price, currency, duration_days, sessions_included) values
  ('Mensualidad',        'Acceso mensual con entrenador',   3000.00, 'CUP', 30, null),
  ('Quincena',           'Acceso quincenal',                1800.00, 'CUP', 15, null),
  ('Paquete 10 sesiones','10 sesiones personales',          2500.00, 'CUP', 60, 10)
on conflict (name) do nothing;
