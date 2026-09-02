import type { Metadata } from "next";
import Link from "next/link";
import { Button, Chip, SearchField } from "@heroui/react";
import { CalendarDays, Check, CreditCard, ListFilter, Users } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatLongDate, formatTime, todayISO } from "@/lib/format";
import { Avatar } from "@/components/avatar";

export const metadata: Metadata = { title: "Inicio" };

type TodaySession = {
  id: string;
  start_time: string;
  duration_min: number;
  status: string;
  session_types: { name: string; color: string | null } | null;
  session_participants: {
    client_id: string;
    clients: { full_name: string } | null;
  }[];
  attendance_records: { client_id: string; attended: boolean }[];
};

type ClientRow = { id: string; full_name: string; phone: string | null };

export default async function PanelPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: profile }, { data: sessionsData }, { data: clientsData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.userId)
        .single(),
      supabase
        .from("sessions")
        .select(
          "id, start_time, duration_min, status, session_types(name, color), session_participants(client_id, clients(full_name)), attendance_records(client_id, attended)",
        )
        .eq("session_date", todayISO())
        .neq("status", "cancelada")
        .order("start_time"),
      supabase
        .from("clients")
        .select("id, full_name, phone")
        .eq("is_active", true)
        .order("full_name")
        .limit(5),
    ]);

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "Entrenador";
  const sessions = (sessionsData ?? []) as unknown as TodaySession[];
  const clients = (clientsData ?? []) as ClientRow[];

  return (
    <div className="flex flex-col gap-6">
      {/* Saludo */}
      <section className="flex items-center gap-2.5">
        <Avatar name={profile?.full_name ?? "?"} tone="solid" />
        <div>
          <h1 className="text-base font-extrabold leading-tight">
            Hola, {firstName}
          </h1>
          <p className="text-xs font-medium text-muted">
            {formatLongDate(new Date())}
          </p>
        </div>
      </section>

      {/* Buscador (lleva a clientes con el término) */}
      <form action="/clientes" method="get" role="search" className="flex gap-2.5">
        <SearchField name="q" aria-label="Buscar clientes" className="flex-1">
          <SearchField.Group className="rounded-full">
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar clientes…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button
          type="submit"
          isIconOnly
          aria-label="Buscar"
          className="h-11 w-11 shrink-0 rounded-2xl"
        >
          <ListFilter size={18} />
        </Button>
      </form>

      {/* Hero */}
      <section
        className="relative flex h-[158px] flex-col justify-center overflow-hidden rounded-3xl bg-brand-600 p-[18px] text-white"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(9,58,35,0.92) 30%, rgba(9,58,35,0.25))",
          }}
        />
        <div className="relative">
          <h2 className="font-display text-base font-extrabold">
            Entrena. Mide. Evoluciona.
          </h2>
          <p className="mt-[5px] max-w-[210px] text-xs text-white/80">
            Todo el control de tus clientes y sesiones en un solo lugar.
          </p>
          <Link
            href="/clientes"
            className="mt-[11px] inline-block rounded-full bg-mint px-4 py-2 text-[12.5px] font-extrabold text-[#14532D]"
          >
            Ver clientes
          </Link>
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="grid grid-cols-3 gap-3">
        <QuickLink href="/agenda" label="Horario">
          <CalendarDays size={20} />
        </QuickLink>
        <QuickLink href="/clientes" label="Clientes">
          <Users size={20} />
        </QuickLink>
        <QuickLink href="/pagos" label="Pagos">
          <CreditCard size={20} />
        </QuickLink>
      </section>

      {/* Sesiones de hoy */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">Sesiones de hoy</h2>
          <Link href="/agenda" className="text-[12.5px] font-bold text-brand">
            Ver todo
          </Link>
        </div>

        {sessions.length === 0 ? (
          <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-5 text-center text-sm text-muted">
            No hay sesiones programadas para hoy.
          </p>
        ) : (
          <ul className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5">
            {sessions.map((s) => (
              <li key={s.id} className="w-[210px] shrink-0 snap-start">
                <SessionTodayCard session={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tus clientes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">Tus clientes</h2>
          <Link
            href="/clientes"
            className="text-[12.5px] font-bold text-brand"
          >
            Ver todos
          </Link>
        </div>

        {clients.length === 0 ? (
          <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-5 text-center text-sm text-muted">
            Aún no tienes clientes asignados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clientes/${c.id}`}
                  className="flex items-center gap-3 rounded-(--radius-card) border border-line bg-white px-3.5 py-3 transition-colors hover:border-brand"
                >
                  <Avatar name={c.full_name} size="md" shape="square" />
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-bold">
                      {c.full_name}
                    </p>
                    {c.phone && (
                      <p className="truncate text-xs text-muted">{c.phone}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuickLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-[7px] rounded-(--radius-card) border border-line bg-white px-2.5 py-3.5 transition-colors hover:border-brand"
    >
      <span className="text-brand">{children}</span>
      <span className="text-xs font-bold">{label}</span>
    </Link>
  );
}

function SessionTodayCard({ session: s }: { session: TodaySession }) {
  const participants = s.session_participants;
  const attended = s.attendance_records.filter((a) => a.attended).length;
  const tracked = s.attendance_records.length;
  const allAttended =
    participants.length > 0 && attended === participants.length;
  const typeName = s.session_types?.name ?? "Sesión";
  const color = s.session_types?.color ?? "#17C964";

  return (
    <div
      className={`flex h-full flex-col rounded-[22px] border bg-white p-2.5 ${
        allAttended ? "border-brand" : "border-line"
      }`}
    >
      {/* Área de imagen con chip de tipo (como en el diseño) */}
      <div className="relative h-[92px] overflow-hidden rounded-[15px] bg-soft">
        <Chip
          size="sm"
          className="absolute left-2 top-2 border-transparent text-[10.5px] font-extrabold"
          style={{ backgroundColor: `${color}26`, color }}
        >
          {typeName}
        </Chip>
      </div>

      <div className="px-1.5 pb-1 pt-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[13.5px] font-extrabold">
            {formatTime(s.start_time)} · {s.duration_min} min
          </p>
          <span
            aria-hidden
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-[9px] border-[1.5px] text-white ${
              allAttended
                ? "border-brand bg-brand"
                : "border-[#BFE8D0] bg-white"
            }`}
          >
            <Check size={14} strokeWidth={3} />
          </span>
        </div>

        <div className="mt-[9px] flex items-center">
          <div className="flex -space-x-2">
            {participants.slice(0, 3).map((p) => (
              <Avatar
                key={p.client_id}
                name={p.clients?.full_name ?? "?"}
                size="xs"
                ring
              />
            ))}
          </div>
          <p className="ml-2 text-[11.5px] font-semibold text-muted">
            {participants.length === 0
              ? "Sin participantes"
              : tracked > 0
                ? `${attended}/${participants.length} asistieron`
                : participants.length === 1
                  ? (participants[0].clients?.full_name ?? "").split(" ")[0] ||
                    "1 cliente"
                  : `${participants.length} participantes`}
          </p>
        </div>
      </div>
    </div>
  );
}
