"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type TrainerFormState =
  | { error: string }
  | { ok: true; tempPassword: string; email: string }
  | null;

function generateTempPassword(): string {
  // Legible para dictarla en persona: Vf-XXXXXXXX
  const digits = Array.from({ length: 8 }, () => randomInt(0, 10)).join("");
  return `Vf-${digits}`;
}

const createSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  full_name: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  role: z.enum(["trainer", "coordinator"]),
});

export async function createTrainerAction(
  _prev: TrainerFormState,
  formData: FormData,
): Promise<TrainerFormState> {
  await requireAdmin();

  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { role: parsed.data.role, must_change_password: true },
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (error) {
    if (error.code === "email_exists" || /already/i.test(error.message)) {
      return { error: "Ya existe una cuenta con ese correo." };
    }
    return { error: "No se pudo crear la cuenta." };
  }

  // El trigger handle_new_user creó public.profiles, pero GoTrue inserta el
  // usuario ANTES de aplicar app_metadata: el trigger no ve el rol y deja
  // 'trainer'. Se espeja explícitamente para que la RLS vea el rol correcto.
  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", data.user.id);
  if (roleErr) {
    return { error: "Cuenta creada pero no se pudo fijar el rol. Reintenta desde la lista." };
  }

  revalidatePath("/admin/entrenadores");
  // La contraseña temporal se muestra UNA vez y jamás se persiste.
  return { ok: true, tempPassword, email: parsed.data.email };
}

export async function resetTrainerPasswordAction(
  _prev: TrainerFormState,
  formData: FormData,
): Promise<TrainerFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "");
  if (!id) return { error: "Entrenador inválido." };

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: tempPassword,
    app_metadata: { must_change_password: true },
  });
  if (error) return { error: "No se pudo restablecer la contraseña." };

  return { ok: true, tempPassword, email };
}

export async function toggleTrainerActiveAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active")) === "true";
  if (!id || id === session.userId) return; // nunca auto-desactivarse

  const admin = createAdminClient();
  if (isActive) {
    // Baja: ban (~100 años) + flag. El corte de datos es inmediato vía RLS.
    await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    await admin.from("profiles").update({ is_active: false }).eq("id", id);
  } else {
    await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
    await admin.from("profiles").update({ is_active: true }).eq("id", id);
  }
  revalidatePath("/admin/entrenadores");
}

export async function setTrainerRoleAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || id === session.userId) return;
  if (role !== "trainer" && role !== "coordinator") return;

  const admin = createAdminClient();
  // Ambas capas a la vez: claim del JWT (UI/middleware) y profiles (RLS).
  await admin.auth.admin.updateUserById(id, { app_metadata: { role } });
  await admin.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/entrenadores");
}
