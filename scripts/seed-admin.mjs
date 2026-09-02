// Crea el PRIMER administrador (idempotente). Ejecutar DESPUÉS de las migraciones:
//   npm run seed-admin
// Lee .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
// SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Carga .env.local sin depender de dotenv.
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // sin .env.local: se esperan variables de entorno ya definidas
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!url || !secret || !email || !password) {
  console.error(
    "Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD",
  );
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// GoTrue inserta el usuario ANTES de aplicar app_metadata, así que el trigger
// handle_new_user no ve el rol y crea el profile como 'trainer'. El rol se
// espeja aquí de forma explícita en ambas capas (JWT y profiles).
async function mirrorAdminRole(userId) {
  const { error } = await admin
    .from("profiles")
    .update({ role: "admin", is_active: true })
    .eq("id", userId);
  if (error) {
    console.error("Error espejando el rol en profiles:", error.message);
    process.exit(1);
  }
}

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: "admin" },
  user_metadata: { full_name: "Administrador" },
});

if (error) {
  if (
    error.code === "email_exists" ||
    /already.*registered/i.test(error.message)
  ) {
    // Idempotente Y reparador: aunque el usuario exista de una corrida
    // anterior, asegura que las dos capas de rol (JWT y profiles) queden bien.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existing = list?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (listErr || !existing) {
      console.error("El admin ya existe pero no se pudo localizar para repararlo.");
      process.exit(1);
    }
    await admin.auth.admin.updateUserById(existing.id, {
      app_metadata: { role: "admin" },
    });
    await mirrorAdminRole(existing.id);
    console.log("El admin ya existía — rol verificado/reparado en ambas capas.");
    process.exit(0);
  }
  console.error("Error creando el admin:", error.message);
  process.exit(1);
}

console.log("Admin creado:", data.user.id);
await mirrorAdminRole(data.user.id);
console.log("Rol admin espejado en public.profiles.");
