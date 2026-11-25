// Convertit en WebP les fonds restés en png/jpg dans public/event-backgrounds/ et supprime
// l'original. Les URLs ne bougent pas (voir nomWebp et next.config.ts). Idempotent.
// Usage : node scripts/convertir-fonds-webp.mjs
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { nomWebp, convertirEnWebp } from "./generate-pokemon-backgrounds.mjs";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "event-backgrounds");
let avant = 0, apres = 0, n = 0;
for (const f of await readdir(DIR)) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  const buf = await readFile(path.join(DIR, f));
  const out = await convertirEnWebp(buf);
  await writeFile(path.join(DIR, nomWebp(f)), out);
  await unlink(path.join(DIR, f));
  avant += buf.length; apres += out.length; n++;
}
console.log(`${n} fichiers : ${(avant / 1048576).toFixed(2)} Mo -> ${(apres / 1048576).toFixed(2)} Mo`);
