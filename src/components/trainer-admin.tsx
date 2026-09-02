"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
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
        <Button
          type="button"
          isIconOnly
          size="sm"
          variant="outline"
          aria-label="Copiar contraseña"
          onPress={() => navigator.clipboard?.writeText(state.tempPassword)}
          className="rounded-full border-brand/40 text-brand-600 hover:bg-brand/10"
        >
          <Copy size={16} />
        </Button>
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
        <TextField name="full_name" isRequired fullWidth>
          <Label>Nombre completo *</Label>
          <Input />
        </TextField>
        <div className="grid grid-cols-2 gap-3">
          <TextField name="email" type="email" isRequired fullWidth>
            <Label>Correo *</Label>
            <Input autoComplete="email" inputMode="email" />
          </TextField>
          <Select name="role" fullWidth defaultSelectedKey="trainer">
            <Label>Rol *</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="trainer" textValue="Entrenador">
                  Entrenador
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="coordinator" textValue="Coordinador">
                  Coordinador
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {state && "error" in state && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          isPending={pending}
          className="rounded-full font-semibold"
        >
          {pending ? "Creando…" : "Crear cuenta"}
        </Button>
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
        <Button
          type="submit"
          size="sm"
          variant="outline"
          isPending={pending}
          className="rounded-full text-xs font-semibold text-muted"
        >
          {pending ? "…" : "Restablecer contraseña"}
        </Button>
      </form>
      {state && "error" in state && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
