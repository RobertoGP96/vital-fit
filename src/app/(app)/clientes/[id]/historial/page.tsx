import { Button, Chip } from "@heroui/react";
import { createClient } from "@/lib/supabase/server";
import { toggleMedicalCurrentAction } from "@/actions/medical";
import { MedicalRecordForm } from "@/components/medical-record-form";
import { formatShortDate } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  patologia: "Patología",
  lesion: "Lesión",
  alergia: "Alergia",
  medicacion: "Medicación",
  cirugia: "Cirugía",
  nota_clinica: "Nota clínica",
  otro: "Otro",
};

type Rec = {
  id: string;
  record_type: string;
  title: string;
  description: string | null;
  diagnosed_on: string | null;
  is_current: boolean;
};

export default async function HistorialPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("medical_records")
    .select("id, record_type, title, description, diagnosed_on, is_current")
    .eq("client_id", id)
    .order("is_current", { ascending: false })
    .order("created_at", { ascending: false });

  const records = (data ?? []) as Rec[];
  const current = records.filter((r) => r.is_current);
  const past = records.filter((r) => !r.is_current);

  return (
    <div className="flex flex-col gap-4">
      <MedicalRecordForm clientId={id} />

      {records.length === 0 && (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Historia clínica vacía.
        </p>
      )}

      {current.length > 0 && (
        <Section title="Condiciones actuales" records={current} clientId={id} />
      )}
      {past.length > 0 && (
        <Section title="Histórico" records={past} clientId={id} dim />
      )}
    </div>
  );
}

function Section({
  title,
  records,
  clientId,
  dim = false,
}: {
  title: string;
  records: Rec[];
  clientId: string;
  dim?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-2 font-bold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {records.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl border border-line bg-white p-4 ${dim ? "opacity-70" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Chip size="sm" variant="soft" className="mb-1">
                  {TYPE_LABEL[r.record_type] ?? r.record_type}
                </Chip>
                <p className="font-semibold">{r.title}</p>
                {r.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                    {r.description}
                  </p>
                )}
                {r.diagnosed_on && (
                  <p className="mt-1 text-xs text-muted">
                    Desde {formatShortDate(r.diagnosed_on)}
                  </p>
                )}
              </div>
              <form action={toggleMedicalCurrentAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="is_current" value={String(r.is_current)} />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-full text-muted"
                >
                  {r.is_current ? "Marcar resuelta" : "Reactivar"}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
