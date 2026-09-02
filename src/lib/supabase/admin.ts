import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Cliente con la clave secreta (service role): SALTA RLS. Usar únicamente en
// server actions/route handlers administrativos, nunca importar desde código
// cliente ("server-only" rompe el build si ocurre).
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
