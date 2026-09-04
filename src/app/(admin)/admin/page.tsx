import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  Ruler,
  UserCog,
  Users,
} from "lucide-react";
import { format, startOfWeek, addDays, addMonths, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { formatCup } from "@/lib/format";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(startOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd");

  const [clientsRes, trainersRes, sessionsRes, paymentsRes, overdueRes] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .in("role", ["trainer", "coordinator"]),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .gte("session_date", weekStart)
        .lte("session_date", weekEnd)
        .neq("status", "cancelada"),
      supabase
        .from("payments")
        .select("amount")
        .eq("status", "pagado")
        .gte("paid_on", monthStart)
        .lt("paid_on", monthEnd),
      // Mismo criterio que la campana y /pagos: estado de la vista única.
      supabase
        .from("v_mensualidades")
        .select("client_id", { count: "exact", head: true })
        .eq("estado", "vencido"),
    ]);

  const collected = (paymentsRes.data ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Visión general</h1>

      <section className="grid grid-cols-2 gap-3">
        <Card label="Clientes activos" value={String(clientsRes.count ?? 0)} />
        <Card label="Entrenadores" value={String(trainersRes.count ?? 0)} />
        <Card label="Sesiones esta semana" value={String(sessionsRes.count ?? 0)} />
        <Card label="Clientes vencidos" value={String(overdueRes.count ?? 0)} alert={(overdueRes.count ?? 0) > 0} />
      </section>

      <section className="rounded-(--radius-card) bg-ink p-5 text-cream">
        <p className="text-sm text-cream/60">Cobrado este mes</p>
        <p className="text-2xl font-extrabold">{formatCup(collected)}</p>
      </section>

      <section className="overflow-hidden rounded-(--radius-card) border border-line bg-white">
        <AdminLink href="/admin/entrenadores" label="Entrenadores y cuentas">
          <UserCog size={20} />
        </AdminLink>
        <AdminLink href="/gestion/asignaciones" label="Asignaciones de clientes">
          <Users size={20} />
        </AdminLink>
        <AdminLink href="/gestion/servicios" label="Servicios y tarifas">
          <CreditCard size={20} />
        </AdminLink>
        <AdminLink href="/admin/tipos-medida" label="Tipos de medida">
          <Ruler size={20} />
        </AdminLink>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-white p-4">
      <p className={`text-2xl font-extrabold ${alert ? "text-red-600" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function AdminLink({
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
      className="flex items-center gap-3 border-b border-ink/5 px-5 py-4 last:border-b-0 hover:bg-cream"
    >
      <span className="text-muted">{children}</span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight size={18} className="text-ink/30" />
    </Link>
  );
}
