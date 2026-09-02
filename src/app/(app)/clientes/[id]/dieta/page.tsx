import { Button, Chip } from "@heroui/react";
import { createClient } from "@/lib/supabase/server";
import { toggleDietActiveAction } from "@/actions/diet";
import { DietForm } from "@/components/diet-form";
import { formatShortDate } from "@/lib/format";

type Plan = {
  id: string;
  title: string;
  content: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

export default async function DietaPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("diet_plans")
    .select("id, title, content, starts_on, ends_on, is_active")
    .eq("client_id", id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  const plans = (data ?? []) as Plan[];

  return (
    <div className="flex flex-col gap-4">
      <DietForm clientId={id} />

      {plans.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Sin planes de dieta todavía.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className={`rounded-2xl border border-line bg-white p-4 ${p.is_active ? "" : "opacity-70"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {p.title}{" "}
                    {p.is_active && (
                      <Chip size="sm" color="success" variant="soft" className="ml-1">
                        Activo
                      </Chip>
                    )}
                  </p>
                  {(p.starts_on || p.ends_on) && (
                    <p className="mt-0.5 text-xs text-muted">
                      {p.starts_on ? formatShortDate(p.starts_on) : "…"} —{" "}
                      {p.ends_on ? formatShortDate(p.ends_on) : "…"}
                    </p>
                  )}
                </div>
                <form action={toggleDietActiveAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="client_id" value={id} />
                  <input type="hidden" name="is_active" value={String(p.is_active)} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-full text-muted"
                  >
                    {p.is_active ? "Archivar" : "Activar"}
                  </Button>
                </form>
              </div>
              {p.content && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">
                  {p.content}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
