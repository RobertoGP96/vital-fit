"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

const schema = z.object({
  client_id: z.string().uuid(),
  storage_path: z.string().min(3).max(300),
  pose: z.enum(["frente", "espalda", "perfil_izquierdo", "perfil_derecho", "otro"]),
  taken_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** El binario ya subió directo del navegador al bucket; aquí solo el metadato. */
export async function savePhotoRecordAction(input: {
  client_id: string;
  storage_path: string;
  pose: string;
  taken_on: string;
}): Promise<FormState> {
  await requireSession();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Datos de foto inválidos." };

  // La convención de path es client_id/... — que coincida con el cliente.
  if (!parsed.data.storage_path.startsWith(`${parsed.data.client_id}/`)) {
    return { error: "Ruta de foto inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("progress_photos").insert(parsed.data);
  if (error) return { error: "No se pudo registrar la foto." };

  revalidatePath(`/clientes/${parsed.data.client_id}/fotos`);
  return null;
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("progress_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!photo) return;

  // Primero el objeto del bucket, luego la fila (RLS aplica en ambos).
  await supabase.storage.from("progress-photos").remove([photo.storage_path]);
  await supabase.from("progress_photos").delete().eq("id", id);
  revalidatePath(`/clientes/${clientId}/fotos`);
}
