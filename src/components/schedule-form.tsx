"use client";

import {
  Button,
  Checkbox,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  TextField,
} from "@heroui/react";
import { useActionState } from "react";
import { createScheduleAction } from "@/actions/sessions";
import type { ClientOption } from "@/lib/queries";

type SessionType = { id: string; name: string };

const WEEKDAYS = [
  { v: 1, l: "Lunes" },
  { v: 2, l: "Martes" },
  { v: 3, l: "Miércoles" },
  { v: 4, l: "Jueves" },
  { v: 5, l: "Viernes" },
  { v: 6, l: "Sábado" },
  { v: 7, l: "Domingo" },
];

export function ScheduleForm({
  trainerId,
  types,
  clients,
}: {
  trainerId: string;
  types: SessionType[];
  clients: ClientOption[];
}) {
  const [state, formAction, pending] = useActionState(createScheduleAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="trainer_id" value={trainerId} />

      <div className="grid grid-cols-2 gap-3">
        <Select name="weekday" isRequired fullWidth defaultSelectedKey={1}>
          <Label>Día *</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {WEEKDAYS.map((d) => (
                <ListBox.Item key={d.v} id={d.v} textValue={d.l}>
                  {d.l}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <TextField
          name="start_time"
          type="time"
          isRequired
          fullWidth
          defaultValue="08:00"
        >
          <Label>Hora *</Label>
          <Input />
        </TextField>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberField
          name="duration_min"
          isRequired
          fullWidth
          minValue={10}
          maxValue={360}
          step={5}
          defaultValue={60}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
        >
          <Label>Minutos *</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="numeric" />
          </NumberField.Group>
        </NumberField>
        <NumberField
          name="capacity"
          fullWidth
          minValue={1}
          maxValue={100}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
        >
          <Label>Aforo</Label>
          <NumberField.Group>
            <NumberField.Input placeholder="∞" inputMode="numeric" />
          </NumberField.Group>
        </NumberField>
        <Select name="session_type_id" fullWidth defaultSelectedKey="">
          <Label>Tipo</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="" textValue="—">
                —
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {types.map((t) => (
                <ListBox.Item key={t.id} id={t.id} textValue={t.name}>
                  {t.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Participantes recurrentes</legend>
        {clients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-4 text-sm text-muted">
            Este entrenador no tiene clientes asignados.
          </p>
        ) : (
          <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-line bg-white p-2">
            {clients.map((c) => (
              <Checkbox
                key={c.id}
                name="participants"
                value={c.id}
                className="w-full"
              >
                <Checkbox.Content className="flex w-full rounded-lg px-2 py-1.5 hover:bg-cream">
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{c.full_name}</Label>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </div>
        )}
      </fieldset>

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
        {pending ? "Creando…" : "Crear horario semanal"}
      </Button>
    </form>
  );
}
