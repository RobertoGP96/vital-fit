import Link from "next/link";
import { Bell } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { BottomTabs } from "@/components/bottom-tabs";
import { Logo } from "@/components/logo";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession();

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-cream">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-cream/95 px-5 pb-3 backdrop-blur pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link href="/panel" aria-label="VitalFit — inicio">
          <Logo />
        </Link>
        <Link
          href="/mas"
          aria-label="Notificaciones y opciones"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink"
        >
          <Bell size={18} />
        </Link>
      </header>

      {/* Hueco inferior para el menú flotante (110px como en el diseño) */}
      <main className="px-5 pb-[calc(110px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <BottomTabs />
    </div>
  );
}
