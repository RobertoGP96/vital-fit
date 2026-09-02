"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
} from "@heroui/react";
import { useActionState, useEffect, useRef } from "react";
import { createMedicalRecordAction } from "@/actions/medical";

export function MedicalRecordForm({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState(
    createMedicalRecordAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Éxito (state pasa a null tras un submit): limpiar el formulario.
  useEffect(() => {
    if (state === null) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-(--radius-card) border border-line bg-white p-4"
    >
      <p className="font-bold">Nueva entrada</p>
      <input type="hidden" name="client_id" value={clientId} />

      <div className="grid grid-cols-2 gap-3">
        <Select name="record_type" fullWidth defaultSelectedKey="patologia">
          <Label>Tipo</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="patologia" textValue="Patología">
                Patología
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="lesion" textValue="Lesión">
                Lesión
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="alergia" textValue="Alergia">
                Alergia
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="medicacion" textValue="Medicación">
                Medicación
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="cirugia" textValue="Cirugía">
                Cirugía
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="nota_clinica" textValue="Nota clínica">
                Nota clínica
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="otro" textValue="Otro">
                Otro
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <TextField name="diagnosed_on" type="date" fullWidth>
          <Label>Fecha diagnóstico</Label>
          <Input />
        </TextField>
      </div>

      <TextField name="title" isRequired fullWidth>
        <Label>Título *</Label>
        <Input placeholder="Hipertensión, lesión de rodilla…" />
      </TextField>

      <TextField name="description" fullWidth>
        <Label>Descripción</Label>
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
        {pending ? "Guardando…" : "Agregar al historial"}
      </Button>
    </form>
  );
}
