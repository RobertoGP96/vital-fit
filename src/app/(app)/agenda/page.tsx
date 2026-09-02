import type { Metadata } from "next";
import Link from "next/link";
import { Chip, buttonVariants } from "@heroui/react";
import { CalendarCog, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { openBlockSessionAction } from "@/actions/sessions";
import {
  mergeDayEntries,
  monthOf,
  participantSummary,
  type BlockRow,
  type DayEntry,
  type SessionRow,
} from "@/lib/agenda";
import { formatTime, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage(props: {
  searchParams: Promise<{ semana?: string; dia?: string }>;
}) {
  const session = await requireSession();
  const params = await props.searchParams;
  const canPlan = session.role !== "trainer";

  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.semana ?? "")
    ? new Date(`${params.semana}T00:00:00`)
    : new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const fromISO = format(weekStart, "yyyy-MM-dd");
  const toISO = format(days[6], "yyyy-MM-dd");
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? "")
    ? params.dia!
    : todayISO() >= fromISO && todayISO() <= toISO
      ? todayISO()
      : fromISO;

  // La semana puede abarcar dos meses: se traen los bloques de ambos.
  const months = [...new Set(days.map((d) => monthOf(format(d, "yyyy-MM-dd"))))];

  const supabase = await createClient();
  const [{ data: blocksData }, { data: sessionsData }] = await Promise.all([
    supabase
      .from("session_blocks")
      .select(
        "id, month, start_time, end_time, capacity, session_block_participants(client_id, clients(full_name))",
      )
      .in("month", months)
      .eq("is_active", true)
      .order("start_time"),
    supabase
      .from("sessions")
      .select(
        "id, block_id, session_date, start_time, duration_min, status, capacity, session_participants(client_id, clients(full_name)), attendance_records(client_id, attended)",
      )
      .gte("session_date", fromISO)
      .lte("session_date", toISO)
      .order("start_time"),
  ]);

  const blocksByMonth = new Map<string, BlockRow[]>();
  for (const b of (blocksData ?? []) as unknown as BlockRow[]) {
    const list = blocksByMonth.get(b.month) ?? [];
    list.push(b);
    blocksByMonth.set(b.month, list);
  }
  const sessionsByDay = new Map<string, SessionRow[]>();
  for (const s of (sessionsData ?? []) as unknown as SessionRow[]) {
    const list = sessionsByDay.get(s.session_date) ?? [];
    list.push(s);
    sessionsByDay.set(s.session_date, list);
  }

  const dayCount = (iso: string) =>
    (blocksByMonth.get(monthOf(iso))?.length ?? 0) +
    (sessionsByDay.get(iso)?.filter((s) => !s.block_id).length ?? 0);

  const entries = mergeDayEntries(
    blocksByMonth.get(monthOf(selectedDay)) ?? [],
    sessionsByDay.get(selectedDay) ?? [],
  );

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    p.set("semana", over.semana ?? fromISO);
    p.set("dia", over.dia ?? selectedDay);
    return `/agenda?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Agenda</h1>
        {canPlan && (
          <Link
            href={`/agenda/mes?mes=${selectedDay.slice(0, 7)}`}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "rounded-full font-semibold text-ink/70",
            })}
          >
            <CalendarCog size={15} />
            Plan del mes
          </Link>
        )}
      </div>

      {/* Navegación de semana */}
      <div className="flex items-center justify-between">
        <Link
          href={qs({
            semana: format(addDays(weekStart, -7), "yyyy-MM-dd"),
            dia: format(addDays(weekStart, -7), "yyyy-MM-dd"),
          })}
          aria-label="Semana anterior"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            isIconOnly: true,
            className: "rounded-full",
          })}
        >
          <ChevronLeft size={18} />
        </Link>
        <p className="text-sm font-semibold capitalize text-ink/70">
          {format(weekStart, "d MMM", { locale: es })} —{" "}
          {format(days[6], "d MMM yyyy", { locale: es })}
        </p>
        <Link
          href={qs({
            semana: format(addDays(weekStart, 7), "yyyy-MM-dd"),
            dia: format(addDays(weekStart, 7), "yyyy-MM-dd"),
          })}
          aria-label="Semana siguiente"
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

      {/* Franja de días */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const active = iso === selectedDay;
          const count = dayCount(iso);
          return (
            <Link
              key={iso}
              href={qs({ dia: iso })}
              className={
                active
                  ? "flex flex-col items-center rounded-2xl bg-ink py-2.5 text-cream"
                  : "flex flex-col items-center rounded-2xl border border-line bg-white py-2.5 text-ink/70"
              }
            >
              <span className="text-[11px] font-medium capitalize">
                {format(d, "EEE", { locale: es })}
              </span>
              <span className="text-lg font-bold">{format(d, "d")}</span>
              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${count > 0 ? "bg-brand" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>

      {/* Sesiones (bloques) del día */}
      {entries.length === 0 ? (
        <div className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          <p>Este mes aún no tiene sesiones definidas.</p>
          {canPlan && (
            <Link
              href={`/agenda/mes?mes=${selectedDay.slice(0, 7)}`}
              className="mt-1 inline-block font-semibold text-brand-600"
            >
              Definir el plan del mes
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.key}>
              {e.sessionId ? (
                <Link
                  href={`/agenda/sesion/${e.sessionId}`}
                  className={`flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left hover:border-brand/40 ${e.status === "cancelada" ? "opacity-50" : ""}`}
                >
                  <EntryContent entry={e} />
                </Link>
              ) : (
                <form action={openBlockSessionAction}>
                  <input type="hidden" name="block_id" value={e.blockId!} />
                  <input type="hidden" name="date" value={selectedDay} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left hover:border-brand/40"
                  >
                    <EntryContent entry={e} />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryContent({ entry: e }: { entry: DayEntry }) {
  const n = e.participants.length;
  return (
    <>
      <span className="h-11 w-1.5 shrink-0 rounded-full bg-brand" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {formatTime(e.startTime)} – {formatTime(e.endTime)}
          {e.capacity != null && (
            <span className="ml-1.5 text-sm font-medium text-muted">
              · aforo {e.capacity}
            </span>
          )}
        </p>
        <p className="truncate text-sm text-muted">
          {participantSummary(e.participants)}
        </p>
      </div>
      {n > 0 && (
        <Chip size="sm" color="accent" variant="soft" className="shrink-0 font-bold">
          {e.tracked > 0 ? `${e.attended}/${n} ✓` : `${n} cliente${n === 1 ? "" : "s"}`}
        </Chip>
      )}
      {e.status !== "programada" && (
        <span className="shrink-0 text-xs font-semibold capitalize text-muted">
          {e.status}
        </span>
      )}
    </>
  );
}
