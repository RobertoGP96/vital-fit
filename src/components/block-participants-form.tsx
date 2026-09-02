"use client";

import { Button, Checkbox, Label } from "@heroui/react";
import { useActionState } from "react";
import { saveBlockParticipantsAction } from "@/actions/blocks";
import type { ClientOption } from "@/lib/queries";

/** Distribución mensual: qué clientes asisten a este bloque cada día. */
export function BlockParticipantsForm({
  blockId,
  clients,
  selected,
}: {
  blockId: string;
  clients: ClientOption[];
  selected: string[];
}) {
  const [state, formAction, pending] = useActionState(
    saveBlockParticipantsAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="block_id" value={blockId} />

      {clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-4 text-sm text-muted">
          No hay clientes activos registrados.
        </p>
      ) : (
        <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-line bg-white p-2">
          {clients.map((c) => (
            <Checkbox
              key={c.id}
              name="participants"
              value={c.id}
              defaultSelected={selected.includes(c.id)}
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

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        isPending={pending}
        className="self-end rounded-full font-semibold"
      >
        {pending ? "Guardando…" : "Guardar clientes"}
      </Button>
    </form>
  );
}
