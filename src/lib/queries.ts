import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ClientOption = {
  id: string;
  full_name: string;
  max_daily_sessions: number;
};

/** Clientes con asignación ACTIVA a un entrenador (para participantes). */
export async function getAssignedClients(
  trainerId: string,
): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trainer_client_assignments")
    .select("clients(id, full_name, max_daily_sessions)")
    .eq("trainer_id", trainerId)
    .is("revoked_at", null);

  return (data ?? [])
    .map((r) => r.clients as unknown as ClientOption | null)
    .filter((c): c is ClientOption => Boolean(c))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

/** Roster activo completo (la distribución de bloques es de todo el grupo). */
export async function getActiveClients(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, full_name, max_daily_sessions")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []) as ClientOption[];
}

export type TrainerOption = { id: string; full_name: string; role: string };

/** Staff activo (entrenadores y coordinadores) para selectores. */
export async function getActiveTrainers(): Promise<TrainerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .in("role", ["trainer", "coordinator"])
    .order("full_name");
  return (data ?? []) as TrainerOption[];
}
