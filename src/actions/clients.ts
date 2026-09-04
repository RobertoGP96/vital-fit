"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { clientFormToObject, clientSchema } from "@/lib/validation/client";
import type { FormState } from "@/actions/auth";

export async function createClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Cualquier staff activo registra clientes (la RLS de INSERT es la segunda
  // capa); si no es admin, la BD lo auto-asigna como entrenador del cliente.
  await requireSession();

  const parsed = clientSchema.safeParse(clientFormToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "No se pudo registrar el cliente." };
  }

  revalidatePath("/clientes");
  // Siguiente paso del alta: elegir el servicio (tarifa) del cliente.
  redirect(`/clientes/${data.id}/pagos?configurar=1`);
}

export async function updateClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(); // la RLS limita a clientes con acceso

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Cliente inválido." };

  const parsed = clientSchema.safeParse(clientFormToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: "No se pudo guardar los cambios." };

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  redirect(`/clientes/${id}`);
}
