"use client";

import { I18nProvider } from "@heroui/react";

/**
 * Fija la locale de React Aria (HeroUI) en es-ES para servidor Y cliente:
 * sin esto, el SSR usa en-US y el navegador la locale del usuario, lo que
 * produce mismatches de hidratación (p. ej. inputMode de NumberField) y
 * formatos de fecha/número inconsistentes.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="es-ES">{children}</I18nProvider>;
}
