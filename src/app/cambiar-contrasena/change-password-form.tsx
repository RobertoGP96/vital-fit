"use client";

import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import { useActionState } from "react";
import { changePassword } from "@/actions/auth";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <TextField name="password" type="password" isRequired minLength={8}>
        <Label>Nueva contraseña</Label>
        <Input placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
        <FieldError />
      </TextField>

      <TextField name="confirm" type="password" isRequired minLength={8}>
        <Label>Repite la contraseña</Label>
        <Input placeholder="••••••••" autoComplete="new-password" />
        <FieldError />
      </TextField>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        isPending={pending}
        className="mt-2 rounded-full font-semibold"
      >
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
