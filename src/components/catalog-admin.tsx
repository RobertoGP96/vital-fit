"use client";

import {
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  TextField,
} from "@heroui/react";
import { useActionState, useEffect, useRef } from "react";
import {
  createMeasurementTypeAction,
  createPlanAction,
  createSessionTypeAction,
  updateMeasurementTypeAction,
  updatePlanAction,
  updateSessionTypeAction,
} from "@/actions/catalogs";
import { displayUnit } from "@/lib/format";

type CatalogState = { error?: string } | null;
type CatalogAction = (
  prev: CatalogState,
  formData: FormData,
) => Promise<CatalogState>;

function useCatalogForm(action: CatalogAction, resetOnSuccess: boolean) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state === null) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return { state, formAction, pending, formRef };
}

function FormError({ state }: { state: CatalogState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm font-medium text-red-600">
      {state.error}
    </p>
  );
}

function SubmitButton({ pending, isNew }: { pending: boolean; isNew: boolean }) {
  return (
    <Button
      type="submit"
      size="lg"
      fullWidth
      isPending={pending}
      className="rounded-full font-semibold"
    >
      {pending ? "Guardando…" : isNew ? "Crear" : "Guardar cambios"}
    </Button>
  );
}

/* ── Servicios y tarifas (membership_plans) ──────────────────────────── */

export type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  sessions_included: number | null;
};

export function PlanForm({ plan }: { plan?: PlanRow }) {
  const isNew = !plan;
  const { state, formAction, pending, formRef } = useCatalogForm(
    isNew ? createPlanAction : updatePlanAction,
    isNew,
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {plan && <input type="hidden" name="id" value={plan.id} />}

      <TextField name="name" isRequired defaultValue={plan?.name ?? ""}>
        <Label>Nombre *</Label>
        <Input placeholder="Mensualidad" />
        <FieldError />
      </TextField>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          name="price"
          isRequired
          fullWidth
          minValue={0}
          step={0.01}
          formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
          defaultValue={plan?.price}
        >
          <Label>Tarifa (CUP) *</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="decimal" />
          </NumberField.Group>
        </NumberField>
        <NumberField
          name="duration_days"
          isRequired
          fullWidth
          minValue={1}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
          defaultValue={plan?.duration_days ?? 30}
        >
          <Label>Duración (días) *</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="numeric" />
          </NumberField.Group>
        </NumberField>
      </div>

      <NumberField
        name="sessions_included"
        fullWidth
        minValue={1}
        formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
        defaultValue={plan?.sessions_included ?? undefined}
      >
        <Label>Sesiones incluidas</Label>
        <NumberField.Group>
          <NumberField.Input placeholder="Vacío = ilimitadas" inputMode="numeric" />
        </NumberField.Group>
      </NumberField>

      <TextField name="description" defaultValue={plan?.description ?? ""}>
        <Label>Descripción</Label>
        <Input placeholder="Acceso mensual con entrenador" />
      </TextField>

      <FormError state={state} />
      <SubmitButton pending={pending} isNew={isNew} />
    </form>
  );
}

/* ── Tipos de sesión ─────────────────────────────────────────────────── */

export type SessionTypeRow = {
  id: string;
  name: string;
  description: string | null;
  default_duration_min: number;
  color: string | null;
};

export function SessionTypeForm({ type }: { type?: SessionTypeRow }) {
  const isNew = !type;
  const { state, formAction, pending, formRef } = useCatalogForm(
    isNew ? createSessionTypeAction : updateSessionTypeAction,
    isNew,
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {type && <input type="hidden" name="id" value={type.id} />}

      <TextField name="name" isRequired defaultValue={type?.name ?? ""}>
        <Label>Nombre *</Label>
        <Input placeholder="Fuerza" />
        <FieldError />
      </TextField>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          name="default_duration_min"
          isRequired
          fullWidth
          minValue={1}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
          defaultValue={type?.default_duration_min ?? 60}
        >
          <Label>Duración (min) *</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="numeric" />
          </NumberField.Group>
        </NumberField>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Color en la agenda *</span>
          <input
            name="color"
            type="color"
            defaultValue={type?.color ?? "#17C964"}
            className="h-11 w-full cursor-pointer rounded-xl border border-line bg-white p-1.5"
          />
        </label>
      </div>

      <TextField name="description" defaultValue={type?.description ?? ""}>
        <Label>Descripción</Label>
        <Input />
      </TextField>

      <FormError state={state} />
      <SubmitButton pending={pending} isNew={isNew} />
    </form>
  );
}

/* ── Tipos de medida ─────────────────────────────────────────────────── */

export type MeasurementTypeRow = {
  id: string;
  code: string;
  name_es: string;
  canonical_unit: string;
  sort_order: number;
  only_for_sex: "masculino" | "femenino" | null;
};

export function MeasurementTypeForm({ type }: { type?: MeasurementTypeRow }) {
  const isNew = !type;
  const { state, formAction, pending, formRef } = useCatalogForm(
    isNew ? createMeasurementTypeAction : updateMeasurementTypeAction,
    isNew,
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {type && <input type="hidden" name="id" value={type.id} />}

      <TextField name="name_es" isRequired defaultValue={type?.name_es ?? ""}>
        <Label>Nombre *</Label>
        <Input placeholder="Antebrazo derecho" />
        <FieldError />
      </TextField>

      {/* Los ids del selector son la unidad canónica de almacenamiento; las
          longitudes se registran y muestran en pulgadas (sistema fijo). */}
      <div className="grid grid-cols-2 gap-3">
        {isNew ? (
          <Select name="canonical_unit" fullWidth defaultSelectedKey="cm">
            <Label>Unidad *</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="cm" textValue="in (longitud)">
                  in (longitud)
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="kg" textValue="kg (peso)">
                  kg (peso)
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="%" textValue="% (porcentaje)">
                  % (porcentaje)
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Unidad</span>
            <p className="flex h-11 items-center rounded-xl border border-line bg-cream px-3 text-muted">
              {displayUnit(type.canonical_unit)}
            </p>
          </div>
        )}
        <NumberField
          name="sort_order"
          isRequired
          fullWidth
          minValue={0}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
          defaultValue={type?.sort_order ?? 100}
        >
          <Label>Orden *</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="numeric" />
          </NumberField.Group>
        </NumberField>
      </div>

      <Select
        name="only_for_sex"
        fullWidth
        defaultSelectedKey={type?.only_for_sex ?? "todos"}
      >
        <Label>Aplica a</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="todos" textValue="Todos los clientes">
              Todos los clientes
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="masculino" textValue="Solo hombres">
              Solo hombres
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="femenino" textValue="Solo mujeres">
              Solo mujeres
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>

      {!isNew && (
        <p className="text-xs text-muted">
          La unidad no se puede cambiar: las mediciones históricas están
          guardadas en ella.
        </p>
      )}

      <FormError state={state} />
      <SubmitButton pending={pending} isNew={isNew} />
    </form>
  );
}
