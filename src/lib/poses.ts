/** Poses de las fotos de progreso, compartidas entre uploader, galería y comparador. */
export const POSES = [
  { value: "frente", label: "Frente" },
  { value: "espalda", label: "Espalda" },
  { value: "perfil_izquierdo", label: "Perfil izq." },
  { value: "perfil_derecho", label: "Perfil der." },
  { value: "otro", label: "Otra" },
] as const;

export type PoseValue = (typeof POSES)[number]["value"];

export const POSE_LABEL: Record<string, string> = Object.fromEntries(
  POSES.map((p) => [p.value, p.label]),
);
