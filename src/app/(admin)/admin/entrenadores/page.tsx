import type { Metadata } from "next";
import { Button, Chip } from "@heroui/react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  setTrainerRoleAction,
  toggleTrainerActiveAction,
} from "@/actions/trainers";
import { TrainerCreateForm, TrainerResetPassword } from "@/components/trainer-admin";
import { Avatar } from "@/components/avatar";

export const metadata: Metadata = { title: "Entrenadores" };

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordinador",
  trainer: "Entrenador",
};

export default async function EntrenadoresPage() {
  const session = await requireAdmin();

  // Admin client: además del profile necesitamos el email (vive en auth.users).
  const admin = createAdminClient();
  const [{ data: profiles }, usersRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, specialty, is_active")
      .order("role")
      .order("full_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const emailById = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Entrenadores</h1>

      <details className="rounded-(--radius-card) border border-line bg-white p-4" open>
        <summary className="cursor-pointer font-bold text-brand-600">
          Nueva cuenta (entrenador o coordinador)
        </summary>
        <div className="mt-4">
          <TrainerCreateForm />
        </div>
      </details>

      <ul className="flex flex-col gap-2">
        {(profiles ?? []).map((p) => {
          const email = emailById.get(p.id) ?? "";
          const isSelf = p.id === session.userId;
          return (
            <li
              key={p.id}
              className={`rounded-2xl border border-line bg-white p-4 ${p.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.full_name}
                    {isSelf && <span className="text-muted"> (tú)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {ROLE_LABEL[p.role] ?? p.role}
                    {email ? ` · ${email}` : ""}
                  </p>
                </div>
                {!p.is_active && (
                  <Chip size="sm" color="default" variant="soft" className="font-bold">
                    Inactivo
                  </Chip>
                )}
              </div>

              {!isSelf && p.role !== "admin" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TrainerResetPassword trainerId={p.id} email={email} />

                  <form action={setTrainerRoleAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="role"
                      value={p.role === "trainer" ? "coordinator" : "trainer"}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-muted"
                    >
                      {p.role === "trainer"
                        ? "Hacer coordinador"
                        : "Hacer entrenador"}
                    </Button>
                  </form>

                  <form action={toggleTrainerActiveAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="is_active" value={String(p.is_active)} />
                    <Button
                      type="submit"
                      variant={p.is_active ? "danger-soft" : "outline"}
                      size="sm"
                      className={
                        p.is_active
                          ? "rounded-full"
                          : "rounded-full border-brand/40 text-brand-600 hover:bg-brand/10"
                      }
                    >
                      {p.is_active ? "Desactivar" : "Reactivar"}
                    </Button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">
        Al desactivar: la cuenta queda bloqueada y pierde acceso a los datos de
        inmediato; su historial se conserva. Reasigna sus clientes desde
        Asignaciones.
      </p>
    </div>
  );
}
