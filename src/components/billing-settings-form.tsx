"use client";

import {
  Button,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
} from "@heroui/react";
import { useActionState, useState } from "react";
import { updateBillingSettingsAction } from "@/actions/payments";

type Plan = { id: string; name: string; price: number; duration_days: number };

export type BillingSettings = {
  billing_enabled: boolean;
  billing_plan_id: string | null;
  billing_period_days: number | null;
  billing_reminder_days: number;
};

export function BillingSettingsForm({
  clientId,
  plans,
  settings,
}: {
  clientId: string;
  plans: Plan[];
  settings: BillingSettings;
}) {
  const [state, formAction, pending] = useActionState(
    updateBillingSettingsAction,
    null,
  );
  const [enabled, setEnabled] = useState(settings.billing_enabled);
  const [planId, setPlanId] = useState(settings.billing_plan_id ?? "");
  const plan = plans.find((p) => p.id === planId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="client_id" value={clientId} />

      <Switch
        name="billing_enabled"
        isSelected={enabled}
        onChange={setEnabled}
        className="items-start"
      >
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Content>
          <Label className="font-semibold">
            {enabled ? "Cobro habilitado" : "Cobro pausado"}
          </Label>
          <p className="text-xs text-muted">
            {enabled
              ? "El sistema avisará cuando se acerque el vencimiento."
              : "Sin recordatorios de pago (cliente que dejó de entrenar). Actívalo cuando retome."}
          </p>
        </Switch.Content>
      </Switch>

      <Select
        name="billing_plan_id"
        fullWidth
        selectedKey={planId}
        onSelectionChange={(k) => setPlanId(String(k ?? ""))}
      >
        <Label>Tipo de pago</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="" textValue="Personalizado">
              Personalizado
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {plans.map((p) => (
              <ListBox.Item
                key={p.id}
                id={p.id}
                textValue={`${p.name} — ${p.price} CUP / ${p.duration_days} días`}
              >
                {p.name} — {p.price} CUP / {p.duration_days} días
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          name="billing_period_days"
          fullWidth
          minValue={1}
          maxValue={366}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
          defaultValue={settings.billing_period_days ?? NaN}
        >
          <Label>Período de pago (días)</Label>
          <NumberField.Group>
            <NumberField.Input
              inputMode="numeric"
              placeholder={plan ? String(plan.duration_days) : "30"}
            />
          </NumberField.Group>
        </NumberField>

        <NumberField
          name="billing_reminder_days"
          isRequired
          fullWidth
          minValue={1}
          maxValue={60}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
          defaultValue={settings.billing_reminder_days}
        >
          <Label>Avisar antes (días)</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="numeric" placeholder="5" />
          </NumberField.Group>
        </NumberField>
      </div>

      <p className="text-xs text-muted">
        Período vacío = se usa la duración del plan elegido. El aviso aparece en
        la campana cuando falten esos días para el vencimiento.
      </p>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p role="status" className="text-sm font-medium text-brand-600">
          Configuración guardada.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        isPending={pending}
        className="rounded-full font-semibold"
      >
        {pending ? "Guardando…" : "Guardar configuración"}
      </Button>
    </form>
  );
}
