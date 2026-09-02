import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { ClientTabsNav } from "@/components/client-tabs-nav";

export default async function ClientLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, is_active, goals")
    .eq("id", id)
    .maybeSingle();

  // RLS: si no hay acceso (o no existe), no hay fila.
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Avatar name={client.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{client.full_name}</h1>
          <span
            className={
              client.is_active
                ? "inline-block rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand-600"
                : "inline-block rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-bold text-muted"
            }
          >
            {client.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </header>

      <ClientTabsNav clientId={client.id} />

      {props.children}
    </div>
  );
}
