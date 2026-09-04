"use client";

import { useState } from "react";
import Link from "next/link";
import { Chip, buttonVariants } from "@heroui/react";
import { CalendarCog, ChevronLeft, ChevronRight } from "lucide-react";
import { openBlockSessionAction } from "@/actions/sessions";
import { participantSummary, skyToneOf, type DayEntry } from "@/lib/agenda";
import { formatTime } from "@/lib/format";

export type AgendaDayInfo = {
  iso: string;
  weekday: string;
  dayNum: string;
  count: number;
};

/* La semana completa ya viene cargada del servidor: cambiar de día filtra en
   local y sincroniza ?dia con replaceState (shallow), sin round-trip. La
   página monta este componente con key={fromISO} para resetear el día
   seleccionado al cambiar de semana (navegación de servidor). */
export function AgendaWeek({
  canPlan,
  fromISO,
  weekLabel,
  prevWeekISO,
  nextWeekISO,
  days,
  initialDay,
  entriesByDay,
}: {
  canPlan: boolean;
  fromISO: string;
  weekLabel: string;
  prevWeekISO: string;
  nextWeekISO: string;
  days: AgendaDayInfo[];
  initialDay: string;
  entriesByDay: Record<string, DayEntry[]>;
}) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const entries = entriesByDay[selectedDay] ?? [];

  function selectDay(iso: string) {
    setSelectedDay(iso);
    window.history.replaceState(
      null,
      "",
      `/agenda?semana=${fromISO}&dia=${iso}`,
    );
  }

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

      {/* Navegación de semana (sí es navegación de servidor: trae otros datos) */}
      <div className="flex items-center justify-between">
        <Link
          href={`/agenda?semana=${prevWeekISO}&dia=${prevWeekISO}`}
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
          {weekLabel}
        </p>
        <Link
          href={`/agenda?semana=${nextWeekISO}&dia=${nextWeekISO}`}
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
          const active = d.iso === selectedDay;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => selectDay(d.iso)}
              aria-pressed={active}
              className={
                active
                  ? "flex flex-col items-center rounded-2xl bg-ink py-2.5 text-cream"
                  : "flex flex-col items-center rounded-2xl border border-line bg-white py-2.5 text-ink/70"
              }
            >
              <span className="text-[11px] font-medium capitalize">
                {d.weekday}
              </span>
              <span className="text-lg font-bold">{d.dayNum}</span>
              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${d.count > 0 ? "bg-brand" : "bg-transparent"}`}
              />
            </button>
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
      <span
        className={`h-11 w-1.5 shrink-0 rounded-full ${skyToneOf(e.startTime).bar}`}
      />
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
