import type { Metadata } from "next";
import Link from "next/link";
import { Button, Chip, buttonVariants } from "@heroui/react";
import { ChevronLeft, ChevronRight, RefreshCw, Repeat } from "lucide-react";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveTrainers } from "@/lib/queries";
import { Fab } from "@/components/fab";
import { generateWeekAction } from "@/actions/sessions";
import { formatTime, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda" };

type Row = {
  id: string;
  trainer_id: string;
  session_date: string;
  start_time: string;
  duration_min: number;
  status: string;
  session_types: { name: string; color: string | null } | null;
  profiles: { full_name: string } | null;
  session_participants: { client_id: string; clients: { full_name: string } | null }[];
};

export default async function AgendaPage(props: {
  searchParams: Promise<{ semana?: string; dia?: string; entrenador?: string }>;
}) {
  const session = await requireSession();
  const params = await props.searchParams;
  const canManageAll = session.role !== "trainer";

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

  const supabase = await createClient();
  let query = supabase
    .from("sessions")
    .select(
      "id, trainer_id, session_date, start_time, duration_min, status, session_types(name, color), profiles!sessions_trainer_id_fkey(full_name), session_participants(client_id, clients(full_name))",
    )
    .gte("session_date", fromISO)
    .lte("session_date", toISO)
    .order("start_time");

  if (canManageAll && params.entrenador) {
    query = query.eq("trainer_id", params.entrenador);
  }

  const [{ data: sessionsData }, trainers] = await Promise.all([
    query,
    canManageAll ? getActiveTrainers() : Promise.resolve([]),
  ]);

  const sessions = (sessionsData ?? []) as unknown as Row[];
  const byDay = new Map<string, Row[]>();
  for (const s of sessions) {
    const list = byDay.get(s.session_date) ?? [];
    list.push(s);
    byDay.set(s.session_date, list);
  }
  const daySessions = byDay.get(selectedDay) ?? [];

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    p.set("semana", over.semana ?? fromISO);
    p.set("dia", over.dia ?? selectedDay);
    if (params.entrenador) p.set("entrenador", params.entrenador);
    if (over.entrenador !== undefined) {
      if (over.entrenador) p.set("entrenador", over.entrenador);
      else p.delete("entrenador");
    }
    return `/agenda?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Agenda</h1>
        <Link
          href="/agenda/horarios"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "rounded-full font-semibold text-ink/70",
          })}
        >
          <Repeat size={15} />
          Horarios
        </Link>
      </div>

      {/* Selector de entrenador (coordinador/admin) */}
      {canManageAll && trainers.length > 0 && (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <Link
            href={qs({ entrenador: "" })}
            className={
              !params.entrenador
                ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted"
            }
          >
            Todos
          </Link>
          {trainers.map((t) => (
            <Link
              key={t.id}
              href={qs({ entrenador: t.id })}
              className={
                params.entrenador === t.id
                  ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                  : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted"
              }
            >
              {t.full_name.split(" ")[0]}
            </Link>
          ))}
        </div>
      )}

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
          const count = byDay.get(iso)?.length ?? 0;
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

      {/* Generar desde horarios recurrentes */}
      <form action={generateWeekAction} className="flex justify-end">
        <input type="hidden" name="from" value={fromISO} />
        <input type="hidden" name="to" value={toISO} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="font-semibold text-brand-600"
        >
          <RefreshCw size={14} />
          Generar sesiones de la semana
        </Button>
      </form>

      {/* Sesiones del día */}
      {daySessions.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Sin sesiones este día.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {daySessions.map((s) => {
            const color = s.session_types?.color ?? "#17C964";
            const n = s.session_participants.length;
            return (
              <li key={s.id}>
                <Link
                  href={`/agenda/sesion/${s.id}`}
                  className={`flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 hover:border-brand/40 ${s.status === "cancelada" ? "opacity-50" : ""}`}
                >
                  <span
                    className="h-11 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {formatTime(s.start_time)}
                      <span className="ml-1.5 text-sm font-medium text-muted">
                        · {s.duration_min} min · {s.session_types?.name ?? "Sesión"}
                      </span>
                    </p>
                    <p className="truncate text-sm text-muted">
                      {canManageAll && s.profiles
                        ? `${s.profiles.full_name} · `
                        : ""}
                      {n === 1
                        ? (s.session_participants[0]?.clients?.full_name ?? "1 cliente")
                        : `${n} participantes`}
                    </p>
                  </div>
                  {n > 1 && (
                    <Chip size="sm" color="accent" variant="soft" className="shrink-0 font-bold">
                      Grupal · {n}
                    </Chip>
                  )}
                  {s.status !== "programada" && (
                    <span className="shrink-0 text-xs font-semibold capitalize text-muted">
                      {s.status}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Fab
        href={`/agenda/nueva${params.entrenador ? `?entrenador=${params.entrenador}` : ""}`}
        label="Nueva sesión"
      />
    </div>
  );
}
