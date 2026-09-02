// Genera src/types/database.types.ts desde el esquema REAL de tu base de datos.
// Ejecutar DESPUÉS de aplicar las migraciones (y re-ejecutar tras cada cambio de esquema):
//   node scripts/gen-types.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {}

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

console.log("Generando tipos desde la base de datos…");
// execSync usa shell: necesario en Windows para resolver npx (.cmd).
const out = execSync(
  `npx -y supabase@latest gen types typescript --db-url "${url}"`,
  { encoding: "utf8", maxBuffer: 1024 * 1024 * 32, windowsHide: true },
);

mkdirSync(resolve(process.cwd(), "src", "types"), { recursive: true });
writeFileSync(resolve(process.cwd(), "src", "types", "database.types.ts"), out, "utf8");
console.log("OK → src/types/database.types.ts");
