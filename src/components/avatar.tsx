import { Avatar as HeroAvatar } from "@heroui/react";

const SIZES = {
  xs: "h-[26px] w-[26px] text-[9.5px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

/* Paleta por persona del diseño v2 (bg, texto). */
const PALETTES = [
  ["#D7F8E4", "#17C964"],
  ["#E0F2FE", "#0369A1"],
  ["#FCE7F3", "#BE185D"],
  ["#FEF9C3", "#A16207"],
  ["#EDE9FE", "#6D28D9"],
] as const;

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* `tone`: `solid` (verde con iniciales blancas, saludo del panel), `soft`
   (verde suave, neutro) o `palette` (color estable por nombre, listas).
   `shape`: `circle` o `square` (cuadrado redondeado de las listas). */
export function Avatar({
  name,
  size = "md",
  tone = "palette",
  shape = "circle",
  ring = false,
}: {
  name: string;
  size?: keyof typeof SIZES;
  tone?: "solid" | "soft" | "palette";
  shape?: "circle" | "square";
  ring?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const [bg, color] =
    tone === "solid"
      ? ["#17C964", "#fff"]
      : tone === "soft"
        ? ["#D7F8E4", "#17C964"]
        : PALETTES[hashName(name) % PALETTES.length];

  return (
    <HeroAvatar
      aria-hidden
      style={{ background: bg, color }}
      className={`shrink-0 ${
        shape === "square" ? "rounded-2xl" : "rounded-full"
      } ${SIZES[size]} ${ring ? "ring-2 ring-white" : ""}`}
    >
      <HeroAvatar.Fallback
        className="flex h-full w-full items-center justify-center bg-transparent font-extrabold text-inherit"
        style={{ color: "inherit" }}
      >
        {initials || "?"}
      </HeroAvatar.Fallback>
    </HeroAvatar>
  );
}
