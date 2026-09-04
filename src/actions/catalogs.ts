"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireCoordinatorOrAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

// Gestión de catálogos (la RLS de escritura es la segunda capa). Los servicios
// y tarifas los gestiona también el coordinador (organiza la oferta del
// gimnasio); el resto de catálogos sigue siendo solo admin.
// Nunca se borra: desactivar preserva el histórico que referencia cada fila.

const emptyToNull = (v: string) => (v.trim() === "" ? null : v.trim());

function friendlyDbError(code: string | undefined, entity: string): string {
  if (code === "23505") return `Ya existe ${entity} con ese nombre.`;
  console.error("[catalogs] error de BD inesperado:", code);
  return "No se pudo guardar. Inténtalo de nuevo.";
}

/* ── Servicios y tarifas (membership_plans) ──────────────────────────── */
// Los configura el coordinador o el admin (migración 0027).

const planSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(80),
  description: z.string().max(300).transform(emptyToNull),
  price: z.coerce.number().min(0, "Tarifa inválida"),
  duration_days: z.coerce.number().int().positive("Duración inválida"),
  sessions_included: z.preprocess(
    (v) => (v == null || String(v).trim() === "" ? null : Number(v)),
    z.number().int().positive("Nº de sesiones inválido").nullable(),
  ),
});

export async function createPlanAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoordinatorOrAdmin();
  const parsed = planSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("membership_plans")
    .insert({ ...parsed.data, currency: "CUP" });
  if (error) return { error: friendlyDbError(error.code, "un servicio") };

  revalidatePath("/gestion/servicios");
  return null;
}

export async function updatePlanAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoordinatorOrAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Servicio inválido." };

  const parsed = planSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("membership_plans")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: friendlyDbError(error.code, "un servicio") };

  revalidatePath("/gestion/servicios");
  return null;
}

export async function togglePlanActiveAction(formData: FormData): Promise<void> {
  await requireCoordinatorOrAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("membership_plans")
    .update({ is_active: !isActive })
    .eq("id", id);
  revalidatePath("/gestion/servicios");
}

/* ── Tipos de sesión ─────────────────────────────────────────────────── */

const sessionTypeSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(60),
  description: z.string().max(300).transform(emptyToNull),
  default_duration_min: z.coerce.number().int().positive("Duración inválida"),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
});

export async function createSessionTypeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = sessionTypeSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("session_types").insert(parsed.data);
  if (error) return { error: friendlyDbError(error.code, "un tipo de sesión") };

  revalidatePath("/admin/tipos-sesion");
  return null;
}

export async function updateSessionTypeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Tipo de sesión inválido." };

  const parsed = sessionTypeSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_types")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: friendlyDbError(error.code, "un tipo de sesión") };

  revalidatePath("/admin/tipos-sesion");
  return null;
}

export async function toggleSessionTypeActiveAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("session_types")
    .update({ is_active: !isActive })
    .eq("id", id);
  revalidatePath("/admin/tipos-sesion");
}

/* ── Tipos de medida ─────────────────────────────────────────────────── */

// El código es la clave estable de la app; se deriva del nombre al crear y
// NO se edita después (las gráficas y funciones de reporte filtran por él).
function slugifyCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const UNIT_CATEGORY: Record<string, "longitud" | "peso" | "porcentaje"> = {
  cm: "longitud",
  kg: "peso",
  "%": "porcentaje",
};

// "todos" (o vacío) significa sin restricción → null en BD.
const onlyForSexSchema = z.preprocess(
  (v) => (v == null || v === "" || v === "todos" ? null : v),
  z.enum(["masculino", "femenino"]).nullable(),
);

const measurementTypeCreateSchema = z.object({
  name_es: z.string().trim().min(2, "Nombre demasiado corto").max(60),
  canonical_unit: z.enum(["cm", "kg", "%"]),
  sort_order: z.coerce.number().int().min(0).max(9999),
  only_for_sex: onlyForSexSchema,
});

export async function createMeasurementTypeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = measurementTypeCreateSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const code = slugifyCode(parsed.data.name_es);
  if (!code) return { error: "Nombre inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("measurement_types").insert({
    ...parsed.data,
    code,
    category: UNIT_CATEGORY[parsed.data.canonical_unit],
  });
  if (error) return { error: friendlyDbError(error.code, "una medida") };

  revalidatePath("/admin/tipos-medida");
  return null;
}

// La unidad canónica es inmutable: los valores históricos están almacenados
// en ella y cambiarla corrompería las series. Solo etiqueta y orden.
const measurementTypeUpdateSchema = z.object({
  name_es: z.string().trim().min(2, "Nombre demasiado corto").max(60),
  sort_order: z.coerce.number().int().min(0).max(9999),
  only_for_sex: onlyForSexSchema,
});

export async function updateMeasurementTypeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Medida inválida." };

  const parsed = measurementTypeUpdateSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("measurement_types")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: friendlyDbError(error.code, "una medida") };

  revalidatePath("/admin/tipos-medida");
  return null;
}

export async function toggleMeasurementTypeActiveAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("measurement_types")
    .update({ is_active: !isActive })
    .eq("id", id);
  revalidatePath("/admin/tipos-medida");
}
