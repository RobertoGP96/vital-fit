import type { Metadata } from "next";
import Link from "next/link";
import { Chip, SearchField } from "@heroui/react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { Fab } from "@/components/fab";

export const metadata: Metadata = { title: "Clientes" };

type ClientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
};

export default async function ClientesPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, full_name, phone, is_active")
    .order("full_name")
    .limit(100);

  if (q && q.trim()) {
    query = query.ilike("full_name", `%${q.trim()}%`);
  }

  const { data } = await query;
  const clients = (data ?? []) as ClientRow[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Clientes</h1>

      <form action="/clientes" method="get" role="search">
        <SearchField
          name="q"
          defaultValue={q ?? ""}
          aria-label="Buscar clientes"
          fullWidth
        >
          <SearchField.Group className="rounded-full">
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar por nombre…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </form>

      {clients.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          {q
            ? "Sin resultados para esa búsqueda."
            : "Aún no hay clientes visibles para ti."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition-colors hover:border-brand/40"
              >
                <Avatar name={c.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.full_name}</p>
                  {c.phone && (
                    <p className="truncate text-sm text-muted">{c.phone}</p>
                  )}
                </div>
                {!c.is_active && (
                  <Chip size="sm" variant="soft">
                    Inactivo
                  </Chip>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {session.role === "admin" && (
        <Fab href="/clientes/nuevo" label="Registrar cliente" />
      )}
    </div>
  );
}
