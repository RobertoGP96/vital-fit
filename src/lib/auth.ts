import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "coordinator" | "trainer";

export type SessionInfo = {
  userId: string;
  role: Role;
  mustChangePassword: boolean;
};

// cache(): layout y página (y el layout de la ficha de cliente) piden la
// sesión en el mismo request; con esto el JWT se verifica una sola vez.
export const getSessionInfo = cache(
  async (): Promise<SessionInfo | null> => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims) return null;
    const meta = (claims.app_metadata ?? {}) as Record<string, unknown>;
    const role = meta.role;
    return {
      userId: claims.sub as string,
      role: role === "admin" || role === "coordinator" ? role : "trainer",
      mustChangePassword: meta.must_change_password === true,
    };
  },
);

export async function requireSession(): Promise<SessionInfo> {
  const session = await getSessionInfo();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionInfo> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/panel");
  return session;
}

export async function requireCoordinatorOrAdmin(): Promise<SessionInfo> {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "coordinator")
    redirect("/panel");
  return session;
}
