import type { Metadata } from "next";
import { Button, Chip } from "@heroui/react";
import { requireCoordinatorOrAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { togglePlanActiveAction } from "@/actions/catalogs";
import { PlanForm, type PlanRow } from "@/components/catalog-admin";
import { formatCup } from "@/lib/format";

export const metadata: Metadata = { title: "Servicios y tarifas" };

type Row = PlanRow & { is_active: boolean };

// Catálogo de servicios del gimnasio: lo configura el coordinador o el admin.
// Cada servicio lleva su tarifa; el cobro de mensualidad la aplica solo.
export default async function ServiciosPage() {
  await requireCoordinatorOrAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("membership_plans")
    .select("id, name, description, price, duration_days, sessions_included, is_active")
    .order("is_active", { ascending: false })
    .order("name");
  const servicios = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Servicios y tarifas</h1>
        <p className="text-sm text-muted">
          Define los tipos de servicio que ofrece el gimnasio. Cada cliente usa
          el suyo y al cobrarle se aplica su tarifa.
        </p>
      </div>

      <details className="rounded-(--radius-card) border border-line bg-white p-4">
        <summary className="cursor-pointer font-bold text-brand-600">
          Nuevo servicio
        </summary>
        <div className="mt-4">
          <PlanForm />
        </div>
      </details>

      {servicios.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Aún no hay servicios. Crea el primero arriba.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {servicios.map((s) => (
            <li
              key={s.id}
              className={`rounded-2xl border border-line bg-white ${s.is_active ? "" : "opacity-60"}`}
            >
              <details>
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate text-xs text-muted">
                        {formatCup(s.price)} · {s.duration_days} días ·{" "}
                        {s.sessions_included
                          ? `${s.sessions_included} sesiones`
                          : "sesiones ilimitadas"}
                      </p>
                    </div>
                    {!s.is_active && (
                      <Chip color="default" variant="soft" size="sm">
                        Inactivo
                      </Chip>
                    )}
                  </div>
                </summary>

                <div className="flex flex-col gap-3 border-t border-ink/5 p-4">
                  <PlanForm plan={s} />
                  <form action={togglePlanActiveAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="is_active" value={String(s.is_active)} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={s.is_active ? "danger-soft" : "outline"}
                      className="rounded-full"
                    >
                      {s.is_active ? "Desactivar" : "Reactivar"}
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Un servicio inactivo deja de ofrecerse al configurar clientes; los
        períodos y pagos existentes no se tocan. Cambiar la tarifa aplica a los
        próximos cobros (cada período guarda el importe que se cobró).
      </p>
    </div>
  );
}
