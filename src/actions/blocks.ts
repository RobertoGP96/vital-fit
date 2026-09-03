"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoordinatorOrAdmin } from "@/lib/auth";
import { dbRuleMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/actions/auth";

function revalidateAgenda() {
  revalidatePath("/agenda");
  revalidatePath("/agenda/mes");
  revalidatePath("/panel");
}

const MONTH_RE = /^\d{4}-\d{2}-01$/;

const blockSchema = z.object({
  month: z.string().regex(MONTH_RE, "Mes inválido"),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Hora de inicio inválida"),
  end_time: z.string().regex(/^\d{2}:\d{2}/, "Hora de fin inválida"),
  capacity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(200).nullable()),
});

export async function createBlockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoordinatorOrAdmin();

  const parsed = blockSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (parsed.data.end_time <= parsed.data.start_time) {
    return { error: "La hora de fin debe ser posterior a la de inicio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("session_blocks").insert(parsed.data);
  if (error) {
    return {
      error: "No se pudo crear el bloque (¿se solapa con otro del mismo mes?).",
    };
  }

  revalidateAgenda();
  return {};
}

export async function toggleBlockAction(formData: FormData): Promise<void> {
  await requireCoordinatorOrAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active")) === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("session_blocks")
    .update({ is_active: !isActive })
    .eq("id", id);
  revalidateAgenda();
}

/** Las sesiones ya abiertas de días pasados se conservan (block_id → null). */
export async function deleteBlockAction(formData: FormData): Promise<void> {
  await requireCoordinatorOrAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("session_blocks").delete().eq("id", id);
  revalidateAgenda();
}

/** Reemplaza la distribución mensual de clientes del bloque. Aplica un diff
    (quitar/añadir) y añade uno a uno: si un cliente choca con su límite
    diario o con el aforo, los demás cambios se conservan igualmente. */
export async function saveBlockParticipantsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoordinatorOrAdmin();
  const blockId = String(formData.get("block_id") ?? "");
  if (!blockId) return { error: "Bloque inválido." };
  const clientIds = [
    ...new Set(formData.getAll("participants").map(String).filter(Boolean)),
  ];

  const supabase = await createClient();
  const { data: current, error: cError } = await supabase
    .from("session_block_participants")
    .select("client_id")
    .eq("block_id", blockId);
  if (cError) return { error: "No se pudo actualizar la distribución." };

  const currentIds = new Set((current ?? []).map((r) => r.client_id));
  const toRemove = [...currentIds].filter((id) => !clientIds.includes(id));
  const toAdd = clientIds.filter((id) => !currentIds.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("session_block_participants")
      .delete()
      .eq("block_id", blockId)
      .in("client_id", toRemove);
    if (error) return { error: "No se pudo actualizar la distribución." };
  }

  const failures: string[] = [];
  for (const client_id of toAdd) {
    const { error } = await supabase
      .from("session_block_participants")
      .insert({ block_id: blockId, client_id });
    if (error) {
      failures.push(
        dbRuleMessage(
          error.message,
          "No se pudo agregar a un cliente (¿supera el aforo del bloque?).",
        ),
      );
    }
  }

  revalidateAgenda();
  if (failures.length > 0) {
    return {
      error:
        failures.length === 1
          ? failures[0]
          : `${failures[0]} (y ${failures.length - 1} cliente(s) más sin agregar).`,
    };
  }
  return {};
}

/** Copia los bloques activos (y su distribución) del mes anterior al indicado. */
export async function copyPreviousMonthAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoordinatorOrAdmin();
  const month = String(formData.get("month") ?? "");
  if (!MONTH_RE.test(month)) return { error: "Mes inválido." };

  const target = new Date(`${month}T00:00:00`);
  const prev = new Date(target.getFullYear(), target.getMonth() - 1, 1);
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;

  const supabase = await createClient();

  const { count } = await supabase
    .from("session_blocks")
    .select("id", { count: "exact", head: true })
    .eq("month", month);
  if ((count ?? 0) > 0) {
    return { error: "Este mes ya tiene bloques definidos." };
  }

  const { data: prevBlocks } = await supabase
    .from("session_blocks")
    .select("id, start_time, end_time, capacity, session_block_participants(client_id)")
    .eq("month", prevMonth)
    .eq("is_active", true)
    .order("start_time");
  if (!prevBlocks || prevBlocks.length === 0) {
    return { error: "El mes anterior no tiene bloques que copiar." };
  }

  for (const b of prevBlocks) {
    const { data: created, error } = await supabase
      .from("session_blocks")
      .insert({
        month,
        start_time: b.start_time,
        end_time: b.end_time,
        capacity: b.capacity,
      })
      .select("id")
      .single();
    if (error || !created) return { error: "No se pudieron copiar los bloques." };

    const participants = (b.session_block_participants ?? []) as {
      client_id: string;
    }[];
    // Uno a uno: si a un cliente le bajaron el límite diario desde el mes
    // anterior, se omite de este bloque sin perder al resto.
    for (const p of participants) {
      await supabase
        .from("session_block_participants")
        .insert({ block_id: created.id, client_id: p.client_id });
    }
  }

  revalidateAgenda();
  return {};
}
