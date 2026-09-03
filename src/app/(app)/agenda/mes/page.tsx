import type { Metadata } from "next";
import Link from "next/link";
import { Button, buttonVariants } from "@heroui/react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { requireCoordinatorOrAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveClients } from "@/lib/queries";
import { deleteBlockAction, toggleBlockAction } from "@/actions/blocks";
import { BlockForm } from "@/components/block-form";
import { BlockParticipantsForm } from "@/components/block-participants-form";
import { CopyMonthButton } from "@/components/copy-month-button";
import { participantSummary, toParticipants } from "@/lib/agenda";
import { formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Plan del mes" };

type PlanBlock = {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  is_active: boolean;
  session_block_participants: {
    client_id: string;
    clients: { full_name: string } | null;
  }[];
};

export default async function PlanMesPage(props: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireCoordinatorOrAdmin();
  const params = await props.searchParams;

  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "")
    ? params.mes!
    : format(new Date(), "yyyy-MM");
  const monthISO = `${mes}-01`;
  const monthDate = new Date(`${monthISO}T00:00:00`);
  const prevMonthISO = format(addMonths(monthDate, -1), "yyyy-MM-01");

  const supabase = await createClient();
  const [{ data: blocksData }, { count: prevCount }, clients] =
    await Promise.all([
      supabase
        .from("session_blocks")
        .select(
          "id, start_time, end_time, capacity, is_active, session_block_participants(client_id, clients(full_name))",
        )
        .eq("month", monthISO)
        .order("start_time"),
      supabase
        .from("session_blocks")
        .select("id", { count: "exact", head: true })
        .eq("month", prevMonthISO)
        .eq("is_active", true),
      getActiveClients(),
    ]);

  const blocks = (blocksData ?? []) as unknown as PlanBlock[];

  // Bloques activos del mes en los que ya está cada cliente: cada bloque
  // equivale a una sesión diaria, así que al llegar a su límite el cliente
  // deja de ser elegible en los demás bloques (el trigger lo refuerza).
  const blockUse: Record<string, number> = {};
  for (const b of blocks) {
    if (!b.is_active) continue;
    for (const p of b.session_block_participants ?? []) {
      blockUse[p.client_id] = (blockUse[p.client_id] ?? 0) + 1;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Plan del mes</h1>
        <Link
          href="/agenda"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "rounded-full font-semibold text-ink/70",
          })}
        >
          Ver agenda
        </Link>
      </div>
      <p className="-mt-2 text-sm text-muted">
        Los bloques horarios se repiten todos los días del mes; a cada bloque le
        asignas los clientes que entrenan en ese rango.
      </p>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <Link
          href={`/agenda/mes?mes=${format(addMonths(monthDate, -1), "yyyy-MM")}`}
          aria-label="Mes anterior"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            isIconOnly: true,
            className: "rounded-full",
          })}
        >
          <ChevronLeft size={18} />
        </Link>
        <p className="text-base font-bold capitalize">
          {format(monthDate, "MMMM yyyy", { locale: es })}
        </p>
        <Link
          href={`/agenda/mes?mes=${format(addMonths(monthDate, 1), "yyyy-MM")}`}
          aria-label="Mes siguiente"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            isIconOnly: true,
            className: "rounded-full",
          })}
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      {blocks.length === 0 && (prevCount ?? 0) > 0 && (
        <CopyMonthButton month={monthISO} />
      )}

      <details className="rounded-(--radius-card) border border-line bg-white p-4">
        <summary className="cursor-pointer font-bold text-brand-600">
          Nuevo bloque horario
        </summary>
        <div className="mt-4">
          <BlockForm month={monthISO} />
        </div>
      </details>

      {blocks.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Este mes aún no tiene bloques definidos.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocks.map((b) => {
            const participants = toParticipants(
              b.session_block_participants ?? [],
            );
            return (
              <li
                key={b.id}
                className={`rounded-2xl border border-line bg-white p-3.5 ${b.is_active ? "" : "opacity-60"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-11 w-1.5 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      {b.capacity != null && (
                        <span className="ml-1.5 text-sm font-medium text-muted">
                          · aforo {b.capacity}
                        </span>
                      )}
                      {!b.is_active && (
                        <span className="ml-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                          Pausado
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {participantSummary(participants)}
                    </p>
                  </div>
                  <form action={toggleBlockAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={String(b.is_active)}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-full text-muted"
                    >
                      {b.is_active ? "Pausar" : "Activar"}
                    </Button>
                  </form>
                  <form action={deleteBlockAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <Button
                      type="submit"
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      aria-label="Eliminar bloque"
                      className="shrink-0 rounded-full text-ink/30 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </form>
                </div>

                <details className="mt-2 border-t border-line pt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-600">
                    Editar clientes ({participants.length}
                    {b.capacity != null ? `/${b.capacity}` : ""})
                  </summary>
                  <div className="mt-3">
                    <BlockParticipantsForm
                      blockId={b.id}
                      clients={clients}
                      selected={participants.map((p) => p.id)}
                      use={blockUse}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
