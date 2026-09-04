import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@heroui/react";
import {
  ChevronRight,
  CreditCard,
  LogOut,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { Avatar } from "@/components/avatar";

export const metadata: Metadata = { title: "Más" };

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordinador",
  trainer: "Entrenador",
};

export default async function MasPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, specialty")
    .eq("id", session.userId)
    .single();

  const canManage = session.role === "admin" || session.role === "coordinator";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4 rounded-(--radius-card) border border-line bg-white p-5">
        <Avatar name={profile?.full_name ?? "?"} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">
            {profile?.full_name ?? "—"}
          </h1>
          <p className="text-sm text-muted">
            {ROLE_LABEL[session.role]}
            {profile?.specialty ? ` · ${profile.specialty}` : ""}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-(--radius-card) border border-line bg-white">
        {canManage && (
          <MenuLink href="/gestion/asignaciones" label="Asignaciones de clientes">
            <UserCog size={20} />
          </MenuLink>
        )}
        {canManage && (
          <MenuLink href="/gestion/servicios" label="Servicios y tarifas">
            <CreditCard size={20} />
          </MenuLink>
        )}
        {session.role === "admin" && (
          <MenuLink href="/admin" label="Administración">
            <ShieldCheck size={20} />
          </MenuLink>
        )}
        <MenuLink href="/cambiar-contrasena" label="Cambiar contraseña">
          <UserCog size={20} />
        </MenuLink>
      </section>

      <form action={logout}>
        <Button
          type="submit"
          variant="outline"
          fullWidth
          className="gap-2 rounded-full border-red-200 bg-white font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}

function MenuLink({
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
