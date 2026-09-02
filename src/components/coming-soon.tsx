export function ComingSoon({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}
