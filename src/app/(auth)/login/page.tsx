import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="rounded-(--radius-card) bg-white p-6 shadow-xl">
      <h1 className="text-xl font-bold">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-muted">
        Accede con la cuenta que te entregó el administrador.
      </p>
      <LoginForm />
    </div>
  );
}
