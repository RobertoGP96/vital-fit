"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const dateOrNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().regex(dateRe).nullable());

const paymentSchema = z
  .object({
    client_id: z.string().uuid("Selecciona un cliente"),
    concept: z.enum(["mensualidad", "sesion_suelta", "otro"]),
    membership_id: z
      .string()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.string().uuid().nullable()),
    amount: z.coerce.number().positive("Importe inválido"),
    method: z.enum(["efectivo", "transferencia", "otro"]),
    status: z.enum(["pagado", "pendiente"]),
    paid_on: dateOrNull,
    due_on: dateOrNull,
    period_start: dateOrNull,
    period_end: dateOrNull,
    reference: z
      .string()
      .trim()
      .max(120)
      .transform((v) => (v === "" ? null : v)),
    notes: z
      .string()
      .trim()
      .max(500)
      .transform((v) => (v === "" ? null : v)),
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .insert({ ...parsed.data, currency: "CUP" });
  if (error) return { error: "No se pudo registrar el pago." };

  revalidatePath("/pagos");
  revalidatePath(`/clientes/${parsed.data.client_id}/pagos`);
  redirect(`/clientes/${parsed.data.client_id}/pagos`);
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
  plan_id: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
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
  return null;
}
