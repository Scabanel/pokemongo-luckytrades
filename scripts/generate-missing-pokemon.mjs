// Regenere data/missing-in-go.json depuis margxt.fr, un fan-site qui tient
// a jour la liste reelle des Pokemon/formes absents de Pokemon GO - bien
// plus fiable que l'ancienne heuristique (presence/absence de costume dans
// PokeMiners), qui produisait de faux positifs/negatifs sur les formes
// recentes (Paldea, Gigamax...).
//
// Source : https://www.margxt.fr/guide-les-pokemon-introuvables-dans-pokemon-go/
//
// A relancer periodiquement (npm run gen:missing) pour suivre les sorties.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "missing-in-go.json");
const URL = "https://www.margxt.fr/guide-les-pokemon-introuvables-dans-pokemon-go/";

const SECTION_TARGET = {
  "Gen 4 – Sinnoh": "missingEntirely",
  "Gen 5 – Unys": "missingEntirely",
  "Gen 6 – Kalos": "missingEntirely",
  "Gen 7 – Alola": "missingEntirely",
  "Gen 8 – Galar": "missingEntirely",
  "Gen 8 – Hisui": "missingEntirely",
  "Gen 9 – Paldea": "missingEntirely",
  "Fusions": "missingEntirely",
  "Méga-Évolutions et Primo-Évolutions": "missingMega",
  "Gigamax": "missingGigantamax",
};

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`  ⚠ fetch natif a échoué (${err.message}), tentative via curl…`);
    const { execFileSync } = await import("node:child_process");
    return execFileSync("curl", ["-sL", "-4", "-A", "Mozilla/5.0", url], { encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 });
  }
}

const SPRITE_DEX_RE = /\/(\d{3,4})-/;

function cleanName($, td) {
  const clone = td.clone();
  clone.find("br").replaceWith(" ");
  clone.find("img, svg").remove();
  const text = clone
    .text()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  return text.replace(/\s+/g, " ").trim();
}

// Le numéro affiché ("//") ne suit pas toujours le vrai dex (ex: tous les
// types d'Arceus partagent "//" à la suite de Manaphy) - le nom de fichier
// du sprite, quand il y en a un, contient le vrai numéro national.
function spriteDexId($, td) {
  const img = $(td).find("img").toArray().find((img) => SPRITE_DEX_RE.test($(img).attr("src") || ""));
  if (!img) return null;
  const m = SPRITE_DEX_RE.exec($(img).attr("src"));
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  console.log("Téléchargement de la page margxt.fr…");
  const html = await fetchHtml(URL);
  const $ = cheerio.load(html);

  const result = { missingEntirely: [], missingShiny: [], missingGigantamax: [], missingMega: [] };
  const seen = { missingEntirely: new Set(), missingShiny: new Set(), missingGigantamax: new Set(), missingMega: new Set() };

  let currentSection = null;
  let lastDexId = null;

  $("h2, table").each((_, el) => {
    const $el = $(el);
    if (el.tagName === "h2") {
      const title = $el.text().replace(/\s+/g, " ").trim();
      currentSection = SECTION_TARGET[title] ?? null;
      lastDexId = null;
      return;
    }
    if (!currentSection) return;

    $el.find("tbody tr").each((_, row) => {
      const tds = $(row).find("td");
      if (tds.length < 2) return;
      const numRaw = $(tds[0]).text().trim();
      const name = cleanName($, $(tds[1]));
      if (!name) return;

      let dexId = spriteDexId($, tds[1]);
      if (!dexId) {
        dexId = numRaw === "//" || numRaw === "" ? lastDexId : parseInt(numRaw.replace(/^0+/, "") || "0", 10);
      }
      if (!dexId || Number.isNaN(dexId)) return;
      lastDexId = dexId;

      const key = `${dexId}-${name}`;
      if (seen[currentSection].has(key)) return;
      seen[currentSection].add(key);
      result[currentSection].push({ id: dexId, name });
    });
  });

  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  }

  console.log(`Absents du jeu : ${result.missingEntirely.length}`);
  console.log(`Sans Méga-Évolution : ${result.missingMega.length}`);
  console.log(`Sans Gigamax : ${result.missingGigantamax.length}`);

  // missingShiny vient de generate-costume-catalog.mjs (heuristique de
  // présence de sprite chromatique) - on la préserve, ce script ne la touche pas.
  let existing = {};
  try {
    existing = JSON.parse(await readFile(OUT_PATH, "utf-8"));
  } catch {
    // Rien de généré encore, tant pis.
  }
  delete result.missingShiny;

  await writeFile(OUT_PATH, JSON.stringify({ missingShiny: existing.missingShiny ?? [], ...result }, null, 2) + "\n", "utf-8");
  console.log(`✓ Écrit dans ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
