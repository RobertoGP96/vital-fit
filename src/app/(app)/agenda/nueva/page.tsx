import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveTrainers, getAssignedClients } from "@/lib/queries";
import { SessionForm } from "@/components/session-form";

export const metadata: Metadata = { title: "Nueva sesión" };

export default async function NuevaSesionPage(props: {
  searchParams: Promise<{ entrenador?: string }>;
}) {
  const session = await requireSession();
  const { entrenador } = await props.searchParams;
  const canManageAll = session.role !== "trainer";

  const trainerId =
    canManageAll && entrenador ? entrenador : session.userId;

  const supabase = await createClient();
  const [{ data: types }, trainers, clients] = await Promise.all([
    supabase
      .from("session_types")
      .select("id, name, default_duration_min")
      .eq("is_active", true)
      .order("name"),
    canManageAll ? getActiveTrainers() : Promise.resolve([]),
    getAssignedClients(trainerId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Nueva sesión</h1>

      {canManageAll && trainers.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Entrenador</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {trainers.map((t) => (
              <Link
                key={t.id}
                href={`/agenda/nueva?entrenador=${t.id}`}
                className={
                  trainerId === t.id
                    ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                    : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted"
                }
              >
                {t.full_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <SessionForm
        trainerId={trainerId}
        types={types ?? []}
        clients={clients}
        canEditDuration={canManageAll}
      />
    </div>
  );
}
