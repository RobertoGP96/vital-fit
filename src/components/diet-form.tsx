"use client";

import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import { useActionState, useEffect, useRef } from "react";
import { createDietPlanAction } from "@/actions/diet";

export function DietForm({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState(createDietPlanAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === null) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-(--radius-card) border border-line bg-white p-4"
    >
      <p className="font-bold">Nuevo plan / nota de dieta</p>
      <input type="hidden" name="client_id" value={clientId} />

      <TextField name="title" isRequired fullWidth>
        <Label>Título *</Label>
        <Input placeholder="Plan de definición, desayunos…" />
      </TextField>

      <div className="grid grid-cols-2 gap-3">
        <TextField name="starts_on" type="date" fullWidth>
          <Label>Desde</Label>
          <Input />
        </TextField>
        <TextField name="ends_on" type="date" fullWidth>
          <Label>Hasta</Label>
          <Input />
        </TextField>
      </div>

      <TextField name="content" fullWidth>
        <Label>Contenido</Label>
        <TextArea rows={4} placeholder="Comidas, cantidades, indicaciones…" />
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
        className="rounded-full font-semibold"
      >
        {pending ? "Guardando…" : "Guardar plan"}
      </Button>
    </form>
  );
}
