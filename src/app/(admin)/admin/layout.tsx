import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-cream">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-cream/95 px-5 pb-3 backdrop-blur pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link
          href="/mas"
          aria-label="Volver"
          className="rounded-full border border-line bg-white p-2.5 text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <p className="text-lg font-extrabold tracking-tight text-ink">
          Administración
        </p>
      </header>
      <main className="px-5 pb-10">{children}</main>
    </div>
  );
}
