import type { Metadata } from "next";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  mergeDayEntries,
  monthOf,
  type BlockRow,
  type DayEntry,
  type SessionRow,
} from "@/lib/agenda";
import { todayISO } from "@/lib/format";
import { AgendaWeek, type AgendaDayInfo } from "@/components/agenda-week";

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

  // Toda la semana se resuelve aquí y el cambio de día es estado de cliente
  // en <AgendaWeek> (sin round-trip por tap de día).
  const dayInfos: AgendaDayInfo[] = [];
  const entriesByDay: Record<string, DayEntry[]> = {};
  for (const d of days) {
    const iso = format(d, "yyyy-MM-dd");
    dayInfos.push({
      iso,
      weekday: format(d, "EEE", { locale: es }),
      dayNum: format(d, "d"),
      count: dayCount(iso),
    });
    entriesByDay[iso] = mergeDayEntries(
      blocksByMonth.get(monthOf(iso)) ?? [],
      sessionsByDay.get(iso) ?? [],
    );
  }

  return (
    <AgendaWeek
      // key: al cambiar de semana (navegación de servidor) se resetea el día
      // seleccionado; tras un server action (misma semana) el estado persiste.
      key={fromISO}
      canPlan={canPlan}
      fromISO={fromISO}
      weekLabel={`${format(weekStart, "d MMM", { locale: es })} — ${format(days[6], "d MMM yyyy", { locale: es })}`}
      prevWeekISO={format(addDays(weekStart, -7), "yyyy-MM-dd")}
      nextWeekISO={format(addDays(weekStart, 7), "yyyy-MM-dd")}
      days={dayInfos}
      initialDay={selectedDay}
      entriesByDay={entriesByDay}
    />
  );
}
