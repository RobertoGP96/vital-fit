"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function revalidateAgenda(sessionId?: string) {
  revalidatePath("/agenda");
  revalidatePath("/panel");
  if (sessionId) revalidatePath(`/agenda/sesion/${sessionId}`);
}

/**
 * Abre (materializa si hace falta) la sesión de un bloque para una fecha y
 * navega a su detalle. Idempotente: si ya existía, solo redirige.
 */
export async function openBlockSessionAction(formData: FormData): Promise<void> {
  await requireSession();
  const blockId = String(formData.get("block_id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!blockId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_block_session", {
    p_block_id: blockId,
    p_date: date,
  });
  if (error || !data) return;

  revalidateAgenda(String(data));
  redirect(`/agenda/sesion/${data}`);
}

export async function setSessionStatusAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["programada", "completada", "cancelada"].includes(status)) return;

  const supabase = await createClient();
  await supabase.from("sessions").update({ status }).eq("id", id);
  revalidateAgenda(id);
}

export async function addParticipantAction(formData: FormData): Promise<void> {
  await requireSession();
  const sessionId = String(formData.get("session_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!sessionId || !clientId) return;

  const supabase = await createClient();
  await supabase
    .from("session_participants")
    .insert({ session_id: sessionId, client_id: clientId });
  revalidateAgenda(sessionId);
}

export async function removeParticipantAction(formData: FormData): Promise<void> {
  await requireSession();
  const sessionId = String(formData.get("session_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!sessionId || !clientId) return;

  const supabase = await createClient();
  await supabase
    .from("session_participants")
    .delete()
    .eq("session_id", sessionId)
    .eq("client_id", clientId);
  await supabase
    .from("attendance_records")
    .delete()
    .eq("session_id", sessionId)
    .eq("client_id", clientId);
  revalidateAgenda(sessionId);
}

/** Asistencia tri-estado por participante: attended / missed / clear. */
export async function setAttendanceAction(formData: FormData): Promise<void> {
  await requireSession();
  const sessionId = String(formData.get("session_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const state = String(formData.get("state") ?? "");
  if (!sessionId || !clientId) return;

  const supabase = await createClient();
  if (state === "clear") {
    await supabase
      .from("attendance_records")
      .delete()
      .eq("session_id", sessionId)
      .eq("client_id", clientId);
  } else if (state === "attended" || state === "missed") {
    await supabase.from("attendance_records").upsert(
      {
        session_id: sessionId,
        client_id: clientId,
        attended: state === "attended",
        checked_in_at: state === "attended" ? new Date().toISOString() : null,
      },
      { onConflict: "session_id,client_id" },
    );
  }
  revalidateAgenda(sessionId);
}
