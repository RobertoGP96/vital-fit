import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@heroui/react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveTrainers, getAssignedClients } from "@/lib/queries";
import { toggleScheduleAction } from "@/actions/sessions";
import { ScheduleForm } from "@/components/schedule-form";
import { formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Horarios semanales" };

const WEEKDAY_LABEL = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Row = {
  id: string;
  weekday: number;
  start_time: string;
  duration_min: number;
  capacity: number | null;
  is_active: boolean;
  trainer_id: string;
  session_types: { name: string; color: string | null } | null;
  profiles: { full_name: string } | null;
  schedule_participants: { client_id: string }[];
};

export default async function HorariosPage(props: {
  searchParams: Promise<{ entrenador?: string }>;
}) {
  const session = await requireSession();
  const { entrenador } = await props.searchParams;
  const canManageAll = session.role !== "trainer";
  const trainerId = canManageAll && entrenador ? entrenador : session.userId;

  const supabase = await createClient();
  const [{ data: schedulesData }, { data: types }, trainers, clients] =
    await Promise.all([
      supabase
        .from("schedules")
        .select(
          "id, weekday, start_time, duration_min, capacity, is_active, trainer_id, session_types(name, color), profiles!schedules_trainer_id_fkey(full_name), schedule_participants(client_id)",
        )
        .order("weekday")
        .order("start_time"),
      supabase.from("session_types").select("id, name").eq("is_active", true).order("name"),
      canManageAll ? getActiveTrainers() : Promise.resolve([]),
      getAssignedClients(trainerId),
    ]);

  const schedules = ((schedulesData ?? []) as unknown as Row[]).filter(
    (s) => !canManageAll || !entrenador || s.trainer_id === entrenador,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Horarios semanales</h1>
      <p className="-mt-2 text-sm text-muted">
        Plantillas recurrentes: desde la agenda pulsa “Generar sesiones de la
        semana” para materializarlas.
      </p>

      {canManageAll && trainers.length > 0 && (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {trainers.map((t) => (
            <Link
              key={t.id}
              href={`/agenda/horarios?entrenador=${t.id}`}
              className={
                trainerId === t.id
                  ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                  : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted"
              }
            >
              {t.full_name}
            </Link>
          ))}
        </div>
      )}

      <details className="rounded-(--radius-card) border border-line bg-white p-4">
        <summary className="cursor-pointer font-bold text-brand-600">
          Nuevo horario recurrente
        </summary>
        <div className="mt-4">
          <ScheduleForm trainerId={trainerId} types={types ?? []} clients={clients} />
        </div>
      </details>

      {schedules.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Sin horarios definidos.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {schedules.map((s) => {
            const color = s.session_types?.color ?? "#17C964";
            const n = s.schedule_participants.length;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 ${s.is_active ? "" : "opacity-50"}`}
              >
                <span
                  className="h-11 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {WEEKDAY_LABEL[s.weekday]} · {formatTime(s.start_time)}
                    <span className="ml-1 text-sm font-medium text-muted">
                      · {s.duration_min} min
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted">
                    {s.session_types?.name ?? "Sesión"}
                    {canManageAll && s.profiles ? ` · ${s.profiles.full_name}` : ""}
                    {" · "}
                    {n === 0 ? "sin participantes" : n === 1 ? "individual" : `grupal (${n})`}
                    {s.capacity ? ` · aforo ${s.capacity}` : ""}
                  </p>
                </div>
                <form action={toggleScheduleAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="is_active" value={String(s.is_active)} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full text-muted"
                  >
                    {s.is_active ? "Pausar" : "Activar"}
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
