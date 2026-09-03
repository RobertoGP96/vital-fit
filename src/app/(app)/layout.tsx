import Link from "next/link";
import { Bell } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BottomTabs } from "@/components/bottom-tabs";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const supabase = await createClient();
  const [{ data: profile }, { count: alertCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.userId)
      .single(),
    // Avisos de cobro: clientes por vencer (≤ N días) o vencidos que esta
    // cuenta puede cobrar.
    supabase
      .from("v_mensualidades")
      .select("client_id", { count: "exact", head: true })
      .in("estado", ["por_vencer", "vencido"])
      .eq("puede_cobrar", true),
  ]);

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-cream">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-cream/95 px-5 pb-3 backdrop-blur pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link href="/panel" aria-label="VitalFit — inicio">
          <Logo />
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            href="/notificaciones"
            aria-label={
              alertCount
                ? `Notificaciones: ${alertCount} ${alertCount === 1 ? "aviso" : "avisos"} de cobro`
                : "Notificaciones"
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink"
          >
            <Bell size={18} />
            {(alertCount ?? 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white">
                {alertCount! > 9 ? "9+" : alertCount}
              </span>
            )}
          </Link>
          <UserMenu name={profile?.full_name ?? "Usuario"} role={session.role} />
        </div>
      </header>

      {/* Hueco inferior para el menú flotante (110px como en el diseño) */}
      <main className="px-5 pb-[calc(110px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <BottomTabs />
    </div>
  );
}
