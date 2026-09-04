import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import { Plus } from "lucide-react";

/* Elemento fixed normal (el template solo anima opacidad, que no crea
   containing block). El `right` con max() lo mantiene pegado a la columna
   max-w-md en desktop. */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
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
    </Link>
  );
}
