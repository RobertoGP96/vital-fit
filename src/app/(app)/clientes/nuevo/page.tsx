import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClientAction } from "@/actions/clients";
import { ClientForm } from "@/components/client-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NuevoClientePage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Registrar cliente</h1>
      <ClientForm action={createClientAction} submitLabel="Registrar cliente" />
    </div>
  );
}
