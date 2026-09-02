"use client";

import { Button, ToggleButton } from "@heroui/react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { savePhotoRecordAction } from "@/actions/photos";

const POSES = [
  { value: "frente", label: "Frente" },
  { value: "espalda", label: "Espalda" },
  { value: "perfil_izquierdo", label: "Perfil izq." },
  { value: "perfil_derecho", label: "Perfil der." },
  { value: "otro", label: "Otra" },
] as const;

export function PhotoUploader({ clientId }: { clientId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pose, setPose] = useState<string>("frente");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      // Comprimir en el teléfono antes de subir (clave con conexión lenta).
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
      });

      const today = new Date().toISOString().slice(0, 10);
      const path = `${clientId}/${today}_${crypto.randomUUID()}.webp`;

      const supabase = createClient();
      const { error: upError } = await supabase.storage
        .from("progress-photos")
        .upload(path, compressed, { contentType: "image/webp" });
      if (upError) throw new Error(upError.message);

      const result = await savePhotoRecordAction({
        client_id: clientId,
        storage_path: path,
        pose,
        taken_on: today,
      });
      if (result?.error) throw new Error(result.error);

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-(--radius-card) border border-line bg-white p-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {POSES.map((p) => (
          <ToggleButton
            key={p.value}
            size="sm"
            isSelected={pose === p.value}
            onChange={(selected) => {
              if (selected) setPose(p.value);
            }}
            className={
              pose === p.value
                ? "shrink-0 rounded-full border-0 bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream"
                : "shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-normal text-muted"
            }
          >
            {p.label}
          </ToggleButton>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <Button
        type="button"
        size="lg"
        fullWidth
        isPending={busy}
        onPress={() => inputRef.current?.click()}
        className="rounded-full font-semibold"
      >
        <Camera size={18} />
        {busy ? "Subiendo…" : "Tomar / subir foto"}
      </Button>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
