import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const clientSchema = z.object({
  full_name: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().email("Correo inválido").nullable())
    .nullable()
    .optional(),
  birth_date: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").nullable())
    .nullable()
    .optional(),
  sex: z.enum(["masculino", "femenino", "otro"]).nullable().optional(),
  marital_status: z
    .enum([
      "soltero_a",
      "casado_a",
      "divorciado_a",
      "viudo_a",
      "union_libre",
      "otro",
    ])
    .nullable()
    .optional(),
  height_cm: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(
      z
        .number("Estatura inválida")
        .positive("Estatura inválida")
        .max(299, "Estatura inválida")
        .nullable(),
    )
    .nullable()
    .optional(),
  preferred_units: z.enum(["metric", "imperial"]).default("metric"),
  emergency_contact_name: optionalText,
  emergency_contact_phone: optionalText,
  goals: optionalText,
  notes: optionalText,
});

export type ClientInput = z.infer<typeof clientSchema>;

/** Convierte los enums vacíos de un <select> ("") en null antes de validar. */
export function clientFormToObject(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  for (const key of ["sex", "marital_status"]) {
    if (raw[key] === "") delete raw[key];
  }
  return raw;
}
