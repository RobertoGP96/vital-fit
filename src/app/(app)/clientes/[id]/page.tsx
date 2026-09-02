import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";

const SEX_LABEL: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  otro: "Otro",
};

const MARITAL_LABEL: Record<string, string> = {
  soltero_a: "Soltero/a",
  casado_a: "Casado/a",
  divorciado_a: "Divorciado/a",
  viudo_a: "Viudo/a",
  union_libre: "Unión libre",
  otro: "Otro",
};

export default async function ClientDatosPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: c } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!c) notFound();

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-(--radius-card) border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Datos personales</h2>
          <Link
            href={`/clientes/${id}/editar`}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-600"
          >
            <Pencil size={14} />
            Editar
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="Teléfono" value={c.phone} />
          <Field label="Correo" value={c.email} />
          <Field
            label="Nacimiento"
            value={c.birth_date ? formatShortDate(c.birth_date) : null}
          />
          <Field label="Sexo" value={c.sex ? SEX_LABEL[c.sex] : null} />
          <Field
            label="Estado civil"
            value={c.marital_status ? MARITAL_LABEL[c.marital_status] : null}
          />
          <Field
            label="Estatura"
            value={c.height_cm ? `${c.height_cm} cm` : null}
          />
          <Field
            label="Unidades"
            value={c.preferred_units === "imperial" ? "Pulgadas/libras" : "Cm/kg"}
          />
        </dl>
      </section>

      {(c.emergency_contact_name || c.emergency_contact_phone) && (
        <section className="rounded-(--radius-card) border border-line bg-white p-5">
          <h2 className="mb-3 font-bold">Emergencia</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="Contacto" value={c.emergency_contact_name} />
            <Field label="Teléfono" value={c.emergency_contact_phone} />
          </dl>
        </section>
      )}

      {c.goals && (
        <section className="rounded-(--radius-card) border border-line bg-white p-5">
          <h2 className="mb-2 font-bold">Objetivos</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/80">{c.goals}</p>
        </section>
      )}

      {c.notes && (
        <section className="rounded-(--radius-card) border border-line bg-white p-5">
          <h2 className="mb-2 font-bold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/80">{c.notes}</p>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
