import Link from "next/link";
import { Button, Card, Chip, buttonVariants } from "@heroui/react";
import { PauseCircle, Plus, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markPaymentPaidAction } from "@/actions/payments";
import { getSessionInfo } from "@/lib/auth";
import { PaymentStatusChip } from "@/components/payment-status-chip";
import { MembershipForm } from "@/components/membership-form";
import { BillingSettingsForm } from "@/components/billing-settings-form";
import { formatCup, formatShortDate, todayISO } from "@/lib/format";

const CONCEPT_LABEL: Record<string, string> = {
  mensualidad: "Mensualidad",
  sesion_suelta: "Sesión suelta",
  otro: "Otro",
};

function BillingStateChip({
  enabled,
  endsOn,
  reminderDays,
}: {
  enabled: boolean;
  endsOn: string | null;
  reminderDays: number;
}) {
  if (!enabled) {
    return (
      <Chip color="warning" variant="soft" size="sm" className="gap-1">
        <PauseCircle size={13} /> Cobro pausado
      </Chip>
    );
  }
  if (!endsOn) return null;
  const today = todayISO();
  const daysLeft = Math.round(
    (new Date(`${endsOn}T00:00:00`).getTime() -
      new Date(`${today}T00:00:00`).getTime()) /
      86_400_000,
  );
  if (daysLeft < 0) {
    return (
      <Chip color="danger" variant="soft" size="sm">
        Venció hace {-daysLeft} {daysLeft === -1 ? "día" : "días"}
      </Chip>
    );
  }
  if (daysLeft <= reminderDays) {
    return (
      <Chip color="warning" variant="soft" size="sm">
        Vence en {daysLeft} {daysLeft === 1 ? "día" : "días"}
      </Chip>
    );
  }
  return (
    <Chip color="success" variant="soft" size="sm">
      Al día
    </Chip>
  );
}

export default async function PagosClientePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ configurar?: string }>;
}) {
  const { id } = await props.params;
  const { configurar } = await props.searchParams;
  const session = await getSessionInfo();
  const supabase = await createClient();

  const [
    { data: clientRow },
    { data: memberships },
    { data: payments },
    { data: plans },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "billing_enabled, billing_plan_id, billing_period_days, billing_reminder_days",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("client_memberships")
      .select("id, starts_on, ends_on, price_agreed, status, membership_plans(name)")
      .eq("client_id", id)
      .order("ends_on", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select(
        "id, concept, amount, method, status, paid_on, due_on, period_start, period_end",
      )
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
  const billing = {
    billing_enabled: clientRow?.billing_enabled ?? true,
    billing_plan_id: clientRow?.billing_plan_id ?? null,
    billing_period_days: clientRow?.billing_period_days ?? null,
    billing_reminder_days: clientRow?.billing_reminder_days ?? 5,
  };
  const justCreated = configurar === "1";

  return (
    <div className="flex flex-col gap-4">
      {justCreated && (
        <div className="rounded-(--radius-card) border border-brand/30 bg-brand/10 p-3.5 text-sm">
          <p className="font-bold text-brand-600">Cliente registrado ✓</p>
          <p className="mt-0.5 text-muted">
            Configura ahora su tipo de pago para que el sistema avise cuando
            toque la mensualidad.
          </p>
        </div>
      )}

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
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Configuración de cobro</h2>
          <BillingStateChip
            enabled={billing.billing_enabled}
            endsOn={current?.ends_on ?? null}
            reminderDays={billing.billing_reminder_days}
          />
        </div>
        <details className="mt-2" open={justCreated || !billing.billing_enabled}>
          <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-600">
            <Settings2 size={15} />
            Tipo de pago, período y avisos
          </summary>
          <div className="mt-3">
            <BillingSettingsForm
              clientId={id}
              plans={plans ?? []}
              settings={billing}
            />
          </div>
        </details>
      </Card>

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
          <p className="text-sm text-muted">
            Sin membresía registrada. Se creará sola al registrar el primer pago
            de mensualidad, o créala aquí manualmente.
          </p>
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
