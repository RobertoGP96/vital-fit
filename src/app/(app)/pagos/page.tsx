import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@heroui/react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markPaymentPaidAction } from "@/actions/payments";
import { Fab } from "@/components/fab";
import { PaymentStatusChip } from "@/components/payment-status-chip";
import { formatCup, formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Pagos" };

const FILTERS = [
  { v: "", l: "Todos" },
  { v: "pagado", l: "Pagados" },
  { v: "pendiente", l: "Pendientes" },
  { v: "vencido", l: "Vencidos" },
];

type Row = {
  id: string;
  client_id: string;
  concept: string;
  amount: number;
  status: string;
  paid_on: string | null;
  due_on: string | null;
  clients: { full_name: string } | null;
};

export default async function PagosPage(props: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await requireSession();
  const { estado } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("payments")
    .select("id, client_id, concept, amount, status, paid_on, due_on, clients(full_name)")
    .order("created_at", { ascending: false })
    .limit(80);
  if (estado && ["pagado", "pendiente", "vencido"].includes(estado)) {
    query = query.eq("status", estado);
  }

  const { data } = await query;
  const payments = (data ?? []) as unknown as Row[];
  const totalVisible = payments.reduce(
    (sum, p) => (p.status === "pagado" ? sum + Number(p.amount) : sum),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Pagos</h1>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((f) => (
          <Link
            key={f.v}
            href={f.v ? `/pagos?estado=${f.v}` : "/pagos"}
            className={
              (estado ?? "") === f.v
                ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted"
            }
          >
            {f.l}
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted">
        Cobrado (en lista): <b className="text-ink">{formatCup(totalVisible)}</b>
      </p>

      {payments.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Sin pagos {estado ? `en estado "${estado}"` : "registrados"}.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/clientes/${p.client_id}/pagos`}
                  className="font-semibold text-ink hover:text-brand-600"
                >
                  {p.clients?.full_name ?? "—"}
                </Link>
                <p className="text-xs text-muted">
                  {formatCup(p.amount)} ·{" "}
                  {p.paid_on
                    ? `pagado ${formatShortDate(p.paid_on)}`
                    : p.due_on
                      ? `vence ${formatShortDate(p.due_on)}`
                      : p.concept}
                </p>
              </div>
              <PaymentStatusChip status={p.status} />
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

      <Fab href="/pagos/nuevo" label="Registrar pago" />
    </div>
  );
}
