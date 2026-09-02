"use client";

import { Button, Input, Label, NumberField, TextField } from "@heroui/react";
import { useActionState } from "react";
import { createBlockAction } from "@/actions/blocks";

/** Alta de un bloque horario del plan mensual (solo coordinador/admin). */
export function BlockForm({ month }: { month: string }) {
  const [state, formAction, pending] = useActionState(createBlockAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />

      <div className="grid grid-cols-3 gap-3">
        <TextField
          name="start_time"
          type="time"
          isRequired
          fullWidth
          defaultValue="06:30"
        >
          <Label>Desde *</Label>
          <Input />
        </TextField>
        <TextField
          name="end_time"
          type="time"
          isRequired
          fullWidth
          defaultValue="08:00"
        >
          <Label>Hasta *</Label>
          <Input />
        </TextField>
        <NumberField
          name="capacity"
          fullWidth
          minValue={1}
          maxValue={200}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
        >
          <Label>Aforo</Label>
          <NumberField.Group>
            <NumberField.Input placeholder="∞" inputMode="numeric" />
          </NumberField.Group>
        </NumberField>
      </div>

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
        {pending ? "Creando…" : "Añadir bloque"}
      </Button>
    </form>
  );
}
