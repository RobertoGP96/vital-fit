"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

function revalidateAgenda(sessionId?: string) {
  revalidatePath("/agenda");
  if (sessionId) revalidatePath(`/agenda/sesion/${sessionId}`);
}

const sessionSchema = z.object({
  trainer_id: z.string().uuid(),
  session_type_id: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Hora inválida"),
  // Solo coordinador/admin la envían; para entrenadores la determina el tipo.
  duration_min: z.coerce.number().int().min(10).max(360).optional(),
  capacity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(100).nullable()),
  notes: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v)),
});

export async function createSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();

  const parsed = sessionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Un entrenador solo crea sesiones propias (RLS lo refuerza) y no elige la
  // duración: la fija el tipo de sesión (trigger en BD como segunda capa).
  const trainerId =
    session.role === "trainer" ? session.userId : parsed.data.trainer_id;
  if (session.role === "trainer") delete parsed.data.duration_min;

  const participantIds = formData
    .getAll("participants")
    .map(String)
    .filter(Boolean);
  if (participantIds.length === 0) {
    return { error: "Selecciona al menos un participante." };
  }
  if (parsed.data.capacity && participantIds.length > parsed.data.capacity) {
    return { error: "Hay más participantes que la capacidad indicada." };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("sessions")
    .insert({ ...parsed.data, trainer_id: trainerId })
    .select("id")
    .single();
  if (error || !created) return { error: "No se pudo crear la sesión." };

  const { error: pError } = await supabase
    .from("session_participants")
    .insert(participantIds.map((client_id) => ({ session_id: created.id, client_id })));
  if (pError) {
    await supabase.from("sessions").delete().eq("id", created.id);
    return {
      error:
        "No se pudieron agregar los participantes (¿están asignados al entrenador?).",
    };
  }

  revalidateAgenda();
  redirect(`/agenda/sesion/${created.id}`);
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

/** Cambiar la duración es exclusivo de coordinador/admin (trigger BD lo refuerza). */
export async function updateSessionDurationAction(
  formData: FormData,
): Promise<void> {
  const session = await requireSession();
  if (session.role === "trainer") return;

  const id = String(formData.get("id") ?? "");
  const duration = Number(formData.get("duration_min"));
  if (!id || !Number.isInteger(duration) || duration < 10 || duration > 360)
    return;

  const supabase = await createClient();
  await supabase.from("sessions").update({ duration_min: duration }).eq("id", id);
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

/** Materializa las ocurrencias de la semana desde las plantillas activas. */
export async function generateWeekAction(formData: FormData): Promise<void> {
  await requireSession();
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return;

  const supabase = await createClient();
  await supabase.rpc("generate_sessions", { p_from: from, p_to: to });
  revalidateAgenda();
}

const scheduleSchema = z.object({
  trainer_id: z.string().uuid(),
  session_type_id: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
  weekday: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Hora inválida"),
  duration_min: z.coerce.number().int().min(10).max(360).optional(),
  capacity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(100).nullable()),
});

export async function createScheduleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();

  const parsed = scheduleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const trainerId =
    session.role === "trainer" ? session.userId : parsed.data.trainer_id;
  if (session.role === "trainer") delete parsed.data.duration_min;

  const participantIds = formData.getAll("participants").map(String).filter(Boolean);

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("schedules")
    .insert({ ...parsed.data, trainer_id: trainerId })
    .select("id")
    .single();
  if (error || !created) {
    return {
      error:
        "No se pudo crear el horario (¿se solapa con otro del mismo entrenador?).",
    };
  }

  if (participantIds.length > 0) {
    const { error: pError } = await supabase
      .from("schedule_participants")
      .insert(
        participantIds.map((client_id) => ({ schedule_id: created.id, client_id })),
      );
    if (pError) {
      await supabase.from("schedules").delete().eq("id", created.id);
      return { error: "No se pudieron agregar los participantes al horario." };
    }
  }

  revalidatePath("/agenda/horarios");
  redirect("/agenda/horarios");
}

export async function toggleScheduleAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("schedules").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/agenda/horarios");
}
