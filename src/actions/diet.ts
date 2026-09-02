"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

const dateOrNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

const schema = z.object({
  client_id: z.string().uuid(),
  title: z.string().trim().min(2, "Título demasiado corto").max(150),
  content: z
    .string()
    .trim()
    .max(10000)
    .transform((v) => (v === "" ? null : v)),
  starts_on: dateOrNull,
  ends_on: dateOrNull,
});

export async function createDietPlanAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("diet_plans").insert(parsed.data);
  if (error) return { error: "No se pudo guardar el plan." };

  revalidatePath(`/clientes/${parsed.data.client_id}/dieta`);
  return null;
}

export async function toggleDietActiveAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const isActive = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("diet_plans").update({ is_active: !isActive }).eq("id", id);
  revalidatePath(`/clientes/${clientId}/dieta`);
}
