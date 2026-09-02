import { EmptyState } from "@heroui/react";

export function ComingSoon({ title, detail }: { title: string; detail: string }) {
  return (
    <EmptyState className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </EmptyState>
  );
}
