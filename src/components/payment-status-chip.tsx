const STYLES: Record<string, string> = {
  pagado: "bg-brand/15 text-brand-600",
  pendiente: "bg-amber-100 text-amber-700",
  vencido: "bg-red-100 text-red-700",
};

const LABELS: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
};

export function PaymentStatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STYLES[status] ?? "bg-ink/10 text-muted"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
