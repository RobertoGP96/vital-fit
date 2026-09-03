"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  TextArea,
  TextField,
} from "@heroui/react";
import { useActionState } from "react";
import type { FormState } from "@/actions/auth";

type Defaults = Partial<{
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  sex: string | null;
  marital_status: string | null;
  height_cm: number | null;
  preferred_units: string;
  max_daily_sessions: number;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  goals: string | null;
  notes: string | null;
}>;

export function ClientForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <TextField
        name="full_name"
        isRequired
        fullWidth
        defaultValue={defaults.full_name ?? ""}
      >
        <Label>Nombre completo *</Label>
        <Input placeholder="Nombre y apellidos" />
      </TextField>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="phone"
          type="tel"
          fullWidth
          defaultValue={defaults.phone ?? ""}
        >
          <Label>Teléfono</Label>
          <Input inputMode="tel" placeholder="+53 …" />
        </TextField>
        <TextField
          name="email"
          type="email"
          fullWidth
          defaultValue={defaults.email ?? ""}
        >
          <Label>Correo</Label>
          <Input inputMode="email" />
        </TextField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="birth_date"
          type="date"
          fullWidth
          defaultValue={defaults.birth_date ?? ""}
        >
          <Label>Nacimiento</Label>
          <Input />
        </TextField>
        <Select name="sex" fullWidth defaultSelectedKey={defaults.sex ?? ""}>
          <Label>Sexo</Label>
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
              <ListBox.Item id="femenino" textValue="Femenino">
                Femenino
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="masculino" textValue="Masculino">
                Masculino
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="otro" textValue="Otro">
                Otro
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          name="marital_status"
          fullWidth
          defaultSelectedKey={defaults.marital_status ?? ""}
        >
          <Label>Estado civil</Label>
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
              <ListBox.Item id="soltero_a" textValue="Soltero/a">
                Soltero/a
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="casado_a" textValue="Casado/a">
                Casado/a
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="divorciado_a" textValue="Divorciado/a">
                Divorciado/a
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="viudo_a" textValue="Viudo/a">
                Viudo/a
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="union_libre" textValue="Unión libre">
                Unión libre
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="otro" textValue="Otro">
                Otro
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <NumberField
          name="height_cm"
          fullWidth
          minValue={50}
          maxValue={299}
          step={0.1}
          formatOptions={{ maximumFractionDigits: 1, useGrouping: false }}
          defaultValue={defaults.height_cm ?? undefined}
        >
          <Label>Estatura (cm)</Label>
          <NumberField.Group>
            <NumberField.Input placeholder="170" inputMode="decimal" />
          </NumberField.Group>
        </NumberField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          name="preferred_units"
          fullWidth
          defaultSelectedKey={defaults.preferred_units ?? "metric"}
        >
          <Label>Unidades para medidas</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="metric" textValue="Centímetros / kilogramos">
                Centímetros / kilogramos
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="imperial" textValue="Pulgadas / libras">
                Pulgadas / libras
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <NumberField
          name="max_daily_sessions"
          fullWidth
          minValue={1}
          maxValue={10}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
          defaultValue={defaults.max_daily_sessions ?? 1}
        >
          <Label>Sesiones máx. al día</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="numeric" />
          </NumberField.Group>
        </NumberField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="emergency_contact_name"
          fullWidth
          defaultValue={defaults.emergency_contact_name ?? ""}
        >
          <Label>Contacto de emergencia</Label>
          <Input placeholder="Nombre" />
        </TextField>
        <TextField
          name="emergency_contact_phone"
          type="tel"
          fullWidth
          defaultValue={defaults.emergency_contact_phone ?? ""}
        >
          <Label>Tel. de emergencia</Label>
          <Input inputMode="tel" />
        </TextField>
      </div>

      <TextField name="goals" fullWidth defaultValue={defaults.goals ?? ""}>
        <Label>Objetivos</Label>
        <TextArea rows={2} placeholder="Bajar abdomen, tonificar piernas…" />
      </TextField>

      <TextField name="notes" fullWidth defaultValue={defaults.notes ?? ""}>
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
        className="mt-2 rounded-full font-semibold"
      >
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
