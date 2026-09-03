import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import { AlertTriangle, BellOff, CalendarClock, CreditCard } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { formatShortDate } from "@/lib/format";
import { ordenarPorUrgencia, type MensualidadRow } from "@/lib/mensualidades";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificacionesPage() {
  await requireSession();
  const supabase = await createClient();

  // Avisos solo de clientes que esta cuenta puede cobrar (entrenador asignado
  // o admin): quien no puede actuar no recibe la alerta.
  const { data } = await supabase
    .from("v_mensualidades")
    .select("*")
    .in("estado", ["vencido", "por_vencer", "sin_mensualidad"])
    .eq("puede_cobrar", true);

  const rows = ordenarPorUrgencia((data ?? []) as MensualidadRow[]);
  const vencidos = rows.filter((r) => r.estado === "vencido");
  const porVencer = rows.filter((r) => r.estado === "por_vencer");
  // Solo avisa de "sin mensualidad" cuando ya se configuró un tipo de pago
  // (plan O período personalizado): el resto son clientes cuyo cobro aún no se
  // gestiona en la app.
  const sinMensualidad = rows.filter(
    (r) =>
      r.estado === "sin_mensualidad" &&
      (r.billing_plan_id || r.periodo_dias != null),
  );
  const total = vencidos.length + porVencer.length + sinMensualidad.length;

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
                  detail={`Venció el ${formatShortDate(r.cubierto_hasta!)} · hace ${-r.dias!} ${
                    r.dias === -1 ? "día" : "días"
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
                    r.dias === 0
                      ? "Vence hoy"
                      : `Vence el ${formatShortDate(r.cubierto_hasta!)} · en ${r.dias} ${
                          r.dias === 1 ? "día" : "días"
                        }`
                  }
                />
              ))}
            </AlertSection>
          )}

          {sinMensualidad.length > 0 && (
            <AlertSection
              icon={<CreditCard size={16} className="text-muted" />}
              title={`Sin mensualidad (${sinMensualidad.length})`}
            >
              {sinMensualidad.map((r) => (
                <AlertItem
                  key={r.client_id}
                  row={r}
                  tone="muted"
                  detail="Tiene tipo de pago configurado, pero ningún período. Registra su primer cobro."
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
  row: MensualidadRow;
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
