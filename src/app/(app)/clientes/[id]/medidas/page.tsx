import Link from "next/link";
import { Button, buttonVariants } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteMeasurementAction } from "@/actions/measurements";
import { formatShortDate, toDisplayUnit } from "@/lib/format";

type Rec = {
  id: string;
  measured_at: string;
  notes: string | null;
  measurement_values: {
    value: number;
    measurement_types: {
      name_es: string;
      canonical_unit: string;
      sort_order: number;
    } | null;
  }[];
};

export default async function MedidasPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: recordsData } = await supabase
    .from("measurement_records")
    .select(
      "id, measured_at, notes, measurement_values(value, measurement_types(name_es, canonical_unit, sort_order))",
    )
    .eq("client_id", id)
    .order("measured_at", { ascending: false })
    .limit(30);

  const records = (recordsData ?? []) as unknown as Rec[];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/clientes/${id}/medidas/nueva`}
        className={buttonVariants({
          variant: "primary",
          size: "lg",
          fullWidth: true,
          className: "gap-2 rounded-full font-semibold",
        })}
      >
        <Plus size={18} strokeWidth={2.5} />
        Nueva medición
      </Link>

      {records.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Sin mediciones todavía. Registra la primera para empezar a ver la
          evolución.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((r) => (
            <li
              key={r.id}
              className="rounded-(--radius-card) border border-line bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{formatShortDate(r.measured_at)}</p>
                <form action={deleteMeasurementAction}>
                  <input type="hidden" name="record_id" value={r.id} />
                  <input type="hidden" name="client_id" value={id} />
                  <Button
                    type="submit"
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar registro"
                    className="rounded-full text-ink/30 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </Button>
                </form>
              </div>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                {r.measurement_values
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.measurement_types?.sort_order ?? 999) -
                      (b.measurement_types?.sort_order ?? 999),
                  )
                  .map((v, i) => {
                    const d = toDisplayUnit(
                      v.value,
                      v.measurement_types?.canonical_unit ?? "cm",
                    );
                    return (
                      <div key={i}>
                        <dt className="text-xs text-muted">
                          {v.measurement_types?.name_es ?? "—"}
                        </dt>
                        <dd className="font-semibold">
                          {d.value} {d.unit}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
              {r.notes && (
                <p className="mt-2 text-sm text-muted">{r.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
