// Desempaqueta el bundle de Claude Design (desing/VitalFit.html) a design/extracted/.
// El bundle guarda los archivos reales (VitalFit v2.dc.html, support.js, image-slot.js,
// ios-frame.jsx, logo) en base64 dentro de <script type="__bundler/manifest">.
// Uso: node scripts/unpack-design.js
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'desing', 'VitalFit.html');
const outDir = path.join(__dirname, '..', 'design', 'extracted');
const html = fs.readFileSync(src, 'utf8');

function extract(type) {
  const re = new RegExp(`<script type="${type.replace('/', '[/]')}"[^>]*>`);
  const m = re.exec(html);
  if (!m) return null;
  const start = m.index + m[0].length;
  const end = html.indexOf('</script>', start);
  return html.slice(start, end);
}

const manifest = JSON.parse(extract('__bundler/manifest'));
const template = extract('__bundler/template');
fs.mkdirSync(outDir, { recursive: true });

let entries;
if (Array.isArray(manifest)) {
  entries = manifest.map((e, i) => [e.name || e.path || e.url || `entry-${i}`, e]);
} else {
  entries = Object.entries(manifest);
}

for (const [key, e] of entries) {
  const data = typeof e === 'string' ? e : (e.data || e.content || e.text || '');
  const mime = (typeof e === 'object' && (e.mime || e.mimeType || e.contentType)) || '';
  const safe = String(key).replace(/[^\w.\- ]+/g, '_').slice(-100) || 'file';
  const isText = /^(text[/]|application[/](json|javascript|xml))/.test(mime) || /\.(html?|js|jsx|css|json|svg|txt)$/i.test(safe);
  try {
    const buf = Buffer.from(data, 'base64');
    // heurística: si al decodificar produce mayormente ASCII imprimible o el mime es binario, guardar decodificado
    fs.writeFileSync(path.join(outDir, safe), buf);
    console.log('wrote', safe, buf.length, mime);
  } catch {
    fs.writeFileSync(path.join(outDir, safe), data, 'utf8');
    console.log('wrote (raw)', safe, data.length, mime);
  }
}
if (template) {
  fs.writeFileSync(path.join(outDir, '_template.json'), template, 'utf8');
  console.log('wrote _template.json', template.length);
}
console.log('done ->', outDir);
