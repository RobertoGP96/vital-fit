import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { EstadoMensualidadChip } from "@/components/estado-mensualidad-chip";
import { CobroMensualidadForm } from "@/components/cobro-mensualidad-form";
import { PagoExtraForm } from "@/components/pago-extra-form";
import { formatShortDate } from "@/lib/format";
import {
  ordenarPorUrgencia,
  type MensualidadRow,
} from "@/lib/mensualidades";

export const metadata: Metadata = { title: "Cobrar" };

export default async function CobrarPage(props: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  await requireSession();
  const { cliente } = await props.searchParams;
  const supabase = await createClient();

  // RLS: un entrenador solo ve (y puede cobrar a) sus clientes asignados.
  if (cliente) {
    const { data } = await supabase
      .from("v_mensualidades")
      .select("*")
      .eq("client_id", cliente)
      .maybeSingle();
    const m = data as MensualidadRow | null;

    if (m) {
      return (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold">Cobrar</h1>

          <div className="flex items-center gap-3 rounded-(--radius-card) border border-line bg-white p-3.5">
            <Avatar name={m.full_name} size="md" shape="square" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/clientes/${m.client_id}/pagos`}
                className="block truncate font-semibold text-ink hover:text-brand-600"
              >
                {m.full_name}
              </Link>
              <p className="text-xs text-muted">
                {m.plan_name ?? "Personalizado"}
                {m.cubierto_hasta
                  ? ` · cubierto hasta ${formatShortDate(m.cubierto_hasta)}`
                  : " · sin períodos registrados"}
              </p>
            </div>
            <EstadoMensualidadChip estado={m.estado} dias={m.dias} />
          </div>

          {m.puede_cobrar ? (
            <>
              <CobroMensualidadForm
                clientId={m.client_id}
                precio={m.precio === null ? null : Number(m.precio)}
                periodoDias={m.periodo_dias}
                planName={m.plan_name}
                cubiertoHasta={m.cubierto_hasta}
                importeEditable={m.importe_editable}
              />

              <details className="rounded-(--radius-card) border border-line bg-white p-4">
                <summary className="cursor-pointer text-sm font-bold">
                  Otro cobro (sesión suelta / otro)
                </summary>
                <div className="mt-3">
                  <PagoExtraForm clientId={m.client_id} />
                </div>
              </details>
            </>
          ) : (
            <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
              Solo el entrenador asignado o un admin pueden cobrar a este
              cliente.
            </p>
          )}
        </div>
      );
    }
  }

  // Sin cliente elegido: elegir a quién cobrar (solo clientes que esta cuenta
  // puede cobrar), los más urgentes primero.
  const { data } = await supabase
    .from("v_mensualidades")
    .select("*")
    .eq("puede_cobrar", true);
  const clientes = ordenarPorUrgencia((data ?? []) as MensualidadRow[]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Cobrar</h1>
        <p className="text-sm text-muted">¿A quién le vas a cobrar?</p>
      </div>

      {clientes.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Sin clientes activos.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.map((c) => (
            <li key={c.client_id}>
              <Link
                href={`/pagos/nuevo?cliente=${c.client_id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition-colors hover:border-brand"
              >
                <Avatar name={c.full_name} size="md" shape="square" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.full_name}</p>
                  <p className="text-xs text-muted">
                    {c.plan_name ?? "Personalizado"}
                    {c.cubierto_hasta
                      ? ` · hasta ${formatShortDate(c.cubierto_hasta)}`
                      : ""}
                  </p>
                </div>
                <EstadoMensualidadChip estado={c.estado} dias={c.dias} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
