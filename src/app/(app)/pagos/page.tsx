import type { Metadata } from "next";
import Link from "next/link";
import { Button, buttonVariants } from "@heroui/react";
import { addMonths, format, startOfMonth } from "date-fns";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markPaymentPaidAction } from "@/actions/payments";
import { Fab } from "@/components/fab";
import { Avatar } from "@/components/avatar";
import { EstadoMensualidadChip } from "@/components/estado-mensualidad-chip";
import { PaymentStatusChip } from "@/components/payment-status-chip";
import { formatCup, formatShortDate } from "@/lib/format";
import {
  ordenarPorUrgencia,
  type EstadoMensualidad,
  type MensualidadRow,
} from "@/lib/mensualidades";

export const metadata: Metadata = { title: "Cobros" };

const FILTERS: { v: "" | EstadoMensualidad; l: string }[] = [
  { v: "", l: "Todos" },
  { v: "vencido", l: "Vencidos" },
  { v: "por_vencer", l: "Por vencer" },
  { v: "al_dia", l: "Al día" },
];

type ReciboRow = {
  id: string;
  client_id: string;
  amount: number;
  status: string;
  paid_on: string | null;
  due_on?: string | null;
  concept: string;
  clients: { full_name: string } | null;
};

export default async function CobrosPage(props: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await requireSession();
  const { estado } = await props.searchParams;
  const supabase = await createClient();

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(startOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd");
  const [
    { data: mensualidadesData },
    { data: cobradoData },
    { data: recibosData },
    { data: sinCerrarData },
  ] = await Promise.all([
    supabase.from("v_mensualidades").select("*"),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "pagado")
      .gte("paid_on", monthStart)
      .lt("paid_on", monthEnd),
    supabase
      .from("payments")
      .select("id, client_id, amount, status, paid_on, concept, clients(full_name)")
      .order("created_at", { ascending: false })
      .limit(15),
    // Recibos legados aún abiertos (el flujo nuevo solo crea 'pagado').
    supabase
      .from("payments")
      .select("id, client_id, amount, status, due_on, concept, clients(full_name)")
      .neq("status", "pagado")
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(30),
  ]);

  const todas = ordenarPorUrgencia(
    (mensualidadesData ?? []) as MensualidadRow[],
  );
  const filtro = FILTERS.some((f) => f.v === estado) ? estado : "";
  const clientes = filtro ? todas.filter((c) => c.estado === filtro) : todas;
  const cobradoMes = (cobradoData ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0,
  );
  const recibos = (recibosData ?? []) as unknown as ReciboRow[];
  const sinCerrar = (sinCerrarData ?? []) as unknown as ReciboRow[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Cobros</h1>
        <p className="text-sm text-muted">
          Cobrado este mes: <b className="text-ink">{formatCup(cobradoMes)}</b>
        </p>
      </div>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((f) => (
          <Link
            key={f.v}
            href={f.v ? `/pagos?estado=${f.v}` : "/pagos"}
            className={
              (filtro ?? "") === f.v
                ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted"
            }
          >
            {f.l}
          </Link>
        ))}
      </div>

      {clientes.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          {filtro ? "Ningún cliente en este estado." : "Sin clientes activos."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.map((c) => (
            <li
              key={c.client_id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5"
            >
              <Avatar name={c.full_name} size="md" shape="square" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/clientes/${c.client_id}/pagos`}
                  className="block truncate font-semibold text-ink hover:text-brand-600"
                >
                  {c.full_name}
                </Link>
                <p className="text-xs text-muted">
                  {c.plan_name ?? "Personalizado"}
                  {c.cubierto_hasta
                    ? ` · hasta ${formatShortDate(c.cubierto_hasta)}`
                    : " · sin períodos"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <EstadoMensualidadChip estado={c.estado} dias={c.dias} />
                {c.puede_cobrar && (
                  <Link
                    href={`/pagos/nuevo?cliente=${c.client_id}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className:
                        "rounded-full border-brand/40 font-bold text-brand-600 hover:bg-brand/10",
                    })}
                  >
                    Cobrar
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {sinCerrar.length > 0 && (
        <section className="rounded-(--radius-card) border border-amber-200 bg-white p-4">
          <h2 className="text-sm font-bold">
            Recibos sin cerrar ({sinCerrar.length})
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Pagos antiguos registrados como pendientes. Un admin puede cerrarlos.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {sinCerrar.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/clientes/${p.client_id}/pagos`}
                    className="font-semibold text-ink hover:text-brand-600"
                  >
                    {p.clients?.full_name ?? "—"}
                  </Link>
                  <p className="text-xs text-muted">
                    {formatCup(p.amount)}
                    {p.due_on ? ` · vencía ${formatShortDate(p.due_on)}` : ""}
                  </p>
                </div>
                <PaymentStatusChip status={p.status} />
                {session.role === "admin" && (
                  <form action={markPaymentPaidAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="client_id" value={p.client_id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-brand/40 font-bold text-brand-600 hover:bg-brand/10"
                    >
                      Marcar pagado
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="rounded-(--radius-card) border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold">
          Últimos cobros registrados
        </summary>
        {recibos.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sin cobros registrados.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {recibos.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/clientes/${p.client_id}/pagos`}
                    className="font-semibold text-ink hover:text-brand-600"
                  >
                    {p.clients?.full_name ?? "—"}
                  </Link>
                  <p className="text-xs text-muted">
                    {formatCup(p.amount)}
                    {p.paid_on ? ` · ${formatShortDate(p.paid_on)}` : ""}
                    {p.concept === "sesion_suelta"
                      ? " · sesión suelta"
                      : p.concept === "otro"
                        ? " · otro"
                        : ""}
                  </p>
                </div>
                {p.status !== "pagado" && <PaymentStatusChip status={p.status} />}
                {session.role === "admin" && p.status !== "pagado" && (
                  <form action={markPaymentPaidAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="client_id" value={p.client_id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-brand/40 font-bold text-brand-600 hover:bg-brand/10"
                    >
                      Marcar pagado
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>

      <Fab href="/pagos/nuevo" label="Cobrar" />
    </div>
  );
}
