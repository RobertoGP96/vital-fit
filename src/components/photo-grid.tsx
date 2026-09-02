"use client";

import { Button } from "@heroui/react";
import { useState } from "react";
import { X } from "lucide-react";
import { deletePhotoAction } from "@/actions/photos";
import { formatShortDate } from "@/lib/format";

export type PhotoItem = {
  id: string;
  url: string;
  pose: string;
  taken_on: string;
  client_id: string;
};

const POSE_LABEL: Record<string, string> = {
  frente: "Frente",
  espalda: "Espalda",
  perfil_izquierdo: "Perfil izq.",
  perfil_derecho: "Perfil der.",
  otro: "Otra",
};

export function PhotoGrid({ photos }: { photos: PhotoItem[] }) {
  const [open, setOpen] = useState<PhotoItem | null>(null);

  if (photos.length === 0) {
    return (
      <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        Aún no hay fotos de progreso.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <li key={p.id}>
            <Button
              variant="ghost"
              onPress={() => setOpen(p)}
              className="block h-auto w-full overflow-hidden rounded-xl border border-line p-0"
            >
              {/* Signed URL temporal: <img> simple, next/image no aporta aquí */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`${POSE_LABEL[p.pose] ?? p.pose} · ${p.taken_on}`}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            </Button>
            <p className="mt-1 text-center text-[11px] text-muted">
              {POSE_LABEL[p.pose] ?? p.pose} · {formatShortDate(p.taken_on)}
            </p>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-4"
          onClick={() => setOpen(null)}
        >
          <div className="flex items-center justify-between text-cream">
            <p className="font-semibold">
              {POSE_LABEL[open.pose] ?? open.pose} ·{" "}
              {formatShortDate(open.taken_on)}
            </p>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Cerrar"
              onPress={() => setOpen(null)}
              className="rounded-full bg-white/10 text-cream"
            >
              <X size={20} />
            </Button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.url}
            alt=""
            className="my-4 min-h-0 flex-1 rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <form
            action={deletePhotoAction}
            onSubmit={(e) => {
              if (!confirm("¿Eliminar esta foto definitivamente?")) {
                e.preventDefault();
                return;
              }
              setOpen(null);
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
