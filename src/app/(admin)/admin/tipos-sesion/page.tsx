import type { Metadata } from "next";
import { Button, Chip } from "@heroui/react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleSessionTypeActiveAction } from "@/actions/catalogs";
import {
  SessionTypeForm,
  type SessionTypeRow,
} from "@/components/catalog-admin";

export const metadata: Metadata = { title: "Tipos de sesión" };

type Row = SessionTypeRow & { is_active: boolean };

export default async function TiposSesionPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("session_types")
    .select("id, name, description, default_duration_min, color, is_active")
    .order("is_active", { ascending: false })
    .order("name");
  const types = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Tipos de sesión</h1>

      <details className="rounded-(--radius-card) border border-line bg-white p-4">
        <summary className="cursor-pointer font-bold text-brand-600">
          Nuevo tipo de sesión
        </summary>
        <div className="mt-4">
          <SessionTypeForm />
        </div>
      </details>

      {types.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Aún no hay tipos de sesión. Crea el primero arriba.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {types.map((t) => (
            <li
              key={t.id}
              className={`rounded-2xl border border-line bg-white ${t.is_active ? "" : "opacity-60"}`}
            >
              <details>
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: t.color ?? "#17C964" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="truncate text-xs text-muted">
                        {t.default_duration_min} min por defecto
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>
                    {!t.is_active && (
                      <Chip color="default" variant="soft" size="sm">
                        Inactivo
                      </Chip>
                    )}
                  </div>
                </summary>

                <div className="flex flex-col gap-3 border-t border-ink/5 p-4">
                  <SessionTypeForm type={t} />
                  <form action={toggleSessionTypeActiveAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="is_active" value={String(t.is_active)} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={t.is_active ? "danger-soft" : "outline"}
                      className="rounded-full"
                    >
                      {t.is_active ? "Desactivar" : "Reactivar"}
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Un tipo inactivo deja de ofrecerse al crear horarios y sesiones nuevas;
        las sesiones existentes conservan su tipo y color en la agenda.
      </p>
    </div>
  );
}
