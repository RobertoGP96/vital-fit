"use client";

import { Button } from "@heroui/react";
import { CopyPlus } from "lucide-react";
import { useActionState } from "react";
import { copyPreviousMonthAction } from "@/actions/blocks";

export function CopyMonthButton({ month }: { month: string }) {
  const [state, formAction, pending] = useActionState(
    copyPreviousMonthAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="month" value={month} />
      <Button
        type="submit"
        variant="secondary"
        isPending={pending}
        className="rounded-full font-semibold"
      >
        <CopyPlus size={16} />
        {pending ? "Copiando…" : "Copiar bloques del mes anterior"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-center text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
