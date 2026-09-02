import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream p-8 text-center">
      <p className="text-5xl font-extrabold text-brand">404</p>
      <h1 className="text-xl font-bold">No encontrado</h1>
      <p className="max-w-xs text-sm text-muted">
        La página que buscas no existe o no tienes acceso a ella.
      </p>
      <Link
        href="/panel"
        className="rounded-full bg-brand px-6 py-2.5 font-semibold text-ink hover:bg-brand-600"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
