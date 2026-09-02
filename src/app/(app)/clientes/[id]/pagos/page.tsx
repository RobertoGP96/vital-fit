import Link from "next/link";
import { Button, Card, Chip, buttonVariants } from "@heroui/react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markPaymentPaidAction } from "@/actions/payments";
import { getSessionInfo } from "@/lib/auth";
import { PaymentStatusChip } from "@/components/payment-status-chip";
import { MembershipForm } from "@/components/membership-form";
import { formatCup, formatShortDate } from "@/lib/format";

const CONCEPT_LABEL: Record<string, string> = {
  mensualidad: "Mensualidad",
  sesion_suelta: "Sesión suelta",
  otro: "Otro",
};

export default async function PagosClientePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await getSessionInfo();
  const supabase = await createClient();

  const [{ data: memberships }, { data: payments }, { data: plans }] =
    await Promise.all([
      supabase
        .from("client_memberships")
        .select("id, starts_on, ends_on, price_agreed, status, membership_plans(name)")
        .eq("client_id", id)
        .order("ends_on", { ascending: false })
        .limit(10),
      supabase
        .from("payments")
        .select("id, concept, amount, method, status, paid_on, due_on, period_start, period_end")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("membership_plans")
        .select("id, name, price, duration_days")
        .eq("is_active", true)
        .order("name"),
    ]);

  const current = memberships?.[0];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/pagos/nuevo?cliente=${id}`}
        className={buttonVariants({
          variant: "primary",
          size: "lg",
          fullWidth: true,
          className: "gap-2 rounded-full font-semibold",
        })}
      >
        <Plus size={18} strokeWidth={2.5} />
        Registrar pago
      </Link>

      <Card className="rounded-(--radius-card) border-line bg-white p-4">
        <h2 className="mb-2 font-bold">Membresía</h2>
        {current ? (
          <p className="text-sm">
            {(current.membership_plans as unknown as { name: string } | null)
              ?.name ?? "Personalizada"}{" "}
            · vence <b>{formatShortDate(current.ends_on)}</b> ·{" "}
            {formatCup(current.price_agreed)}{" "}
            <Chip size="sm" variant="soft" className="ml-1">
              {current.status}
            </Chip>
          </p>
        ) : (
          <p className="text-sm text-muted">Sin membresía registrada.</p>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand-600">
            Nueva membresía
          </summary>
          <div className="mt-3">
            <MembershipForm clientId={id} plans={plans ?? []} />
          </div>
        </details>
      </Card>

      <section>
        <h2 className="mb-2 font-bold">Pagos</h2>
        {!payments || payments.length === 0 ? (
          <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
            Sin pagos registrados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {formatCup(p.amount)}{" "}
                    <span className="text-xs font-medium text-muted">
                      · {CONCEPT_LABEL[p.concept] ?? p.concept}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {p.paid_on
                      ? `Pagado el ${formatShortDate(p.paid_on)}`
                      : p.due_on
                        ? `Vence el ${formatShortDate(p.due_on)}`
                        : "—"}
                    {p.period_start && p.period_end
                      ? ` · cubre ${formatShortDate(p.period_start)}–${formatShortDate(p.period_end)}`
                      : ""}
                  </p>
                </div>
                <PaymentStatusChip status={p.status} />
                {session?.role === "admin" && p.status !== "pagado" && (
                  <form action={markPaymentPaidAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="client_id" value={id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
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
      </section>
    </div>
  );
}
