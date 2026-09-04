import type { Metadata } from "next";
import { Button, Chip } from "@heroui/react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleMeasurementTypeActiveAction } from "@/actions/catalogs";
import {
  MeasurementTypeForm,
  type MeasurementTypeRow,
} from "@/components/catalog-admin";
import { displayUnit } from "@/lib/format";

export const metadata: Metadata = { title: "Tipos de medida" };

type Row = MeasurementTypeRow & { is_active: boolean };

export default async function TiposMedidaPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("measurement_types")
    .select("id, code, name_es, canonical_unit, sort_order, is_active, only_for_sex")
    .order("is_active", { ascending: false })
    .order("sort_order");
  const types = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Tipos de medida</h1>

      <details className="rounded-(--radius-card) border border-line bg-white p-4">
        <summary className="cursor-pointer font-bold text-brand-600">
          Nueva medida
        </summary>
        <div className="mt-4">
          <MeasurementTypeForm />
        </div>
      </details>

      {types.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Aún no hay tipos de medida. Crea el primero arriba.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {types.map((t) => (
            <li
              key={t.id}
              className={`rounded-2xl border border-line bg-white ${t.is_active ? "" : "opacity-60"}`}
            >
              <details>
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.name_es}</p>
                      <p className="truncate text-xs text-muted">
                        Orden {t.sort_order} · {t.code}
                      </p>
                    </div>
                    <Chip color="accent" variant="soft" size="sm">
                      {displayUnit(t.canonical_unit)}
                    </Chip>
                    {t.only_for_sex && (
                      <Chip color="default" variant="soft" size="sm">
                        {t.only_for_sex === "masculino" ? "Solo hombres" : "Solo mujeres"}
                      </Chip>
                    )}
                    {!t.is_active && (
                      <Chip color="default" variant="soft" size="sm">
                        Inactivo
                      </Chip>
                    )}
                  </div>
                </summary>

                <div className="flex flex-col gap-3 border-t border-ink/5 p-4">
                  <MeasurementTypeForm type={t} />
                  <form action={toggleMeasurementTypeActiveAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="is_active" value={String(t.is_active)} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={t.is_active ? "danger-soft" : "outline"}
                      className="rounded-full"
                    >
                      {t.is_active ? "Desactivar" : "Reactivar"}
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Una medida inactiva desaparece del formulario de nuevas mediciones; el
        histórico y las gráficas de los clientes se conservan. La unidad es fija
        desde la creación.
      </p>
    </div>
  );
}
