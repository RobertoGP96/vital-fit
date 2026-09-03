"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  TextField,
} from "@heroui/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { createMembershipAction } from "@/actions/payments";
import { todayISO } from "@/lib/format";

type Plan = { id: string; name: string; price: number; duration_days: number };

export function MembershipForm({
  clientId,
  plans,
}: {
  clientId: string;
  plans: Plan[];
}) {
  const [state, formAction, pending] = useActionState(createMembershipAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [starts, setStarts] = useState<string>(todayISO());
  const [ends, setEnds] = useState<string>("");

  // Éxito = {} (objeto nuevo en cada envío, dispara el efecto). Los campos
  // controlados no los limpia form.reset(): se resetean explícitamente.
  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      setPrice(null);
      setStarts(todayISO());
      setEnds("");
    }
  }, [state]);

  function applyPlan(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setPrice(plan.price);
    // Mismo criterio que cobrar_mensualidad: el período cubre N días contando
    // el de inicio.
    setEnds(
      format(
        addDays(new Date(`${starts}T00:00:00`), plan.duration_days - 1),
        "yyyy-MM-dd",
      ),
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="client_id" value={clientId} />

      <Select
        name="plan_id"
        fullWidth
        defaultSelectedKey=""
        onSelectionChange={(k) => applyPlan(String(k ?? ""))}
      >
        <Label>Plan</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="" textValue="Personalizada">
              Personalizada
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
        <TextField
          name="starts_on"
          type="date"
          isRequired
          fullWidth
          value={starts}
          onChange={setStarts}
        >
          <Label>Inicio</Label>
          <Input />
        </TextField>
        <TextField
          name="ends_on"
          type="date"
          isRequired
          fullWidth
          value={ends}
          onChange={(v) => setEnds(v)}
        >
          <Label>Fin</Label>
          <Input />
        </TextField>
      </div>

      <NumberField
        name="price_agreed"
        isRequired
        fullWidth
        minValue={0}
        step={0.01}
        formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
        value={price ?? NaN}
        onChange={(v) => setPrice(Number.isNaN(v) ? null : v)}
      >
        <Label>Precio acordado (CUP)</Label>
        <NumberField.Group>
          <NumberField.Input inputMode="decimal" />
        </NumberField.Group>
      </NumberField>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p role="status" className="text-sm font-medium text-brand-600">
          Período guardado.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        isPending={pending}
        className="rounded-full font-semibold"
      >
        {pending ? "Guardando…" : "Guardar período"}
      </Button>
    </form>
  );
}
