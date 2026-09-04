import { format } from "date-fns";
import { es } from "date-fns/locale";

export function formatCup(amount: number): string {
  return new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency: "CUP",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatLongDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  const s = format(d, "EEEE, d 'de' MMMM", { locale: es });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return format(d, "d MMM", { locale: es });
}

export function formatMediumDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return format(d, "d MMM yyyy", { locale: es });
}

/** '18:30:00' → '18:30' */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

// Sistema de unidades fijo de la app: longitudes en pulgadas, peso en kg.
// El almacenamiento sigue siendo canónico (cm/kg/%).
const CM_PER_INCH = 2.54;

/** Unidad visible para una unidad canónica ('cm' se muestra en pulgadas). */
export function displayUnit(canonicalUnit: string): string {
  return canonicalUnit === "cm" ? "in" : canonicalUnit;
}

/** Convierte un valor canónico (cm/kg/%) a la unidad de visualización (in/kg/%). */
export function toDisplayUnit(
  value: number,
  canonicalUnit: string,
): { value: number; unit: string } {
  const converted = canonicalUnit === "cm" ? value / CM_PER_INCH : value;
  return { value: round1(converted), unit: displayUnit(canonicalUnit) };
}

/** Convierte un valor introducido (in/kg/%) al canónico (cm/kg/%). */
export function toCanonicalUnit(value: number, canonicalUnit: string): number {
  if (canonicalUnit === "cm") return round2(value * CM_PER_INCH);
  return round2(value);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
