/* Regenera todos los iconos de la app desde scripts/icons/render.html
   (pesa curvada + wordmark en Unbounded, dibujados en canvas y rasterizados
   con Chrome/Edge headless). Uso: node scripts/icons/gen-icons.mjs
   Escribe: public/icons/icon-{512,192}.png, icon-maskable-{512,192}.png,
   src/app/apple-icon.png y src/app/favicon.ico (16/32/48 embebidos como PNG).
   Los SVG (src/app/icon.svg, public/icons/icon.svg) replican a mano la misma
   geometría de render.html; si se cambia la pesa, tocar ambos. */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "..", "..");

const chrome = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => p && fs.existsSync(p));
if (!chrome) throw new Error("No se encontró Chrome ni Edge");

const dom = execFileSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--virtual-time-budget=15000",
    "--dump-dom",
    pathToFileURL(path.join(here, "render.html")).href,
  ],
  { maxBuffer: 64 * 1024 * 1024 },
).toString();

const m = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
if (!m) throw new Error("render.html no produjo #result");
const icons = JSON.parse(m[1]);
const png = (name) => Buffer.from(icons[name].split(",")[1], "base64");

const out = {
  "public/icons/icon-512.png": png("icon-512"),
  "public/icons/icon-192.png": png("icon-192"),
  "public/icons/icon-maskable-512.png": png("icon-maskable-512"),
  "public/icons/icon-maskable-192.png": png("icon-maskable-192"),
  "src/app/apple-icon.png": png("apple-icon"),
};
for (const [rel, buf] of Object.entries(out)) {
  fs.writeFileSync(path.join(project, rel), buf);
  console.log(rel, buf.length, "bytes");
}

const entries = [16, 32, 48].map((s) => ({ size: s, data: png("favicon-" + s) }));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = 6 + 16 * entries.length;
const dirs = entries.map((e) => {
  const d = Buffer.alloc(16);
  d.writeUInt8(e.size, 0);
  d.writeUInt8(e.size, 1);
  d.writeUInt16LE(1, 4);
  d.writeUInt16LE(32, 6);
  d.writeUInt32LE(e.data.length, 8);
  d.writeUInt32LE(offset, 12);
  offset += e.data.length;
  return d;
});
const ico = Buffer.concat([header, ...dirs, ...entries.map((e) => e.data)]);
fs.writeFileSync(path.join(project, "src/app/favicon.ico"), ico);
console.log("src/app/favicon.ico", ico.length, "bytes");
