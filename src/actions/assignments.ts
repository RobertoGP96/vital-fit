"use server";

import { revalidatePath } from "next/cache";
import { requireCoordinatorOrAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

export async function assignClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoordinatorOrAdmin();
  const clientId = String(formData.get("client_id") ?? "");
  const trainerId = String(formData.get("trainer_id") ?? "");
  if (!clientId || !trainerId) return { error: "Selecciona cliente y entrenador." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("trainer_client_assignments")
    .insert({ client_id: clientId, trainer_id: trainerId });

  if (error) {
    // 23505 = ya existe una asignación activa idéntica
    if (error.code === "23505") return { error: "Esa asignación ya existe." };
    return { error: "No se pudo asignar." };
  }

  revalidatePath("/gestion/asignaciones");
  revalidatePath("/clientes");
  return null;
}

export async function revokeAssignmentAction(formData: FormData): Promise<void> {
  await requireCoordinatorOrAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // Revocar = timestamp (auditoría), nunca DELETE.
  await supabase
    .from("trainer_client_assignments")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);

  revalidatePath("/gestion/asignaciones");
  revalidatePath("/clientes");
}
