// Modelo único del estado de mensualidad (vista v_mensualidades, migraciones
// 0023/0024). Toda pantalla que hable de cobros lee esta vista y este vocabulario.

export type EstadoMensualidad =
  | "vencido"
  | "por_vencer"
  | "sin_mensualidad"
  | "al_dia"
  | "pausado";

export type MensualidadRow = {
  client_id: string;
  full_name: string;
  billing_enabled: boolean;
  billing_plan_id: string | null;
  plan_name: string | null;
  periodo_dias: number | null;
  precio: number | null;
  cubierto_hasta: string | null;
  dias: number | null; // negativo = venció hace N días
  estado: EstadoMensualidad;
  puede_cobrar: boolean; // has_client_access: entrenador asignado o admin
  // false = la tarifa del servicio es fija para quien cobra (entrenador);
  // coordinador/admin —o cliente sin servicio con tarifa— pueden teclearla.
  importe_editable: boolean;
};

/** Orden de urgencia para listados: primero lo que requiere acción. */
export const ESTADO_ORDEN: Record<EstadoMensualidad, number> = {
  vencido: 0,
  por_vencer: 1,
  sin_mensualidad: 2,
  al_dia: 3,
  pausado: 4,
};

export function ordenarPorUrgencia(rows: MensualidadRow[]): MensualidadRow[] {
  return [...rows].sort(
    (a, b) =>
      ESTADO_ORDEN[a.estado] - ESTADO_ORDEN[b.estado] ||
      (a.dias ?? 0) - (b.dias ?? 0) ||
      a.full_name.localeCompare(b.full_name),
  );
}
