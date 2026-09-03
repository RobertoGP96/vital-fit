"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

// Cota de fecha de cobro/pago: hoy + 1 día de margen horario (el RPC la
// re-valida en BD). Evita que un año mal tecleado envenene la cobertura.
const fechaNoFutura = z
  .string()
  .regex(dateRe, "Fecha inválida")
  .refine((d) => d <= format(addDays(new Date(), 1), "yyyy-MM-dd"), {
    message: "La fecha no puede ser futura.",
  });

const textOrNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

function revalidateCobros(clientId: string) {
  revalidatePath("/pagos");
  revalidatePath("/notificaciones");
  revalidatePath(`/clientes/${clientId}/pagos`);
}

// ── Cobrar mensualidad ──────────────────────────────────────────────────────
// UNA operación: el RPC cobrar_mensualidad (migraciones 0023/0024) crea el
// período y el recibo en la misma transacción, derivando fechas del tipo de
// pago del cliente. La RLS sigue mandando (solo entrenador asignado o admin).

const cobroSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente"),
  amount: z.coerce.number().positive("Importe inválido"),
  method: z.enum(["efectivo", "transferencia", "otro"]),
  paid_on: fechaNoFutura,
  reference: textOrNull(120),
  notes: textOrNull(500),
});

export async function cobrarMensualidadAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const parsed = cobroSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("cobrar_mensualidad", {
    p_client_id: d.client_id,
    p_amount: d.amount,
    p_method: d.method,
    p_paid_on: d.paid_on,
    p_reference: d.reference,
    p_notes: d.notes,
  });
  if (error) {
    console.error("cobrar_mensualidad:", error);
    // P0001 = raise exception del RPC: mensajes pensados para el usuario
    // ("Solo el entrenador asignado…", "La fecha de cobro no puede ser futura").
    return {
      error:
        error.code === "P0001" ? error.message : "No se pudo registrar el cobro.",
    };
  }

  revalidateCobros(d.client_id);
  redirect(`/clientes/${d.client_id}/pagos`);
}

// ── Pago excepcional (sesión suelta / otro) ────────────────────────────────
// No toca la cobertura de mensualidad: es solo un recibo.

const pagoExtraSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente"),
  concept: z.enum(["sesion_suelta", "otro"]),
  amount: z.coerce.number().positive("Importe inválido"),
  method: z.enum(["efectivo", "transferencia", "otro"]),
  paid_on: fechaNoFutura,
  reference: textOrNull(120),
  notes: textOrNull(500),
});

export async function registrarPagoExtraAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const parsed = pagoExtraSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .insert({ ...parsed.data, status: "pagado", currency: "CUP" });
  if (error) {
    console.error("registrarPagoExtra:", error);
    return { error: "No se pudo registrar el pago." };
  }

  revalidateCobros(parsed.data.client_id);
  redirect(`/clientes/${parsed.data.client_id}/pagos`);
}

/** Cerrar un pago pendiente/vencido del historial (solo admin, igual que la RLS). */
export async function markPaymentPaidAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "pagado",
      paid_on: format(new Date(), "yyyy-MM-dd"),
    })
    .eq("id", id);
  if (error) console.error("markPaymentPaid:", error);
  revalidatePath("/pagos");
  if (clientId) revalidatePath(`/clientes/${clientId}/pagos`);
}

// ── Ajuste manual del período (solo admin) ─────────────────────────────────
// Caso correctivo: extender o corregir cobertura sin cobro (p. ej. cliente
// enfermo). El flujo normal crea los períodos vía cobrar_mensualidad.

const membershipSchema = z.object({
  client_id: z.string().uuid(),
  plan_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().uuid().nullable()),
  starts_on: z.string().regex(dateRe, "Fecha de inicio inválida"),
  ends_on: z.string().regex(dateRe, "Fecha de fin inválida"),
  price_agreed: z.coerce.number().min(0, "Precio inválido"),
});

export async function createMembershipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = membershipSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (parsed.data.ends_on < parsed.data.starts_on) {
    return { error: "La fecha de fin debe ser posterior al inicio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_memberships").insert(parsed.data);
  if (error) return { error: "No se pudo crear el período." };

  revalidateCobros(parsed.data.client_id);
  return {}; // sin error = guardado (null sería indistinguible del estado inicial)
}

// ── Configuración de cobro del cliente ──────────────────────────────────────
// Tipo de pago (plan), período personalizado, antelación del aviso y pausa del
// cobro (cliente que abandona los entrenamientos y puede retomar después).

const billingSettingsSchema = z.object({
  client_id: z.string().uuid(),
  // El switch solo viaja en el FormData cuando está encendido.
  billing_enabled: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  billing_plan_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().uuid().nullable()),
  billing_period_days: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t ? Number(t) : null;
    })
    .pipe(z.number().int().min(1).max(366).nullable()),
  billing_reminder_days: z.coerce.number().int().min(1).max(60),
});

export async function updateBillingSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(); // RLS de clients: solo con acceso al cliente

  const parsed = billingSettingsSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { client_id, ...settings } = parsed.data;
  const supabase = await createClient();
  // .select(): si la RLS filtra la fila (staff sin acceso de escritura), el
  // UPDATE afecta 0 filas SIN error — hay que tratarlo como fallo, no como éxito.
  const { data, error } = await supabase
    .from("clients")
    .update(settings)
    .eq("id", client_id)
    .select("id");
  if (error) return { error: "No se pudo guardar la configuración de cobro." };
  if (!data?.length) {
    return {
      error:
        "Solo el entrenador asignado o un admin pueden cambiar la configuración de cobro.",
    };
  }

  revalidatePath(`/clientes/${client_id}/pagos`);
  revalidatePath("/notificaciones");
  return {}; // sin error = guardado (distinto de null para mostrar confirmación)
}
