"use client";

import { useActionState } from "react";
import { Copy } from "lucide-react";
import {
  createTrainerAction,
  resetTrainerPasswordAction,
  type TrainerFormState,
} from "@/actions/trainers";

function TempPasswordBanner({
  state,
}: {
  state: Extract<TrainerFormState, { ok: true }>;
}) {
  return (
    <div className="rounded-xl border-2 border-brand bg-brand/10 p-4">
      <p className="text-sm font-bold text-brand-600">
        Contraseña temporal para {state.email}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-white px-3 py-2 text-lg font-extrabold tracking-wider">
          {state.tempPassword}
        </code>
        <button
          type="button"
          aria-label="Copiar contraseña"
          onClick={() => navigator.clipboard?.writeText(state.tempPassword)}
          className="rounded-full border border-brand/40 p-2.5 text-brand-600 hover:bg-brand/10"
        >
          <Copy size={16} />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Cópiala AHORA y entrégala en persona: no volverá a mostrarse. Al primer
        inicio de sesión se le exigirá cambiarla.
      </p>
    </div>
  );
}

export function TrainerCreateForm() {
  const [state, formAction, pending] = useActionState(createTrainerAction, null);

  return (
    <div className="flex flex-col gap-3">
      {state && "ok" in state && <TempPasswordBanner state={state} />}

      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Nombre completo *</span>
          <input
            name="full_name"
            required
            className="h-11 rounded-xl border border-line bg-white px-3 outline-none focus:border-brand"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Correo *</span>
            <input
              name="email"
              type="email"
              required
              className="h-11 rounded-xl border border-line bg-white px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Rol *</span>
            <select
              name="role"
              defaultValue="trainer"
              className="h-11 rounded-xl border border-line bg-white px-3 outline-none focus:border-brand"
            >
              <option value="trainer">Entrenador</option>
              <option value="coordinator">Coordinador</option>
            </select>
          </label>
        </div>

        {state && "error" in state && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-brand font-semibold text-ink hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}

export function TrainerResetPassword({
  trainerId,
  email,
}: {
  trainerId: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    resetTrainerPasswordAction,
    null,
  );

  return (
    <div className="flex flex-col gap-2">
      {state && "ok" in state && <TempPasswordBanner state={state} />}
      <form action={formAction}>
        <input type="hidden" name="id" value={trainerId} />
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-ink/40 disabled:opacity-60"
        >
          {pending ? "…" : "Restablecer contraseña"}
        </button>
      </form>
      {state && "error" in state && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
