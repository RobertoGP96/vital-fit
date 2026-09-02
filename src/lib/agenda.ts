// Fusión de la vista diaria: bloques del plan mensual + sesiones ya abiertas.
// Un bloque sin sesión materializada se muestra con su distribución mensual;
// si la sesión del día existe, mandan sus datos (ajustes puntuales, estado).

export type Participant = { id: string; name: string };

export type BlockRow = {
  id: string;
  month: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  session_block_participants: {
    client_id: string;
    clients: { full_name: string } | null;
  }[];
};

export type SessionRow = {
  id: string;
  block_id: string | null;
  session_date: string;
  start_time: string;
  duration_min: number;
  status: string;
  capacity: number | null;
  session_participants: {
    client_id: string;
    clients: { full_name: string } | null;
  }[];
  attendance_records: { client_id: string; attended: boolean }[];
};

export type DayEntry = {
  key: string;
  blockId: string | null;
  sessionId: string | null;
  startTime: string;
  endTime: string;
  capacity: number | null;
  status: string;
  participants: Participant[];
  attended: number;
  tracked: number;
};

/** '06:30' + 90 min → '08:00' */
export function endTimeOf(start: string, durationMin: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = (h * 60 + m + durationMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function monthOf(dateISO: string): string {
  return `${dateISO.slice(0, 7)}-01`;
}

export function toParticipants(
  rows: { client_id: string; clients: { full_name: string } | null }[],
): Participant[] {
  return rows
    .map((r) => ({ id: r.client_id, name: r.clients?.full_name ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeDayEntries(
  blocks: BlockRow[],
  daySessions: SessionRow[],
): DayEntry[] {
  const byBlock = new Map(
    daySessions.filter((s) => s.block_id).map((s) => [s.block_id!, s]),
  );

  const fromSession = (s: SessionRow, blockId: string | null): DayEntry => ({
    key: `s-${s.id}`,
    blockId,
    sessionId: s.id,
    startTime: s.start_time,
    endTime: endTimeOf(s.start_time, s.duration_min),
    capacity: s.capacity,
    status: s.status,
    participants: toParticipants(s.session_participants ?? []),
    attended: (s.attendance_records ?? []).filter((a) => a.attended).length,
    tracked: (s.attendance_records ?? []).length,
  });

  const entries: DayEntry[] = blocks.map((b) => {
    const s = byBlock.get(b.id);
    if (s) return fromSession(s, b.id);
    return {
      key: `b-${b.id}`,
      blockId: b.id,
      sessionId: null,
      startTime: b.start_time,
      endTime: b.end_time,
      capacity: b.capacity,
      status: "programada",
      participants: toParticipants(b.session_block_participants ?? []),
      attended: 0,
      tracked: 0,
    };
  });

  for (const s of daySessions) {
    if (!s.block_id) entries.push(fromSession(s, null));
  }

  return entries.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** 'Alberto Pérez, Jorge Ruiz y 2 más' (nombres de pila, hasta `max`). */
export function participantSummary(
  participants: Participant[],
  max = 3,
): string {
  if (participants.length === 0) return "Sin clientes asignados";
  const names = participants.map((p) => p.name.split(" ")[0] || p.name);
  if (names.length <= max) {
    return names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  }
  return `${names.slice(0, max).join(", ")} y ${names.length - max} más`;
}
