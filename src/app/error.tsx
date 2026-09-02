"use client";

import { Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream p-8 text-center">
      <AlertTriangle size={36} className="text-amber-500" />
      <h1 className="text-xl font-bold">Algo salió mal</h1>
      <p className="max-w-xs text-sm text-muted">
        Ocurrió un error inesperado. Si acabas de configurar la aplicación,
        verifica que la base de datos esté migrada y las variables de entorno
        completas.
      </p>
      <Button onPress={reset} className="rounded-full px-6 font-semibold">
        Reintentar
      </Button>
    </main>
  );
}
