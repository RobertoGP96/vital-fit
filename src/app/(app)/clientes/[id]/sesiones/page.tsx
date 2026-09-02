import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, formatTime } from "@/lib/format";

type Row = {
  id: string;
  session_date: string;
  start_time: string;
  duration_min: number;
  status: string;
  session_types: { name: string; color: string | null } | null;
  profiles: { full_name: string } | null;
  attendance_records: { client_id: string; attended: boolean }[];
};

const STATUS_LABEL: Record<string, string> = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export default async function SesionesClientePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, duration_min, status, session_types(name, color), profiles!sessions_trainer_id_fkey(full_name), attendance_records(client_id, attended), session_participants!inner(client_id)",
    )
    .eq("session_participants.client_id", id)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(40);

  const sessions = (data ?? []) as unknown as Row[];

  return (
    <div className="flex flex-col gap-3">
      {sessions.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Este cliente aún no tiene sesiones. Créalas desde la{" "}
          <Link href="/agenda" className="font-semibold text-brand-600">
            agenda
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const att = s.attendance_records.find((a) => a.client_id === id);
            const color = s.session_types?.color ?? "#17C964";
            return (
              <li key={s.id}>
                <Link
                  href={`/agenda/sesion/${s.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 hover:border-brand/40"
                >
                  <span
                    className="h-10 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {formatShortDate(s.session_date)} ·{" "}
                      {formatTime(s.start_time)}
                    </p>
                    <p className="text-sm text-muted">
                      {s.session_types?.name ?? "Sesión"} · {s.duration_min} min
                      {s.profiles ? ` · ${s.profiles.full_name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    {s.status === "cancelada"
                      ? STATUS_LABEL[s.status]
                      : att
                        ? att.attended
                          ? "Asistió ✅"
                          : "Faltó ❌"
                        : STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
