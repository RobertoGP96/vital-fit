"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
// Los campos condicionales del formulario pueden NO venir en el FormData:
// tratar ausente y "" como null.
const dateOrNull = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .pipe(z.string().regex(dateRe).nullable());

const uuidOrNull = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.string().uuid().nullable());

const textOrNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

function addDaysISO(iso: string, days: number): string {
  return format(addDays(new Date(`${iso}T00:00:00`), days), "yyyy-MM-dd");
}

const paymentSchema = z
  .object({
    client_id: z.string().uuid("Selecciona un cliente"),
    concept: z.enum(["mensualidad", "sesion_suelta", "otro"]),
    membership_id: uuidOrNull,
    amount: z.coerce.number().positive("Importe inválido"),
    method: z.enum(["efectivo", "transferencia", "otro"]),
    status: z.enum(["pagado", "pendiente"]),
    paid_on: dateOrNull,
    due_on: dateOrNull,
    period_start: dateOrNull,
    period_end: dateOrNull,
    reference: textOrNull(120),
    notes: textOrNull(500),
    renew_membership: z.string().optional(), // "on" = crear el nuevo período
  })
  .check((ctx) => {
    if (ctx.value.status === "pagado" && !ctx.value.paid_on) {
      ctx.issues.push({
        code: "custom",
        message: "Un pago 'pagado' necesita fecha de pago.",
        input: ctx.value,
      });
    }
  });

export async function createPaymentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(); // RLS: entrenador solo para clientes asignados

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { renew_membership, ...payment } = parsed.data;
  const supabase = await createClient();

  // Mensualidad cobrada con "renovar": crea la membresía del nuevo período según
  // la configuración de cobro del cliente (tipo de pago + período) y liga el pago.
  // Así el aviso de vencimiento se apaga en cuanto se registra el cobro.
  if (
    payment.concept === "mensualidad" &&
    renew_membership &&
    !payment.membership_id &&
    payment.status === "pagado"
  ) {
    const [{ data: cfg }, { data: last }] = await Promise.all([
      supabase
        .from("clients")
        .select("billing_plan_id, billing_period_days, membership_plans(duration_days)")
        .eq("id", payment.client_id)
        .single(),
      supabase
        .from("client_memberships")
        .select("ends_on")
        .eq("client_id", payment.client_id)
        .in("status", ["activa", "vencida"])
        .order("ends_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const plan = (cfg?.membership_plans ?? null) as { duration_days: number } | null;
    const periodDays = cfg?.billing_period_days ?? plan?.duration_days ?? 30;
    const today = format(new Date(), "yyyy-MM-dd");

    // El nuevo período empieza donde termina el vigente (si aún no venció) o hoy.
    const startsOn =
      payment.period_start ??
      (last?.ends_on && last.ends_on >= today ? addDaysISO(last.ends_on, 1) : today);
    const endsOn = payment.period_end ?? addDaysISO(startsOn, periodDays - 1);

    const { data: membership, error: mErr } = await supabase
      .from("client_memberships")
      .insert({
        client_id: payment.client_id,
        plan_id: cfg?.billing_plan_id ?? null,
        starts_on: startsOn,
        ends_on: endsOn,
        price_agreed: payment.amount,
        status: "activa",
      })
      .select("id")
      .single();
    if (mErr || !membership) {
      return { error: "No se pudo crear la membresía del nuevo período." };
    }

    payment.membership_id = membership.id;
    payment.period_start = startsOn;
    payment.period_end = endsOn;
  }

  const { error } = await supabase
    .from("payments")
    .insert({ ...payment, currency: "CUP" });
  if (error) return { error: "No se pudo registrar el pago." };

  revalidatePath("/pagos");
  revalidatePath("/notificaciones");
  revalidatePath(`/clientes/${payment.client_id}/pagos`);
  redirect(`/clientes/${payment.client_id}/pagos`);
}

/** Marcar pagado: solo admin (la RLS de UPDATE también lo exige). */
export async function markPaymentPaidAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("payments")
    .update({
      status: "pagado",
      paid_on: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);
  revalidatePath("/pagos");
  if (clientId) revalidatePath(`/clientes/${clientId}/pagos`);
}

const membershipSchema = z.object({
  client_id: z.string().uuid(),
  plan_id: uuidOrNull,
  starts_on: z.string().regex(dateRe, "Fecha de inicio inválida"),
  ends_on: z.string().regex(dateRe, "Fecha de fin inválida"),
  price_agreed: z.coerce.number().min(0, "Precio inválido"),
});

export async function createMembershipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const parsed = membershipSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (parsed.data.ends_on < parsed.data.starts_on) {
    return { error: "La fecha de fin debe ser posterior al inicio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_memberships").insert(parsed.data);
  if (error) return { error: "No se pudo crear la membresía." };

  revalidatePath(`/clientes/${parsed.data.client_id}/pagos`);
  revalidatePath("/notificaciones");
  return null;
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
  billing_plan_id: uuidOrNull,
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
  const { error } = await supabase
    .from("clients")
    .update(settings)
    .eq("id", client_id);
  if (error) return { error: "No se pudo guardar la configuración de cobro." };

  revalidatePath(`/clientes/${client_id}/pagos`);
  revalidatePath("/notificaciones");
  return {}; // sin error = guardado (distinto de null para mostrar confirmación)
}
