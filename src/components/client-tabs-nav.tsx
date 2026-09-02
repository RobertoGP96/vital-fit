"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { seg: "", label: "Datos" },
  { seg: "medidas", label: "Medidas" },
  { seg: "fotos", label: "Fotos" },
  { seg: "historial", label: "Historial" },
  { seg: "dieta", label: "Dieta" },
  { seg: "sesiones", label: "Sesiones" },
  { seg: "pagos", label: "Pagos" },
  { seg: "informe", label: "Informe" },
] as const;

export function ClientTabsNav({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clientes/${clientId}`;

  return (
    <nav aria-label="Secciones del cliente" className="-mx-5">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
        {TABS.map(({ seg, label }) => {
          const href = seg ? `${base}/${seg}` : base;
          const active = seg
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === base;
          return (
            <li key={seg} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-block rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream"
                    : "inline-block rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-muted hover:border-ink/30"
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
