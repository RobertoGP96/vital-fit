import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MeasurementForm } from "@/components/measurement-form";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Nueva medición" };

export default async function NuevaMedicionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: client }, { data: types }] = await Promise.all([
    supabase
      .from("clients")
      .select("preferred_units, sex")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("measurement_types")
      .select("id, code, name_es, canonical_unit, only_for_sex")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (!client) notFound();

  // Medidas restringidas por sexo (p. ej. pecho → masculino) solo se ofrecen
  // si el sexo del cliente coincide; sin sexo registrado, se ocultan.
  const visibleTypes = (types ?? []).filter(
    (t) => !t.only_for_sex || t.only_for_sex === client.sex,
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold">Nueva medición</h2>
      <MeasurementForm
        clientId={id}
        types={visibleTypes}
        defaultUnits={(client.preferred_units ?? "metric") as "metric" | "imperial"}
        today={todayISO()}
      />
    </div>
  );
}
