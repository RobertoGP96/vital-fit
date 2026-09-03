import { Chip } from "@heroui/react";
import { PauseCircle } from "lucide-react";
import type { EstadoMensualidad } from "@/lib/mensualidades";

/**
 * Único chip de estado de mensualidad de la app (vista v_mensualidades).
 * `dias` es cubierto_hasta - hoy (negativo si venció).
 */
export function EstadoMensualidadChip({
  estado,
  dias,
}: {
  estado: EstadoMensualidad;
  dias: number | null;
}) {
  switch (estado) {
    case "pausado":
      return (
        <Chip color="warning" variant="soft" size="sm" className="gap-1">
          <PauseCircle size={13} /> Cobro pausado
        </Chip>
      );
    case "sin_mensualidad":
      return (
        <Chip variant="soft" size="sm">
          Sin mensualidad
        </Chip>
      );
    case "vencido":
      return (
        <Chip color="danger" variant="soft" size="sm">
          {dias === null
            ? "Vencido"
            : `Venció hace ${-dias} ${dias === -1 ? "día" : "días"}`}
        </Chip>
      );
    case "por_vencer":
      return (
        <Chip color="warning" variant="soft" size="sm">
          {dias === 0
            ? "Vence hoy"
            : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`}
        </Chip>
      );
    case "al_dia":
      return (
        <Chip color="success" variant="soft" size="sm">
          Al día
        </Chip>
      );
  }
}
