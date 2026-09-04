"use client";

import {
  Button,
  Input,
  Label,
  NumberField,
  TextArea,
  TextField,
} from "@heroui/react";
import { useActionState } from "react";
import { createMeasurementAction } from "@/actions/measurements";
import { displayUnit } from "@/lib/format";

type MType = {
  id: string;
  code: string;
  name_es: string;
  canonical_unit: string;
};

export function MeasurementForm({
  clientId,
  types,
  today,
}: {
  clientId: string;
  types: MType[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(createMeasurementAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="client_id" value={clientId} />

      {/* Sin flex-1: el input de fecha estira su wrapper, así que crecía
          hasta ocupar todo el hueco sobrante de la fila. */}
      <div className="flex items-center gap-3">
        <TextField
          name="measured_at"
          type="date"
          isRequired
          defaultValue={today}
        >
          <Label>Fecha</Label>
          <Input />
        </TextField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {types.map((t) => (
          <div key={t.id} className="flex flex-col">
            <input type="hidden" name={`unit_${t.id}`} value={t.canonical_unit} />
            <NumberField
              name={`value_${t.id}`}
              fullWidth
              formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
            >
              <Label>
                {t.name_es}{" "}
                <span className="text-muted">
                  ({displayUnit(t.canonical_unit)})
                </span>
              </Label>
              <NumberField.Group>
                <NumberField.Input
                  placeholder="—"
                  inputMode="decimal"
                  className="text-lg font-semibold"
                />
              </NumberField.Group>
            </NumberField>
          </div>
        ))}
      </div>

      <TextField name="notes" fullWidth>
        <Label>Notas</Label>
        <TextArea rows={2} />
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
        {pending ? "Guardando…" : "Guardar medición"}
      </Button>
    </form>
  );
}
