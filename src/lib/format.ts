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

/** '18:30:00' → '18:30' */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;

/** Convierte un valor canónico (cm/kg) a la unidad de visualización. */
export function toDisplayUnit(
  value: number,
  canonicalUnit: string,
  units: "metric" | "imperial",
): { value: number; unit: string } {
  if (units === "imperial" && canonicalUnit === "cm") {
    return { value: round1(value / CM_PER_INCH), unit: "in" };
  }
  if (units === "imperial" && canonicalUnit === "kg") {
    return { value: round1(value / KG_PER_LB), unit: "lb" };
  }
  return { value: round1(value), unit: canonicalUnit };
}

/** Convierte un valor introducido en la unidad elegida al canónico (cm/kg). */
export function toCanonicalUnit(
  value: number,
  canonicalUnit: string,
  units: "metric" | "imperial",
): number {
  if (units === "imperial" && canonicalUnit === "cm") return round2(value * CM_PER_INCH);
  if (units === "imperial" && canonicalUnit === "kg") return round2(value * KG_PER_LB);
  return round2(value);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
