// Aplica las migraciones de supabase/migrations/ en orden, directo a Postgres.
// Usa DIRECT_URL (preferida) o DATABASE_URL de .env.local.
// Idempotente: registra las aplicadas en public._vitalfit_migrations y las salta.
//   npm i -D pg && node scripts/apply-migrations.mjs
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import pg from "pg";

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
  // sin .env.local: se esperan variables ya definidas en el entorno
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DIRECT_URL o DATABASE_URL en .env.local");
  process.exit(1);
}
if (url.includes("[YOUR-PASSWORD]")) {
  console.error(
    "La URL todavía contiene el placeholder [YOUR-PASSWORD].\n" +
      "Edita .env.local y sustitúyelo (corchetes incluidos) por tu contraseña\n" +
      "de base de datos (Project Settings → Database → Reset database password).",
  );
  process.exit(1);
}

const dir = resolve(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No hay archivos .sql en supabase/migrations/");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Conectado. ${files.length} migraciones encontradas.`);

  await client.query(`
    create table if not exists public._vitalfit_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query(
    "select name from public._vitalfit_migrations",
  );
  const applied = new Set(rows.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`- ${file} (ya aplicada, saltando)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    process.stdout.write(`> ${file} … `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into public._vitalfit_migrations (name) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log("OK");
      count++;
    } catch (err) {
      await client.query("rollback").catch(() => {});
      console.log("ERROR");
      console.error(`\nFalló ${file}:\n${err.message}\n`);
      console.error(
        "Nada de este archivo quedó aplicado (transacción revertida). " +
          "Corrige y vuelve a ejecutar: las anteriores no se repetirán.",
      );
      process.exit(1);
    }
  }

  console.log(
    count === 0
      ? "Todo estaba al día — nada que aplicar."
      : `Listo: ${count} migraciones aplicadas.`,
  );
} finally {
  await client.end().catch(() => {});
}
