"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Users,
  CalendarDays,
  Wallet,
  Menu,
} from "lucide-react";

const TABS = [
  { href: "/panel", label: "Inicio", Icon: Home },
  { href: "/clientes", label: "Clientes", Icon: Users },
  { href: "/agenda", label: "Agenda", Icon: CalendarDays },
  { href: "/pagos", label: "Pagos", Icon: Wallet },
  { href: "/mas", label: "Más", Icon: Menu },
] as const;

/* Píldora flotante oscura del diseño: la etiqueta de la pestaña activa se
   despliega (max-width) y la cápsula hace navPop, igual que en Claude Design. */
export function BottomTabs() {
  const pathname = usePathname();
  // usePathname solo cambia cuando llega la página nueva del servidor; para
  // que la píldora responda al tap, el destino se marca optimista en
  // onNavigate y pathname lo confirma (o corrige) al completarse.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const current = pendingHref ?? pathname;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 z-40 px-[22px] bottom-[max(env(safe-area-inset-bottom),26px)]"
    >
      <ul
        className="mx-auto flex max-w-[calc(28rem-44px)] items-center justify-between rounded-full bg-deep/92 p-[7px] backdrop-blur-[14px] shadow-[0_12px_32px_rgba(11,31,20,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active =
            current === href || current.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onNavigate={() => setPendingHref(href)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-[7px] rounded-full px-[15px] py-[11px] [transition:color_.15s_ease,box-shadow_.35s_cubic-bezier(.2,.8,.2,1)] ${
                  active
                    ? "bg-[linear-gradient(135deg,#86EFAC,#17C964)] text-deep shadow-[0_4px_14px_rgba(23,201,100,0.45)] [animation:navPop_.4s_cubic-bezier(.2,.8,.2,1)]"
                    : "text-white/55"
                }`}
              >
                <Icon size={20} strokeWidth={2.2} className="shrink-0" />
                <span
                  className={`overflow-hidden whitespace-nowrap text-xs font-extrabold [transition:max-width_.35s_cubic-bezier(.2,.8,.2,1),opacity_.3s_ease_.08s,transform_.35s_cubic-bezier(.2,.8,.2,1)] ${
                    active
                      ? "max-w-[90px] translate-x-0 opacity-100"
                      : "max-w-0 -translate-x-1.5 opacity-0"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
