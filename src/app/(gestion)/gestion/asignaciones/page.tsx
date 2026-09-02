import type { Metadata } from "next";
import { Button, Chip } from "@heroui/react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTrainers } from "@/lib/queries";
import { revokeAssignmentAction } from "@/actions/assignments";
import { AssignmentForm } from "@/components/assignment-form";
import { Avatar } from "@/components/avatar";

export const metadata: Metadata = { title: "Asignaciones" };

type AssignRow = {
  id: string;
  trainer_id: string;
  client_id: string;
  profiles: { full_name: string } | null;
};

export default async function AsignacionesPage() {
  const supabase = await createClient();

  const [{ data: clientsData }, { data: assignsData }, trainers] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, is_active")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("trainer_client_assignments")
        .select(
          "id, trainer_id, client_id, profiles!trainer_client_assignments_trainer_id_fkey(full_name)",
        )
        .is("revoked_at", null),
      getActiveTrainers(),
    ]);

  const clients = clientsData ?? [];
  const assigns = (assignsData ?? []) as unknown as AssignRow[];
  const byClient = new Map<string, AssignRow[]>();
  for (const a of assigns) {
    const list = byClient.get(a.client_id) ?? [];
    list.push(a);
    byClient.set(a.client_id, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Asignaciones</h1>
      <p className="-mt-2 text-sm text-muted">
        Qué entrenador puede ver y trabajar con cada cliente.
      </p>

      <AssignmentForm
        clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))}
        trainers={trainers.map((t) => ({ id: t.id, full_name: t.full_name }))}
      />

      <ul className="flex flex-col gap-2">
        {clients.map((c) => {
          const list = byClient.get(c.id) ?? [];
          return (
            <li
              key={c.id}
              className="rounded-2xl border border-line bg-white p-3.5"
            >
              <div className="flex items-center gap-3">
                <Avatar name={c.full_name} size="sm" />
                <p className="min-w-0 flex-1 truncate font-semibold">
                  {c.full_name}
                </p>
                {list.length === 0 && (
                  <Chip size="sm" color="warning" variant="soft" className="font-bold">
                    Sin asignar
                  </Chip>
                )}
              </div>
              {list.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {list.map((a) => (
                    <li key={a.id}>
                      <form
                        action={revokeAssignmentAction}
                        className="flex items-center gap-1 rounded-full bg-brand/10 py-1 pl-3 pr-1"
                      >
                        <span className="text-xs font-semibold text-brand-600">
                          {a.profiles?.full_name ?? "—"}
                        </span>
                        <input type="hidden" name="id" value={a.id} />
                        <Button
                          type="submit"
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Quitar a ${a.profiles?.full_name}`}
                          className="h-6 w-6 min-w-0 rounded-full font-bold text-brand-600 hover:bg-brand/20"
                        >
                          ×
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
