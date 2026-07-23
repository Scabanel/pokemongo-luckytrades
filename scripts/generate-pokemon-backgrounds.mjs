// Génère data/pokemon-backgrounds.json (fonds validés par Pokémon) et
// télécharge les images correspondantes dans public/event-backgrounds/.
//
// Source : margxt.fr, un fan-site qui tient à jour, événement par événement,
// quel Pokémon a reçu quel fond promotionnel — la seule source trouvée qui
// documente ce lien (le GAME_MASTER du jeu ne l'inclut pas, voir
// docs/research-fond-backgrounds.md pour le détail de la recherche).
//
// À la différence de data/backgrounds.json (généré depuis PokeMiners, tous
// les fonds pour n'importe quel Pokémon), ce fichier ne liste que les
// combinaisons Pokémon+fond confirmées par un événement réel.
//
// À relancer périodiquement (npm run gen:backgrounds) pour récupérer les
// nouveaux événements. Les images déjà téléchargées ne sont pas re-téléchargées.
//
// margxt.fr peut temporairement bloquer/rate-limiter après beaucoup de
// requêtes rapprochées (constaté après le téléchargement initial des 201
// images) — en cas d'échec, réessayer plus tard plutôt que d'insister.

import { writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "pokemon-backgrounds.json");
const IMAGES_DIR = path.join(__dirname, "..", "public", "event-backgrounds");

const PAGES = [
  "https://www.margxt.fr/liste-des-fonds-speciaux-fonds-souvenirs-des-evenements-dans-pokemon-go/",
  "https://www.margxt.fr/liste-des-fonds-souvenirs-des-raids-devenement-dans-pokemon-go/",
];

const DEX_RE = /\/(\d{3,4})-[^/]+\.(?:png|webp|jpg)$/i;

function slugify(url) {
  const name = url.split("/").pop();
  const dot = name.lastIndexOf(".");
  const base = name.slice(0, dot);
  const ext = name.slice(dot + 1).toLowerCase();
  const normalized = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${normalized}.${ext}`;
}

async function parsePage(url) {
  // Node/undici a parfois du mal à joindre margxt.fr (timeout de connexion)
  // là où curl passe sans problème — probablement une histoire de résolution
  // IPv6/IPv4. On retombe sur `curl` si le fetch natif échoue.
  let html;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.warn(`  ⚠ fetch natif a échoué (${err.message}), tentative via curl…`);
    const { execFileSync } = await import("node:child_process");
    html = execFileSync("curl", ["-sL", "-4", "-A", "Mozilla/5.0", url], { encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 });
  }
  const $ = cheerio.load(html);
  const rows = $("table tr");
  const results = [];

  rows.each((_, row) => {
    const tds = $(row).find("td");
    if (tds.length !== 3) return;
    const [eventCell, bgCell, pokeCell] = [tds.eq(0), tds.eq(1), tds.eq(2)];
    const event = eventCell.text().trim().replace(/\s+/g, " ");
    if (!event) return;

    const bgImages = bgCell
      .find("img")
      .map((_, img) => $(img).attr("src"))
      .get()
      .filter(Boolean);
    if (bgImages.length === 0) return;

    let groups = pokeCell.find("p").toArray();
    if (groups.length === 0) groups = [pokeCell.get(0)];

    const groupDexIds = groups.map((g) =>
      $(g)
        .find("img")
        .map((_, img) => {
          const m = DEX_RE.exec($(img).attr("src") || "");
          return m ? Number(m[1]) : null;
        })
        .get()
        .filter((n) => n !== null)
    );

    if (bgImages.length === groups.length && bgImages.length > 1) {
      bgImages.forEach((img, i) => {
        for (const dexId of groupDexIds[i] ?? []) {
          results.push({ dexId, event, url: img });
        }
      });
    } else {
      const allDex = [...new Set(groupDexIds.flat())];
      for (const img of bgImages) {
        for (const dexId of allDex) {
          results.push({ dexId, event, url: img });
        }
      }
    }
  });

  return results;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(IMAGES_DIR, { recursive: true });

  console.log("Téléchargement et analyse des pages margxt.fr…");
  const allEntries = (await Promise.all(PAGES.map(parsePage))).flat();
  console.log(`${allEntries.length} associations Pokémon↔fond trouvées.`);

  const uniqueImageUrls = [...new Set(allEntries.map((e) => e.url))];
  console.log(`${uniqueImageUrls.length} images uniques à vérifier/télécharger…`);

  let downloaded = 0;
  for (const url of uniqueImageUrls) {
    const slug = slugify(url);
    const dest = path.join(IMAGES_DIR, slug);
    if (await fileExists(dest)) continue;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.margxt.fr/" },
    });
    if (!res.ok) {
      console.warn(`  ⚠ Échec téléchargement ${url} (${res.status})`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    downloaded++;
  }
  console.log(`✓ ${downloaded} nouvelles images téléchargées (${uniqueImageUrls.length - downloaded} déjà présentes).`);

  const byDex = {};
  const seenPerDex = new Map();
  for (const { dexId, event, url } of allEntries) {
    const slug = slugify(url);
    const key = String(dexId);
    if (!seenPerDex.has(key)) seenPerDex.set(key, new Set());
    if (seenPerDex.get(key).has(slug)) continue;
    seenPerDex.get(key).add(slug);
    if (!byDex[key]) byDex[key] = [];
    byDex[key].push({ label: event, url: `/event-backgrounds/${slug}` });
  }

  await writeFile(OUT_PATH, JSON.stringify(byDex, null, 2) + "\n", "utf-8");
  console.log(`✓ ${Object.keys(byDex).length} Pokémon avec fonds confirmés → ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
