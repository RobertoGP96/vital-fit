import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, Chip, ListBox, Select } from "@heroui/react";
import { UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAssignedClients } from "@/lib/queries";
import {
  addParticipantAction,
  removeParticipantAction,
  setSessionStatusAction,
} from "@/actions/sessions";
import { AttendanceToggle } from "@/components/attendance-toggle";
import { Avatar } from "@/components/avatar";
import { formatLongDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Sesión" };

export default async function SesionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("sessions")
    .select(
      "id, trainer_id, session_date, start_time, duration_min, capacity, status, notes, session_types(name, color), profiles!sessions_trainer_id_fkey(full_name), session_participants(client_id, clients(id, full_name)), attendance_records(client_id, attended)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!s) notFound();

  const participants = (s.session_participants ?? []) as unknown as {
    client_id: string;
    clients: { id: string; full_name: string } | null;
  }[];
  const attendance = new Map(
    (s.attendance_records ?? []).map((a: { client_id: string; attended: boolean }) => [
      a.client_id,
      a.attended,
    ]),
  );
  const attended = [...attendance.values()].filter(Boolean).length;
  const color =
    (s.session_types as unknown as { color: string | null } | null)?.color ??
    "#17C964";

  const inSession = new Set(participants.map((p) => p.client_id));
  const addable = (await getAssignedClients(s.trainer_id)).filter(
    (c) => !inSession.has(c.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <header
        className="rounded-(--radius-card) p-5 text-cream"
        style={{
          background:
            "radial-gradient(400px 260px at 15% -20%, var(--color-ink-2), var(--color-ink))",
        }}
      >
        <Chip
          size="sm"
          className="mb-2 font-bold"
          style={{ backgroundColor: `${color}33`, color }}
        >
          {(s.session_types as unknown as { name: string } | null)?.name ??
            "Sesión"}
          {participants.length > 1 && " · Grupal"}
        </Chip>
        <h1 className="text-xl font-bold">
          {formatTime(s.start_time)} · {s.duration_min} min
        </h1>
        <p className="text-sm text-cream/70">
          {formatLongDate(s.session_date)} ·{" "}
          {(s.profiles as unknown as { full_name: string } | null)?.full_name ??
            ""}
        </p>
        {s.status !== "programada" && (
          <p className="mt-1 text-sm font-bold uppercase tracking-wide text-cream/80">
            {s.status}
          </p>
        )}
      </header>

      <section className="rounded-(--radius-card) border border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">
            Participantes ({participants.length}
            {s.capacity ? `/${s.capacity}` : ""})
          </h2>
          {attendance.size > 0 && (
            <Chip size="sm" color="accent" variant="soft" className="font-bold">
              {attended}/{participants.length} asistieron
            </Chip>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {participants.map((p) => (
            <li key={p.client_id} className="flex items-center gap-3">
              <Avatar name={p.clients?.full_name ?? "?"} size="sm" />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {p.clients?.full_name ?? "—"}
              </p>
              <AttendanceToggle
                sessionId={s.id}
                clientId={p.client_id}
                attended={attendance.has(p.client_id) ? attendance.get(p.client_id)! : null}
              />
              <form action={removeParticipantAction}>
                <input type="hidden" name="session_id" value={s.id} />
                <input type="hidden" name="client_id" value={p.client_id} />
                <Button
                  type="submit"
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Quitar participante"
                  className="rounded-full text-ink/30 hover:bg-red-50 hover:text-red-600"
                >
                  <UserMinus size={16} />
                </Button>
              </form>
            </li>
          ))}
        </ul>

        {addable.length > 0 && (
          <form action={addParticipantAction} className="mt-3 flex gap-2">
            <input type="hidden" name="session_id" value={s.id} />
            <Select
              name="client_id"
              isRequired
              aria-label="Agregar participante"
              placeholder="Agregar participante…"
              className="min-w-0 flex-1"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {addable.map((c) => (
                    <ListBox.Item key={c.id} id={c.id} textValue={c.full_name}>
                      {c.full_name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button
              type="submit"
              variant="secondary"
              className="rounded-full font-semibold"
            >
              Agregar
            </Button>
          </form>
        )}
      </section>

      {s.notes && (
        <section className="rounded-(--radius-card) border border-line bg-white p-4">
          <h2 className="mb-1 font-bold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/70">{s.notes}</p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        {s.status !== "completada" && (
          <form action={setSessionStatusAction}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="status" value="completada" />
            <Button
              type="submit"
              size="lg"
              fullWidth
              className="rounded-full font-semibold"
            >
              Completar
            </Button>
          </form>
        )}
        {s.status !== "cancelada" ? (
          <form action={setSessionStatusAction}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="status" value="cancelada" />
            <Button
              type="submit"
              variant="danger-soft"
              size="lg"
              fullWidth
              className="rounded-full font-semibold"
            >
              Cancelar sesión
            </Button>
          </form>
        ) : (
          <form action={setSessionStatusAction}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="status" value="programada" />
            <Button
              type="submit"
              variant="outline"
              size="lg"
              fullWidth
              className="rounded-full font-semibold text-ink/70"
            >
              Reprogramar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
