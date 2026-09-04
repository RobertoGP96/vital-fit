import Link from "next/link";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EvolutionChart, type SeriesPoint } from "@/components/evolution-chart";
import { formatShortDate, toDisplayUnit, todayISO } from "@/lib/format";

type Summary = {
  type_code: string;
  type_name: string;
  canonical_unit: string;
  first_date: string;
  first_value: number;
  last_date: string;
  last_value: number;
  delta: number;
};

type SeriesRow = {
  measured_at: string;
  type_code: string;
  type_name: string;
  canonical_unit: string;
  value: number;
};

const PRESETS = [
  { l: "30 días", days: 30 },
  { l: "90 días", days: 90 },
  { l: "6 meses", days: 182 },
  { l: "Todo", days: 3650 },
];

export default async function InformePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;

  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta ?? "") ? sp.hasta! : todayISO();
  const defaultDesde = new Date();
  defaultDesde.setDate(defaultDesde.getDate() - 90);
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(sp.desde ?? "")
    ? sp.desde!
    : defaultDesde.toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: summaryData }, { data: seriesData }, { data: attendance }] =
    await Promise.all([
      supabase.rpc("get_progress_summary", {
        p_client_id: id,
        p_from: desde,
        p_to: hasta,
      }),
      supabase.rpc("get_measurement_series", {
        p_client_id: id,
        p_from: desde,
        p_to: hasta,
        p_type_codes: null,
      }),
      supabase
        .rpc("get_attendance_summary", {
          p_client_id: id,
          p_from: desde,
          p_to: hasta,
        })
        .maybeSingle(),
    ]);

  const summary = (summaryData ?? []) as Summary[];
  const series = (seriesData ?? []) as SeriesRow[];
  const byType = new Map<string, SeriesPoint[]>();
  for (const r of series) {
    const list = byType.get(r.type_code) ?? [];
    list.push({
      date: r.measured_at,
      value: toDisplayUnit(Number(r.value), r.canonical_unit).value,
    });
    byType.set(r.type_code, list);
  }

  const att = attendance as {
    total_sessions: number;
    attended: number;
    missed: number;
    not_tracked: number;
    attendance_pct: number | null;
  } | null;

  const presetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Rango */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {PRESETS.map((p) => {
          const from = presetDate(p.days);
          const active = desde === from || (p.days === 90 && !sp.desde);
          return (
            <Link
              key={p.days}
              href={`/clientes/${id}/informe?desde=${from}&hasta=${todayISO()}`}
              className={
                active
                  ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                  : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted"
              }
            >
              {p.l}
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-muted">
        Del <b className="text-ink">{formatShortDate(desde)}</b> al{" "}
        <b className="text-ink">{formatShortDate(hasta)}</b>
      </p>

      {/* Asistencia del período */}
      {att && att.total_sessions > 0 && (
        <section className="grid grid-cols-4 gap-2 rounded-(--radius-card) border border-line bg-white p-4 text-center">
          <Stat label="Sesiones" value={String(att.total_sessions)} />
          <Stat label="Asistió" value={String(att.attended)} />
          <Stat label="Faltó" value={String(att.missed)} />
          <Stat
            label="Asistencia"
            value={att.attendance_pct != null ? `${att.attendance_pct}%` : "—"}
          />
        </section>
      )}

      {summary.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Sin mediciones en este período. Registra medidas para ver la
          evolución.
        </p>
      ) : (
        summary.map((s) => {
          const data = byType.get(s.type_code) ?? [];
          const first = toDisplayUnit(Number(s.first_value), s.canonical_unit);
          const last = toDisplayUnit(Number(s.last_value), s.canonical_unit);
          const { value: delta, unit } = toDisplayUnit(
            Number(s.delta),
            s.canonical_unit,
          );
          const improving = delta < 0; // en medidas corporales, bajar suele ser progreso
          return (
            <section
              key={s.type_code}
              className="rounded-(--radius-card) border border-line bg-white p-4"
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-bold">{s.type_name}</h2>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    delta === 0
                      ? "bg-ink/5 text-muted"
                      : improving
                        ? "bg-brand/15 text-brand-600"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {delta === 0 ? (
                    <Minus size={12} />
                  ) : improving ? (
                    <TrendingDown size={12} />
                  ) : (
                    <TrendingUp size={12} />
                  )}
                  {delta > 0 ? "+" : ""}
                  {delta} {unit}
                </span>
              </div>
              <p className="mb-2 text-xs text-muted">
                {first.value} {unit} ({formatShortDate(s.first_date)}) →{" "}
                {last.value} {unit} ({formatShortDate(s.last_date)})
              </p>
              {data.length > 1 ? (
                <EvolutionChart data={data} unit={unit} />
              ) : (
                <p className="text-xs text-muted">
                  Se necesitan al menos 2 mediciones para graficar.
                </p>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
