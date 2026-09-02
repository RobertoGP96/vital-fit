import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import { AlertTriangle, BellOff, CalendarClock, CreditCard } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Notificaciones" };

type AlertRow = {
  client_id: string;
  full_name: string;
  plan_name: string | null;
  billing_plan_id: string | null;
  due_on: string | null;
  days_left: number | null;
  alert_level: "vencido" | "por_vencer" | "sin_membresia" | "al_dia";
};

export default async function NotificacionesPage() {
  await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_billing_alerts")
    .select(
      "client_id, full_name, plan_name, billing_plan_id, due_on, days_left, alert_level",
    )
    .neq("alert_level", "al_dia")
    .order("days_left", { ascending: true });

  const rows = (data ?? []) as AlertRow[];
  const vencidos = rows.filter((r) => r.alert_level === "vencido");
  const porVencer = rows.filter((r) => r.alert_level === "por_vencer");
  // Solo avisa de "sin membresía" cuando ya se configuró un tipo de pago:
  // el resto son clientes cuyo cobro aún no se gestiona en la app.
  const sinMembresia = rows.filter(
    (r) => r.alert_level === "sin_membresia" && r.billing_plan_id,
  );
  const total = vencidos.length + porVencer.length + sinMembresia.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Notificaciones</h1>
        <p className="text-sm text-muted">
          Avisos de cobro de tus clientes. Los clientes con el cobro pausado no
          aparecen aquí.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center">
          <BellOff size={28} className="text-muted" />
          <p className="text-sm font-semibold">Todo al día</p>
          <p className="text-xs text-muted">
            Cuando a un cliente le falten pocos días para su mensualidad (según
            su configuración de cobro) o se le venza, lo verás aquí.
          </p>
        </div>
      ) : (
        <>
          {vencidos.length > 0 && (
            <AlertSection
              icon={<AlertTriangle size={16} className="text-red-500" />}
              title={`Vencidos — faltan por pagar (${vencidos.length})`}
            >
              {vencidos.map((r) => (
                <AlertItem
                  key={r.client_id}
                  row={r}
                  tone="danger"
                  detail={`Venció el ${formatShortDate(r.due_on!)} · hace ${-r.days_left!} ${
                    r.days_left === -1 ? "día" : "días"
                  }`}
                />
              ))}
            </AlertSection>
          )}

          {porVencer.length > 0 && (
            <AlertSection
              icon={<CalendarClock size={16} className="text-amber-500" />}
              title={`Próximos a vencer (${porVencer.length})`}
            >
              {porVencer.map((r) => (
                <AlertItem
                  key={r.client_id}
                  row={r}
                  tone="warning"
                  detail={
                    r.days_left === 0
                      ? "Vence hoy"
                      : `Vence el ${formatShortDate(r.due_on!)} · en ${r.days_left} ${
                          r.days_left === 1 ? "día" : "días"
                        }`
                  }
                />
              ))}
            </AlertSection>
          )}

          {sinMembresia.length > 0 && (
            <AlertSection
              icon={<CreditCard size={16} className="text-muted" />}
              title={`Sin membresía activa (${sinMembresia.length})`}
            >
              {sinMembresia.map((r) => (
                <AlertItem
                  key={r.client_id}
                  row={r}
                  tone="muted"
                  detail="Tiene tipo de pago configurado, pero ninguna membresía. Registra su primer pago."
                />
              ))}
            </AlertSection>
          )}
        </>
      )}
    </div>
  );
}

function AlertSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold">
        {icon}
        {title}
      </h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

const TONE_BORDER: Record<string, string> = {
  danger: "border-red-200",
  warning: "border-amber-200",
  muted: "border-line",
};

function AlertItem({
  row,
  tone,
  detail,
}: {
  row: AlertRow;
  tone: "danger" | "warning" | "muted";
  detail: string;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 ${TONE_BORDER[tone]}`}
    >
      <Avatar name={row.full_name} size="md" shape="square" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/clientes/${row.client_id}/pagos`}
          className="block truncate font-semibold text-ink hover:text-brand-600"
        >
          {row.full_name}
        </Link>
        <p className="text-xs text-muted">
          {row.plan_name ? `${row.plan_name} · ` : ""}
          {detail}
        </p>
      </div>
      <Link
        href={`/pagos/nuevo?cliente=${row.client_id}`}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className:
            "shrink-0 rounded-full border-brand/40 font-bold text-brand-600 hover:bg-brand/10",
        })}
      >
        Cobrar
      </Link>
    </li>
  );
}
