import { BarbellMark } from "@/components/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main
      className="flex min-h-dvh items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% -10%, var(--color-ink-2), var(--color-ink))",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BarbellMark bar="#F4FBF6" className="h-16 w-28" />
          <p className="text-3xl font-extrabold tracking-tight text-cream">
            Vital<span className="text-brand">Fit</span>
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
