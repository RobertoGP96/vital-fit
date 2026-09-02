import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "@/components/payment-form";

export const metadata: Metadata = { title: "Registrar pago" };

export default async function NuevoPagoPage(props: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  await requireSession();
  const { cliente } = await props.searchParams;
  const supabase = await createClient();

  // RLS: un entrenador solo ve (y puede cobrar a) sus clientes asignados.
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Registrar pago</h1>
      <PaymentForm clients={clients ?? []} defaultClientId={cliente} />
    </div>
  );
}
