"use client";

import { Button, ToggleButton } from "@heroui/react";
import { useMemo, useRef, useState } from "react";
import { addMonths, differenceInCalendarDays, differenceInMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Columns2, MoveHorizontal } from "lucide-react";
import { formatMediumDate, formatShortDate } from "@/lib/format";
import { POSES, POSE_LABEL } from "@/lib/poses";
import type { PhotoItem } from "@/components/photos-section";

const VIEWS = [
  { value: "lado", label: "Lado a lado", Icon: Columns2 },
  { value: "cortina", label: "Deslizar", Icon: MoveHorizontal },
] as const;

/** Comparador de evolución: dos fotos de la misma pose, en fechas distintas. */
export function PhotoCompare({ photos }: { photos: PhotoItem[] }) {
  // Por pose, ordenadas de más antigua a más reciente.
  const byPose = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();
    for (const p of photos) {
      const list = map.get(p.pose) ?? [];
      list.push(p);
      map.set(p.pose, list);
    }
    for (const list of map.values())
      list.sort((a, b) => a.taken_on.localeCompare(b.taken_on));
    return map;
  }, [photos]);

  const comparablePoses = useMemo(
    () => POSES.filter((p) => (byPose.get(p.value)?.length ?? 0) >= 2),
    [byPose],
  );

  const [pose, setPose] = useState<string | null>(
    comparablePoses[0]?.value ?? null,
  );
  const [view, setView] = useState<"lado" | "cortina">("lado");
  // Índices sobre la lista de la pose activa (asc por fecha).
  const [sel, setSel] = useState<{ before: number; after: number }>(() => ({
    before: 0,
    after: (pose ? (byPose.get(pose)?.length ?? 1) : 1) - 1,
  }));

  if (comparablePoses.length === 0) {
    return (
      <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        Para comparar la evolución hacen falta al menos dos fotos de la misma
        pose en fechas distintas. Sube fotos con la misma pose de forma regular
        y aquí verás el antes y el después.
      </p>
    );
  }

  const list = pose ? (byPose.get(pose) ?? []) : [];
  const before = list[sel.before];
  const after = list[sel.after];

  function choosePose(value: string) {
    setPose(value);
    const len = byPose.get(value)?.length ?? 0;
    setSel({ before: 0, after: len - 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {comparablePoses.map((p) => (
          <ToggleButton
            key={p.value}
            size="sm"
            isSelected={pose === p.value}
            onChange={(selected) => {
              if (selected) choosePose(p.value);
            }}
            className={
              pose === p.value
                ? "shrink-0 rounded-full border-0 bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-normal text-muted"
            }
          >
            {p.label} · {byPose.get(p.value)?.length}
          </ToggleButton>
        ))}
      </div>

      <div className="flex rounded-full border border-line bg-white p-1">
        {VIEWS.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            onPress={() => setView(value)}
            aria-pressed={view === value}
            className={
              view === value
                ? "h-8 flex-1 gap-1.5 rounded-full bg-soft text-xs font-semibold text-ink"
                : "h-8 flex-1 gap-1.5 rounded-full text-xs font-medium text-muted"
            }
          >
            <Icon size={14} />
            {label}
          </Button>
        ))}
      </div>

      {before && after && (
        <>
          {view === "lado" ? (
            <div className="grid grid-cols-2 gap-2">
              <ComparePane label="Antes" photo={before} />
              <ComparePane label="Después" photo={after} />
            </div>
          ) : (
            <OverlayCompare before={before} after={after} />
          )}

          <p className="text-center text-sm text-muted">
            Diferencia:{" "}
            <span className="font-bold text-ink">
              {elapsedLabel(before.taken_on, after.taken_on)}
            </span>
          </p>

          <div className="grid grid-cols-2 gap-2">
            <DateStepper
              label="Antes"
              list={list}
              index={sel.before}
              min={0}
              max={sel.after - 1}
              onChange={(i) => setSel((s) => ({ ...s, before: i }))}
            />
            <DateStepper
              label="Después"
              list={list}
              index={sel.after}
              min={sel.before + 1}
              max={list.length - 1}
              onChange={(i) => setSel((s) => ({ ...s, after: i }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ComparePane({ label, photo }: { label: string; photo: PhotoItem }) {
  return (
    <figure className="relative overflow-hidden rounded-xl border border-line">
      {/* Signed URL temporal: <img> simple, next/image no aporta aquí */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={`${label} · ${POSE_LABEL[photo.pose] ?? photo.pose} · ${photo.taken_on}`}
        className="aspect-[3/4] w-full object-cover"
        draggable={false}
      />
      <figcaption className="absolute top-2 left-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-cream">
        {label} · {formatShortDate(photo.taken_on)}
      </figcaption>
    </figure>
  );
}

/** Cortinilla: la foto antigua encima, recortada hasta el divisor arrastrable. */
function OverlayCompare({
  before,
  after,
}: {
  before: PhotoItem;
  after: PhotoItem;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);

  function posFromClientX(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(95, Math.max(5, pct)));
  }

  return (
    <div
      ref={ref}
      className="relative aspect-[3/4] w-full touch-none overflow-hidden rounded-xl border border-line select-none"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        posFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) posFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after.url}
        alt={`Después · ${after.taken_on}`}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before.url}
          alt={`Antes · ${before.taken_on}`}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <span className="absolute top-2 left-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-cream">
        Antes · {formatShortDate(before.taken_on)}
      </span>
      <span className="absolute top-2 right-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-cream">
        Después · {formatShortDate(after.taken_on)}
      </span>

      <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-md" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Divisor de comparación"
          aria-valuemin={5}
          aria-valuemax={95}
          aria-valuenow={Math.round(pos)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft")
              setPos((p) => Math.max(5, p - 5));
            if (e.key === "ArrowRight")
              setPos((p) => Math.min(95, p + 5));
          }}
          className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lg outline-offset-2"
        >
          <MoveHorizontal size={16} />
        </div>
      </div>
    </div>
  );
}

function DateStepper({
  label,
  list,
  index,
  min,
  max,
  onChange,
}: {
  label: string;
  list: PhotoItem[];
  index: number;
  min: number;
  max: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-line bg-white p-2">
      <p className="text-[11px] font-bold tracking-wide text-muted uppercase">
        {label}
      </p>
      <div className="flex w-full items-center justify-between">
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          isDisabled={index <= min}
          aria-label={`${label}: foto anterior`}
          onPress={() => onChange(index - 1)}
          className="rounded-full"
        >
          <ChevronLeft size={16} />
        </Button>
        <p className="text-sm font-semibold">
          {formatMediumDate(list[index].taken_on)}
        </p>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          isDisabled={index >= max}
          aria-label={`${label}: foto siguiente`}
          onPress={() => onChange(index + 1)}
          className="rounded-full"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
      <p className="text-[11px] text-muted">
        {index + 1} de {list.length}
      </p>
    </div>
  );
}

function elapsedLabel(fromISO: string, toISO: string): string {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  const totalDays = differenceInCalendarDays(to, from);
  if (totalDays <= 0) return "mismo día";

  const months = differenceInMonths(to, from);
  if (months === 0) return totalDays === 1 ? "1 día" : `${totalDays} días`;

  const rest = differenceInCalendarDays(to, addMonths(from, months));
  const monthsPart = months === 1 ? "1 mes" : `${months} meses`;
  if (rest <= 0) return monthsPart;
  return `${monthsPart} y ${rest === 1 ? "1 día" : `${rest} días`}`;
}
