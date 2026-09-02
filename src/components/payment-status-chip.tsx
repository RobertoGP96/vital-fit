import { Chip } from "@heroui/react";

const COLORS: Record<string, "success" | "warning" | "danger"> = {
  pagado: "success",
  pendiente: "warning",
  vencido: "danger",
};

const LABELS: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
};

export function PaymentStatusChip({ status }: { status: string }) {
  return (
    <Chip color={COLORS[status] ?? "default"} variant="soft" size="sm">
      {LABELS[status] ?? status}
    </Chip>
  );
}
