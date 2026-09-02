import type { Metadata } from "next";
import { Card, CardContent } from "@heroui/react";
import { CurvedBarbellMark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden rounded-(--radius-card) border-none bg-white p-0 shadow-xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Bienvenido de nuevo</h1>
              <p className="text-balance text-sm text-muted">
                Accede con la cuenta que te entregó el administrador.
              </p>
            </div>
            <LoginForm />
            <p className="mt-6 text-center text-sm text-muted">
              ¿Olvidaste tu contraseña? Pide una nueva al administrador.
            </p>
          </div>
          {/* Panel de marca (sustituye la imagen del diseño de referencia) */}
          <div
            className="relative hidden flex-col items-center justify-center gap-3 p-8 md:flex"
            style={{
              background:
                "radial-gradient(420px 280px at 70% 15%, var(--color-ink-2), var(--color-deep))",
            }}
          >
            <CurvedBarbellMark bar="#F4FBF6" className="h-14 w-[132px]" />
            <p className="font-display text-3xl font-extrabold tracking-[-0.5px] text-cream">
              Vital<span className="text-brand">Fit</span>
            </p>
            <p className="text-center text-sm text-cream/70">
              Entrena, mide y acompaña el progreso de tus clientes.
            </p>
          </div>
        </CardContent>
      </Card>
      <p className="px-6 text-center text-xs text-cream/55">
        Acceso exclusivo para el equipo de VitalFit.
      </p>
    </div>
  );
}
