"use client";

import { Button } from "@heroui/react";
import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAttendanceAction } from "@/actions/sessions";

/**
 * Tri-estado por participante: sin registro / asistió / faltó.
 * Tocar el estado activo lo limpia (vuelve a "sin registro") — la asistencia
 * nunca es obligatoria.
 */
export function AttendanceToggle({
  sessionId,
  clientId,
  attended,
}: {
  sessionId: string;
  clientId: string;
  attended: boolean | null; // null = no registrada
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set(state: "attended" | "missed" | "clear") {
    const fd = new FormData();
    fd.set("session_id", sessionId);
    fd.set("client_id", clientId);
    fd.set("state", state);
    startTransition(async () => {
      await setAttendanceAction(fd);
      router.refresh();
    });
  }

  return (
    <div className={`flex gap-1.5 ${pending ? "opacity-50" : ""}`}>
      <Button
        type="button"
        isIconOnly
        size="sm"
        variant={attended === true ? "primary" : "outline"}
        aria-label="Asistió"
        aria-pressed={attended === true}
        isDisabled={pending}
        onPress={() => set(attended === true ? "clear" : "attended")}
        className={
          attended === true ? "rounded-full" : "rounded-full text-muted"
        }
      >
        <Check size={16} strokeWidth={3} />
      </Button>
      <Button
        type="button"
        isIconOnly
        size="sm"
        variant={attended === false ? "danger" : "outline"}
        aria-label="Faltó"
        aria-pressed={attended === false}
        isDisabled={pending}
        onPress={() => set(attended === false ? "clear" : "missed")}
        className={
          attended === false ? "rounded-full" : "rounded-full text-muted"
        }
      >
        <X size={16} strokeWidth={3} />
      </Button>
    </div>
  );
}
