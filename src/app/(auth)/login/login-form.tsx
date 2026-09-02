"use client";

import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import { useActionState } from "react";
import { login } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <TextField name="email" type="email" isRequired>
        <Label>Correo</Label>
        <Input
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
          inputMode="email"
        />
        <FieldError />
      </TextField>

      <TextField name="password" type="password" isRequired>
        <Label>Contraseña</Label>
        <Input placeholder="••••••••" autoComplete="current-password" />
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
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
