import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { BarbellMark } from "@/components/logo";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function ChangePasswordPage() {
  const session = await requireSession();

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
        <div className="rounded-(--radius-card) bg-white p-6 shadow-xl">
          <h1 className="text-xl font-bold">
            {session.mustChangePassword
              ? "Crea tu nueva contraseña"
              : "Cambiar contraseña"}
          </h1>
          {session.mustChangePassword && (
            <p className="mt-1 text-sm text-muted">
              Por seguridad debes reemplazar la contraseña temporal antes de
              continuar.
            </p>
          )}
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
