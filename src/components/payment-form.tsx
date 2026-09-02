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
import { useActionState, useState } from "react";
import { createPaymentAction } from "@/actions/payments";
import type { ClientOption } from "@/lib/queries";
import { todayISO } from "@/lib/format";

export function PaymentForm({
  clients,
  defaultClientId,
}: {
  clients: ClientOption[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(createPaymentAction, null);
  const [status, setStatus] = useState<"pagado" | "pendiente">("pagado");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Select
        name="client_id"
        isRequired
        fullWidth
        defaultSelectedKey={defaultClientId}
        placeholder="Selecciona…"
      >
        <Label>Cliente *</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {clients.map((c) => (
              <ListBox.Item key={c.id} id={c.id} textValue={c.full_name}>
                {c.full_name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Select name="concept" fullWidth defaultSelectedKey="mensualidad">
          <Label>Concepto *</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="mensualidad" textValue="Mensualidad">
                Mensualidad
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="sesion_suelta" textValue="Sesión suelta">
                Sesión suelta
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
          name="amount"
          isRequired
          fullWidth
          minValue={0.01}
          step={0.01}
          formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
        >
          <Label>Importe (CUP) *</Label>
          <NumberField.Group>
            <NumberField.Input placeholder="3000" />
          </NumberField.Group>
        </NumberField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select name="method" fullWidth defaultSelectedKey="efectivo">
          <Label>Método *</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="efectivo" textValue="Efectivo">
                Efectivo
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="transferencia" textValue="Transferencia">
                Transferencia
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="otro" textValue="Otro">
                Otro
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          name="status"
          fullWidth
          selectedKey={status}
          onSelectionChange={(k) => setStatus(k as "pagado" | "pendiente")}
        >
          <Label>Estado *</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="pagado" textValue="Pagado">
                Pagado
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="pendiente" textValue="Pendiente">
                Pendiente
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {status === "pagado" ? (
        <TextField
          name="paid_on"
          type="date"
          isRequired
          fullWidth
          defaultValue={todayISO()}
        >
          <Label>Fecha de pago *</Label>
          <Input />
        </TextField>
      ) : (
        <TextField name="due_on" type="date" fullWidth>
          <Label>Fecha de vencimiento</Label>
          <Input />
        </TextField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TextField name="period_start" type="date" fullWidth>
          <Label>Período: desde</Label>
          <Input />
        </TextField>
        <TextField name="period_end" type="date" fullWidth>
          <Label>Período: hasta</Label>
          <Input />
        </TextField>
      </div>

      <TextField name="reference" fullWidth>
        <Label>Referencia (transferencia)</Label>
        <Input />
      </TextField>

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
        {pending ? "Registrando…" : "Registrar pago"}
      </Button>
    </form>
  );
}
