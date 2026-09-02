-- VitalFit · Migración 1: extensiones, enums y utilidades
-- Todas las migraciones asumen ejecución en orden (0001..0016).

create extension if not exists btree_gist;

-- Roles de staff. Los clientes NO son usuarios.
create type public.user_role as enum ('admin', 'coordinator', 'trainer');

create type public.sex as enum ('masculino', 'femenino', 'otro');

create type public.marital_status as enum
  ('soltero_a', 'casado_a', 'divorciado_a', 'viudo_a', 'union_libre', 'otro');

-- Preferencia de unidades de entrada/visualización; el almacenamiento es siempre métrico.
create type public.unit_system as enum ('metric', 'imperial');

create type public.measurement_category as enum ('longitud', 'peso', 'porcentaje', 'otro');

create type public.photo_pose as enum
  ('frente', 'espalda', 'perfil_izquierdo', 'perfil_derecho', 'otro');

create type public.medical_record_type as enum
  ('patologia', 'lesion', 'alergia', 'medicacion', 'cirugia', 'nota_clinica', 'otro');

create type public.session_status as enum ('programada', 'completada', 'cancelada');

create type public.membership_status as enum ('activa', 'vencida', 'cancelada', 'pausada');

create type public.payment_method as enum ('efectivo', 'transferencia', 'otro');

create type public.payment_status as enum ('pagado', 'pendiente', 'vencido');

-- Mensualidad = flujo principal; sesion_suelta/otro = formas excepcionales.
create type public.payment_concept as enum ('mensualidad', 'sesion_suelta', 'otro');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Rango sobre TIME para el constraint de no-solapamiento de horarios del entrenador.
create type public.timerange as range (subtype = time);
