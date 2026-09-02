"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

const schema = z.object({
  client_id: z.string().uuid(),
  record_type: z.enum([
    "patologia",
    "lesion",
    "alergia",
    "medicacion",
    "cirugia",
    "nota_clinica",
    "otro",
  ]),
  title: z.string().trim().min(2, "Título demasiado corto").max(150),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === "" ? null : v)),
  diagnosed_on: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
});

export async function createMedicalRecordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("medical_records").insert(parsed.data);
  if (error) return { error: "No se pudo guardar la entrada." };

  revalidatePath(`/clientes/${parsed.data.client_id}/historial`);
  return null;
}

export async function toggleMedicalCurrentAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const isCurrent = String(formData.get("is_current")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("medical_records")
    .update({ is_current: !isCurrent })
    .eq("id", id);
  revalidatePath(`/clientes/${clientId}/historial`);
}
