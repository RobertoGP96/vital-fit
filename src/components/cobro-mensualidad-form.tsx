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
import { addDays, format } from "date-fns";
import { cobrarMensualidadAction } from "@/actions/payments";
import { formatCup, formatShortDate, todayISO } from "@/lib/format";

function addDaysISO(iso: string, days: number): string {
  return format(addDays(new Date(`${iso}T00:00:00`), days), "yyyy-MM-dd");
}

/**
 * Cobro rápido de mensualidad: la tarifa la determina el servicio del
 * cliente. Si quien cobra no puede apartarse de ella (entrenador con cliente
 * de servicio con tarifa) el importe ni se envía: el RPC cobra la tarifa.
 * El servidor (cobrar_mensualidad) crea el período y el recibo juntos; aquí
 * solo se anticipa qué cubrirá.
 */
export function CobroMensualidadForm({
  clientId,
  precio,
  periodoDias,
  planName,
  cubiertoHasta,
  importeEditable,
}: {
  clientId: string;
  precio: number | null;
  periodoDias: number | null;
  planName: string | null;
  cubiertoHasta: string | null;
  importeEditable: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    cobrarMensualidadAction,
    null,
  );
  const [method, setMethod] = useState("efectivo");
  const [paidOn, setPaidOn] = useState(todayISO());

  // Mismo cálculo que el servidor: continúa la cobertura vigente o empieza
  // el día del cobro.
  const dias = periodoDias ?? 30;
  const desde =
    cubiertoHasta && paidOn && cubiertoHasta >= paidOn
      ? addDaysISO(cubiertoHasta, 1)
      : paidOn;
  const hasta = desde ? addDaysISO(desde, dias - 1) : "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="client_id" value={clientId} />

      <div className="grid grid-cols-2 gap-3">
        {importeEditable ? (
          <NumberField
            name="amount"
            isRequired
            fullWidth
            minValue={0.01}
            step={0.01}
            formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
            defaultValue={precio ?? NaN}
          >
            <Label>Importe (CUP) *</Label>
            <NumberField.Group>
              <NumberField.Input inputMode="decimal" />
            </NumberField.Group>
          </NumberField>
        ) : (
          // Tarifa fija del servicio: no viaja en el form, la aplica el RPC.
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Tarifa del servicio</span>
            <p className="flex h-11 items-center rounded-xl border border-line bg-cream px-3 font-semibold">
              {precio != null ? formatCup(precio) : "—"}
            </p>
          </div>
        )}

        <TextField
          name="paid_on"
          type="date"
          isRequired
          fullWidth
          value={paidOn}
          onChange={setPaidOn}
        >
          <Label>Fecha de cobro *</Label>
          <Input max={todayISO()} />
        </TextField>
      </div>

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

      {method === "transferencia" && (
        <TextField name="reference" fullWidth>
          <Label>Referencia de la transferencia</Label>
          <Input />
        </TextField>
      )}

      {desde && hasta && (
        <p className="rounded-2xl bg-brand/10 px-3.5 py-2.5 text-sm text-ink">
          Cubrirá <b>{dias} días</b>: del <b>{formatShortDate(desde)}</b> al{" "}
          <b>{formatShortDate(hasta)}</b>
          {planName ? ` · ${planName}` : ""}
        </p>
      )}

      {!importeEditable && (
        <p className="text-xs text-muted">
          La tarifa la determina el servicio del cliente. Si acordaron otro
          importe, debe cobrarlo un coordinador o admin.
        </p>
      )}

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-brand-600">
          Añadir nota
        </summary>
        <TextField name="notes" fullWidth className="mt-2">
          <Label className="sr-only">Notas</Label>
          <TextArea rows={2} />
        </TextField>
      </details>

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
        {pending ? "Cobrando…" : "Cobrar mensualidad"}
      </Button>
    </form>
  );
}
