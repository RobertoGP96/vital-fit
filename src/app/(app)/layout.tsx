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
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", session.userId)
    .single();

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-cream">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-cream/95 px-5 pb-3 backdrop-blur pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link href="/panel" aria-label="VitalFit — inicio">
          <Logo />
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            href="/mas"
            aria-label="Notificaciones"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink"
          >
            <Bell size={18} />
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
