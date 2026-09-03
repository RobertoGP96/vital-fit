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
import { registrarPagoExtraAction } from "@/actions/payments";
import { todayISO } from "@/lib/format";

/**
 * Pago excepcional (sesión suelta u otro concepto). No toca la cobertura de
 * mensualidad: para eso está CobroMensualidadForm.
 */
export function PagoExtraForm({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState(
    registrarPagoExtraAction,
    null,
  );
  const [method, setMethod] = useState("efectivo");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="client_id" value={clientId} />

      <div className="grid grid-cols-2 gap-3">
        <Select name="concept" fullWidth defaultSelectedKey="sesion_suelta">
          <Label>Concepto *</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
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
            <NumberField.Input inputMode="decimal" />
          </NumberField.Group>
        </NumberField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          name="method"
          fullWidth
          selectedKey={method}
          onSelectionChange={(k) => setMethod(String(k ?? "efectivo"))}
        >
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
      </div>

      {method === "transferencia" && (
        <TextField name="reference" fullWidth>
          <Label>Referencia de la transferencia</Label>
          <Input />
        </TextField>
      )}

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
