"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import { Plus } from "lucide-react";

const subscribe = () => () => {};

/* Se renderiza en un portal a <body>: dentro del template animado (motion
   aplica translateY al entrar) el ancestro con transform se convierte en el
   containing block de position:fixed y el botón "saltaba" con la animación de
   entrada de cada vista. Fuera de ese árbol queda anclado al viewport.
   El `right` con max() lo mantiene pegado a la columna max-w-md en desktop. */
export function Fab({ href, label }: { href: string; label: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;

  return createPortal(
    <Link
      href={href}
      aria-label={label}
      className={buttonVariants({
        variant: "primary",
        isIconOnly: true,
        className:
          "fixed bottom-24 z-40 h-14 w-14 rounded-full shadow-lg right-[max(1.25rem,calc(50vw-12.75rem))]",
      })}
    >
      <Plus size={26} strokeWidth={2.5} />
    </Link>,
    document.body,
  );
}
