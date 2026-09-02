"use client";

import { Button, Label, ListBox, Select } from "@heroui/react";
import { useActionState, useEffect, useRef } from "react";
import { assignClientAction } from "@/actions/assignments";

type Option = { id: string; full_name: string };

export function AssignmentForm({
  clients,
  trainers,
}: {
  clients: Option[];
  trainers: Option[];
}) {
  const [state, formAction, pending] = useActionState(assignClientAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === null) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-(--radius-card) border border-line bg-white p-4"
    >
      <p className="font-bold">Nueva asignación</p>
      <div className="grid grid-cols-2 gap-3">
        <Select name="client_id" isRequired fullWidth placeholder="Selecciona…">
          <Label>Cliente</Label>
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
        <Select name="trainer_id" isRequired fullWidth placeholder="Selecciona…">
          <Label>Entrenador</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {trainers.map((t) => (
                <ListBox.Item key={t.id} id={t.id} textValue={t.full_name}>
                  {t.full_name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

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
        {pending ? "Asignando…" : "Asignar"}
      </Button>
    </form>
  );
}
