"use client";

import {
  Button,
  Input,
  Label,
  NumberField,
  TextArea,
  TextField,
  ToggleButton,
} from "@heroui/react";
import { useActionState, useState } from "react";
import { createMeasurementAction } from "@/actions/measurements";

type MType = {
  id: string;
  code: string;
  name_es: string;
  canonical_unit: string;
};

const IMPERIAL_LABEL: Record<string, string> = { cm: "in", kg: "lb", "%": "%" };

export function MeasurementForm({
  clientId,
  types,
  defaultUnits,
  today,
}: {
  clientId: string;
  types: MType[];
  defaultUnits: "metric" | "imperial";
  today: string;
}) {
  const [state, formAction, pending] = useActionState(createMeasurementAction, null);
  const [units, setUnits] = useState<"metric" | "imperial">(defaultUnits);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="input_units" value={units} />

      <div className="flex items-center justify-between gap-3">
        <TextField
          name="measured_at"
          type="date"
          isRequired
          className="flex-1"
          defaultValue={today}
        >
          <Label>Fecha</Label>
          <Input />
        </TextField>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium">Unidades</legend>
          <div className="flex overflow-hidden rounded-xl border border-line">
            {(["metric", "imperial"] as const).map((u) => (
              <ToggleButton
                key={u}
                isSelected={units === u}
                onChange={(selected) => {
                  if (selected) setUnits(u);
                }}
                className={
                  units === u
                    ? "rounded-none border-0 bg-ink px-4 py-3 text-sm font-bold text-cream"
                    : "rounded-none border-0 bg-white px-4 py-3 text-sm font-normal text-muted"
                }
              >
                {u === "metric" ? "cm/kg" : "in/lb"}
              </ToggleButton>
            ))}
          </div>
        </fieldset>
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
                  ({units === "imperial" ? IMPERIAL_LABEL[t.canonical_unit] : t.canonical_unit})
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
