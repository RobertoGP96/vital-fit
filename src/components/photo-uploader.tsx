"use client";

import { Button, Input, Label, TextField, ToggleButton } from "@heroui/react";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { savePhotoRecordAction } from "@/actions/photos";
import { todayISO } from "@/lib/format";
import { POSES } from "@/lib/poses";

export function PhotoUploader({ clientId }: { clientId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState<string>("frente");
  const [takenOn, setTakenOn] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOn)) {
        throw new Error("Elige la fecha en que se tomó la foto.");
      }

      // Comprimir en el teléfono antes de subir (clave con conexión lenta).
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
      });

      const path = `${clientId}/${takenOn}_${crypto.randomUUID()}.webp`;

      const supabase = createClient();
      const { error: upError } = await supabase.storage
        .from("progress-photos")
        .upload(path, compressed, { contentType: "image/webp" });
      if (upError) throw new Error(upError.message);

      // La action revalida /clientes/[id]/fotos: su respuesta ya refresca la
      // galería, sin router.refresh() (que duplicaba el render y la firma).
      const result = await savePhotoRecordAction({
        client_id: clientId,
        storage_path: path,
        pose,
        taken_on: takenOn,
      });
      if (result?.error) throw new Error(result.error);
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

      {/* Editable para cargar fotos antiguas de clientes con historial previo:
          la galería agrupa y compara por esta fecha, no por la de subida. */}
      <TextField
        name="taken_on"
        type="date"
        isRequired
        fullWidth
        value={takenOn}
        onChange={setTakenOn}
      >
        <Label>Fecha en que se tomó</Label>
        <Input max={todayISO()} />
      </TextField>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
