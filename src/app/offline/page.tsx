import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center text-cream"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% -10%, var(--color-ink-2), var(--color-ink))",
      }}
    >
      <WifiOff size={40} className="text-brand" />
      <h1 className="text-2xl font-extrabold">Sin conexión</h1>
      <p className="max-w-xs text-sm text-cream/70">
        VitalFit necesita internet para mostrar los datos de tus clientes.
        Revisa tu conexión e inténtalo de nuevo.
      </p>
    </main>
  );
}
