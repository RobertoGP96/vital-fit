"use client";

import { Button, ToggleButton } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
} from "lucide-react";
import { deletePhotoAction } from "@/actions/photos";
import { formatMediumDate } from "@/lib/format";
import { POSES, POSE_LABEL } from "@/lib/poses";
import { PhotoCompare } from "@/components/photo-compare";

export type PhotoItem = {
  id: string;
  url: string;
  pose: string;
  taken_on: string;
  client_id: string;
};

const MODES = [
  { value: "galeria", label: "Galería", Icon: LayoutGrid },
  { value: "comparar", label: "Comparar", Icon: ArrowLeftRight },
] as const;

export function PhotosSection({
  photos,
  uploader,
}: {
  photos: PhotoItem[];
  uploader?: React.ReactNode;
}) {
  const [mode, setMode] = useState<"galeria" | "comparar">("galeria");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full border border-line bg-white p-1">
        {MODES.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            onPress={() => setMode(value)}
            aria-pressed={mode === value}
            className={
              mode === value
                ? "h-9 flex-1 gap-1.5 rounded-full bg-ink text-sm font-semibold text-cream"
                : "h-9 flex-1 gap-1.5 rounded-full text-sm font-medium text-muted"
            }
          >
            <Icon size={15} />
            {label}
          </Button>
        ))}
      </div>

      {mode === "galeria" && uploader}
      {mode === "galeria" ? (
        <PhotoGallery photos={photos} />
      ) : (
        <PhotoCompare photos={photos} />
      )}
    </div>
  );
}

/** Galería agrupada por fecha, con filtro por pose y visor con navegación. */
function PhotoGallery({ photos }: { photos: PhotoItem[] }) {
  const [pose, setPose] = useState<string>("todas");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const poseChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of photos) counts.set(p.pose, (counts.get(p.pose) ?? 0) + 1);
    return [
      { value: "todas", label: "Todas", count: photos.length },
      ...POSES.filter((p) => counts.has(p.value)).map((p) => ({
        value: p.value as string,
        label: p.label,
        count: counts.get(p.value) ?? 0,
      })),
    ];
  }, [photos]);

  const filtered = useMemo(
    () => (pose === "todas" ? photos : photos.filter((p) => p.pose === pose)),
    [photos, pose],
  );

  // Las fotos llegan ordenadas por fecha desc; agrupar preservando ese orden.
  const groups = useMemo(() => {
    const map = new Map<string, { photo: PhotoItem; idx: number }[]>();
    filtered.forEach((photo, idx) => {
      const list = map.get(photo.taken_on) ?? [];
      list.push({ photo, idx });
      map.set(photo.taken_on, list);
    });
    return [...map.entries()];
  }, [filtered]);

  const open =
    openIdx != null && openIdx < filtered.length ? filtered[openIdx] : null;

  useEffect(() => {
    if (openIdx == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIdx(null);
      if (e.key === "ArrowLeft")
        setOpenIdx((i) => (i != null && i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight")
        setOpenIdx((i) => (i != null && i < filtered.length - 1 ? i + 1 : i));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, filtered.length]);

  if (photos.length === 0) {
    return (
      <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        Aún no hay fotos de progreso.
      </p>
    );
  }

  return (
    <>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {poseChips.map((chip) => (
          <ToggleButton
            key={chip.value}
            size="sm"
            isSelected={pose === chip.value}
            onChange={(selected) => {
              if (selected) setPose(chip.value);
            }}
            className={
              pose === chip.value
                ? "shrink-0 rounded-full border-0 bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-normal text-muted"
            }
          >
            {chip.label} · {chip.count}
          </ToggleButton>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {groups.map(([date, items]) => (
          <section key={date}>
            <h2 className="mb-2 text-sm font-bold">{formatMediumDate(date)}</h2>
            <ul className="grid grid-cols-3 gap-2">
              {items.map(({ photo, idx }) => (
                <li key={photo.id}>
                  <Button
                    variant="ghost"
                    onPress={() => setOpenIdx(idx)}
                    className="block h-auto w-full overflow-hidden rounded-xl border border-line p-0"
                  >
                    {/* Signed URL temporal: <img> simple, next/image no aporta aquí */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`${POSE_LABEL[photo.pose] ?? photo.pose} · ${photo.taken_on}`}
                      loading="lazy"
                      className="aspect-[3/4] w-full object-cover"
                    />
                  </Button>
                  <p className="mt-1 text-center text-[11px] text-muted">
                    {POSE_LABEL[photo.pose] ?? photo.pose}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {open && openIdx != null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-4"
          onClick={() => setOpenIdx(null)}
        >
          <div className="flex items-center justify-between text-cream">
            <p className="font-semibold">
              {POSE_LABEL[open.pose] ?? open.pose} ·{" "}
              {formatMediumDate(open.taken_on)}
            </p>
            <div className="flex items-center gap-3">
              <p className="text-sm text-cream/60">
                {openIdx + 1} / {filtered.length}
              </p>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                aria-label="Cerrar"
                onPress={() => setOpenIdx(null)}
                className="rounded-full bg-white/10 text-cream"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          <div
            className="relative my-4 min-h-0 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open.url}
              alt=""
              className="h-full w-full rounded-xl object-contain"
            />
            {openIdx > 0 && (
              <Button
                isIconOnly
                variant="ghost"
                aria-label="Foto más reciente"
                onPress={() => setOpenIdx(openIdx - 1)}
                className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-white/10 text-cream"
              >
                <ChevronLeft size={22} />
              </Button>
            )}
            {openIdx < filtered.length - 1 && (
              <Button
                isIconOnly
                variant="ghost"
                aria-label="Foto más antigua"
                onPress={() => setOpenIdx(openIdx + 1)}
                className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-white/10 text-cream"
              >
                <ChevronRight size={22} />
              </Button>
            )}
          </div>

          <form
            action={deletePhotoAction}
            onSubmit={(e) => {
              if (!confirm("¿Eliminar esta foto definitivamente?")) {
                e.preventDefault();
                return;
              }
              setOpenIdx(null);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input type="hidden" name="id" value={open.id} />
            <input type="hidden" name="client_id" value={open.client_id} />
            <Button
              type="submit"
              variant="outline"
              fullWidth
              className="rounded-full border-red-400/40 text-sm font-semibold text-red-300"
            >
              Eliminar foto
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
