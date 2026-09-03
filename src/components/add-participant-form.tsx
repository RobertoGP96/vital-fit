"use client";

import { Button, ListBox, Select } from "@heroui/react";
import { useActionState } from "react";
import { addParticipantAction } from "@/actions/sessions";

export type AddableClient = {
  id: string;
  full_name: string;
  /** Ya tiene comprometidas sus sesiones máximas de ese día. */
  atLimit: boolean;
};

/** Ajuste puntual del día: sumar un cliente a la sesión. Los que ya están en
    su límite diario aparecen deshabilitados; la BD lo refuerza con trigger. */
export function AddParticipantForm({
  sessionId,
  clients,
}: {
  sessionId: string;
  clients: AddableClient[];
}) {
  const [state, formAction, pending] = useActionState(
    addParticipantAction,
    null,
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="session_id" value={sessionId} />
      <div className="flex gap-2">
        <Select
          name="client_id"
          isRequired
          aria-label="Agregar participante"
          placeholder="Agregar participante…"
          className="min-w-0 flex-1"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {clients.map((c) => (
                <ListBox.Item
                  key={c.id}
                  id={c.id}
                  textValue={c.full_name}
                  isDisabled={c.atLimit}
                >
                  {c.full_name}
                  {c.atLimit && (
                    <span className="text-xs text-muted"> · límite diario</span>
                  )}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Button
          type="submit"
          variant="secondary"
          isPending={pending}
          className="rounded-full font-semibold"
        >
          Agregar
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
