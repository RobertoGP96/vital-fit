import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateClientAction } from "@/actions/clients";
import { ClientForm } from "@/components/client-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
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
      <h2 className="font-bold">Editar datos</h2>
      <ClientForm
        action={updateClientAction}
        defaults={c}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
