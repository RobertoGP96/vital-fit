import Link from "next/link";
import { Button, Card, buttonVariants } from "@heroui/react";
import { HandCoins, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markPaymentPaidAction } from "@/actions/payments";
import { getSessionInfo } from "@/lib/auth";
import { EstadoMensualidadChip } from "@/components/estado-mensualidad-chip";
import { PaymentStatusChip } from "@/components/payment-status-chip";
import { MembershipForm } from "@/components/membership-form";
import { BillingSettingsForm } from "@/components/billing-settings-form";
import { formatCup, formatShortDate } from "@/lib/format";
import type { MensualidadRow } from "@/lib/mensualidades";

const CONCEPT_LABEL: Record<string, string> = {
  mensualidad: "Mensualidad",
  sesion_suelta: "Sesión suelta",
  otro: "Otro",
};

export default async function PagosClientePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ configurar?: string }>;
}) {
  const { id } = await props.params;
  const { configurar } = await props.searchParams;
  const session = await getSessionInfo();
  const supabase = await createClient();

  const [
    { data: mensualidadData },
    { data: clientRow },
    { data: payments },
    { data: plans },
  ] = await Promise.all([
    supabase.from("v_mensualidades").select("*").eq("client_id", id).maybeSingle(),
    supabase
      .from("clients")
      .select(
        "is_active, billing_enabled, billing_plan_id, billing_period_days, billing_reminder_days",
      )
      .eq("id", id)
      .single(),
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

  const m = mensualidadData as MensualidadRow | null;
  const inactivo = clientRow?.is_active === false;
  const puedeCobrar = m?.puede_cobrar ?? false;
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

      {/* Una sola card: estado, tipo de pago y cobro en el mismo sitio */}
      <Card className="rounded-(--radius-card) border-line bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Mensualidad</h2>
          {m && <EstadoMensualidadChip estado={m.estado} dias={m.dias} />}
        </div>

        {inactivo ? (
          <p className="mt-2 text-sm text-muted">
            Cliente inactivo: su cobro no se gestiona. El historial queda abajo
            como referencia.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm">
              {m?.cubierto_hasta ? (
                <>
                  Cubierto hasta <b>{formatShortDate(m.cubierto_hasta)}</b>
                </>
              ) : (
                <span className="text-muted">
                  Sin períodos registrados: se crea solo con el primer cobro.
                </span>
              )}
            </p>
            <p className="text-xs text-muted">
              {m?.plan_name ?? "Personalizado"}
              {m?.precio != null ? ` · ${formatCup(Number(m.precio))}` : ""}
              {m?.periodo_dias ? ` cada ${m.periodo_dias} días` : ""}
            </p>

            {puedeCobrar ? (
              <Link
                href={`/pagos/nuevo?cliente=${id}`}
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  fullWidth: true,
                  className: "mt-3 gap-2 rounded-full font-semibold",
                })}
              >
                <HandCoins size={18} strokeWidth={2.5} />
                Cobrar mensualidad
              </Link>
            ) : (
              <p className="mt-3 text-xs text-muted">
                Solo el entrenador asignado o un admin pueden cobrar y cambiar
                la configuración de este cliente.
              </p>
            )}

            {puedeCobrar && (
              <details
                className="mt-3"
                open={justCreated || !billing.billing_enabled}
              >
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
            )}
          </>
        )}

        {session?.role === "admin" && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand-600">
              Ajuste manual del período (admin)
            </summary>
            <p className="mt-1 text-xs text-muted">
              Para corregir o extender la cobertura sin registrar un cobro
              (p. ej. cliente enfermo). El flujo normal es el botón de cobrar.
            </p>
            <div className="mt-3">
              <MembershipForm clientId={id} plans={plans ?? []} />
            </div>
          </details>
        )}
      </Card>

      <section>
        <h2 className="mb-2 font-bold">Historial de cobros</h2>
        {!payments || payments.length === 0 ? (
          <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
            Sin cobros registrados.
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
                {p.status !== "pagado" && <PaymentStatusChip status={p.status} />}
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
