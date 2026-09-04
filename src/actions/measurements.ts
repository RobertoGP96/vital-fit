"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCanonicalUnit } from "@/lib/format";
import type { FormState } from "@/actions/auth";

const schema = z.object({
  client_id: z.string().uuid(),
  measured_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional(),
});

export async function createMeasurementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const parsed = schema.safeParse({
    client_id: formData.get("client_id"),
    measured_at: formData.get("measured_at"),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  // Valores: campos "value_<typeId>" con la unidad canónica en "unit_<typeId>".
  const values: { measurement_type_id: string; value: number }[] = [];
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("value_")) continue;
    const str = String(raw).trim().replace(",", ".");
    if (str === "") continue;
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0) {
      return { error: "Hay una medida con un valor inválido." };
    }
    const typeId = key.slice("value_".length);
    const canonicalUnit = String(formData.get(`unit_${typeId}`) ?? "cm");
    values.push({
      measurement_type_id: typeId,
      // Entrada fija de la app: pulgadas para longitudes, kg para peso.
      value: toCanonicalUnit(num, canonicalUnit),
    });
  }
  if (values.length === 0) {
    return { error: "Registra al menos una medida." };
  }

  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from("measurement_records")
    .insert({
      client_id: parsed.data.client_id,
      measured_at: parsed.data.measured_at,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();
  if (error || !record) return { error: "No se pudo guardar el registro." };

  const { error: valuesError } = await supabase
    .from("measurement_values")
    .insert(values.map((v) => ({ ...v, record_id: record.id })));
  if (valuesError) {
    await supabase.from("measurement_records").delete().eq("id", record.id);
    return { error: "No se pudieron guardar los valores." };
  }

  revalidatePath(`/clientes/${parsed.data.client_id}/medidas`);
  redirect(`/clientes/${parsed.data.client_id}/medidas`);
}

export async function deleteMeasurementAction(formData: FormData): Promise<void> {
  await requireSession();
  const recordId = String(formData.get("record_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!recordId) return;

  const supabase = await createClient();
  // RLS: solo admin o el autor del registro pueden borrarlo.
  await supabase.from("measurement_records").delete().eq("id", recordId);
  revalidatePath(`/clientes/${clientId}/medidas`);
}
