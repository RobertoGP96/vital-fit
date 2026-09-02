import type { Metadata } from "next";
import { Button, Chip } from "@heroui/react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { togglePlanActiveAction } from "@/actions/catalogs";
import { PlanForm, type PlanRow } from "@/components/catalog-admin";
import { formatCup } from "@/lib/format";

export const metadata: Metadata = { title: "Planes de membresía" };

type Row = PlanRow & { is_active: boolean };

export default async function PlanesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("membership_plans")
    .select("id, name, description, price, duration_days, sessions_included, is_active")
    .order("is_active", { ascending: false })
    .order("name");
  const plans = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Planes de membresía</h1>

      <details className="rounded-(--radius-card) border border-line bg-white p-4">
        <summary className="cursor-pointer font-bold text-brand-600">
          Nuevo plan
        </summary>
        <div className="mt-4">
          <PlanForm />
        </div>
      </details>

      {plans.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Aún no hay planes. Crea el primero arriba.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className={`rounded-2xl border border-line bg-white ${p.is_active ? "" : "opacity-60"}`}
            >
              <details>
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted">
                        {formatCup(p.price)} · {p.duration_days} días ·{" "}
                        {p.sessions_included
                          ? `${p.sessions_included} sesiones`
                          : "sesiones ilimitadas"}
                      </p>
                    </div>
                    {!p.is_active && (
                      <Chip color="default" variant="soft" size="sm">
                        Inactivo
                      </Chip>
                    )}
                  </div>
                </summary>

                <div className="flex flex-col gap-3 border-t border-ink/5 p-4">
                  <PlanForm plan={p} />
                  <form action={togglePlanActiveAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="is_active" value={String(p.is_active)} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={p.is_active ? "danger-soft" : "outline"}
                      className="rounded-full"
                    >
                      {p.is_active ? "Desactivar" : "Reactivar"}
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Un plan inactivo deja de ofrecerse al crear membresías nuevas; las
        membresías y pagos existentes no se tocan. Cambiar el precio no afecta a
        las membresías ya creadas (cada una guarda su precio acordado).
      </p>
    </div>
  );
}
