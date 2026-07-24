// Regenere la partie missingGigantamax/missingMega de data/missing-in-go.json
// depuis margxt.fr. La liste des Pokemon completement absents du jeu
// (missingEntirely) ne vient PLUS de ce scrape : elle est calculee dans
// scripts/generate-costume-catalog.mjs directement depuis les donnees du
// client Pokemon GO (PokeMiners), une source qui ne peut pas etre datee ou
// se tromper contrairement a un fan-site (margxt.fr listait par exemple a
// tort Amovenus Forme Totemique et Colimucus de Hisui, pourtant bien
// presents dans le jeu). Pour Gigamax/Mega en revanche, aucune donnee de jeu
// n'existe a diffuser (l'espece n'a justement AUCUNE trace dans GO) : margxt.fr
// reste la seule source disponible pour ces deux categories.
//
// Source : https://www.margxt.fr/guide-les-pokemon-introuvables-dans-pokemon-go/
//
// A relancer periodiquement (npm run gen:missing) pour suivre les sorties.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as cheerio from "cheerio";
import { attachResolvedSprites } from "./resolve-sprite.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "missing-in-go.json");
const URL = "https://www.margxt.fr/guide-les-pokemon-introuvables-dans-pokemon-go/";

const SECTION_TARGET = {
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

// Scrape pur (aucune écriture disque) : réutilisé par le CLI ci-dessous et
// par app/api/cron/refresh-data/route.ts. Ne renvoie ni missingShiny ni
// missingEntirely, qui viennent tous les deux de generate-costume-catalog.mjs
// (données du jeu lui-même, voir le commentaire en tête de ce fichier).
export async function scrapeMissingPokemon() {
  const html = await fetchHtml(URL);
  const $ = cheerio.load(html);

  const result = { missingGigantamax: [], missingMega: [] };
  const seen = { missingGigantamax: new Set(), missingMega: new Set() };

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

  // Sprite résolu et figé une fois pour toutes (voir scripts/resolve-sprite.mjs).
  for (const key of Object.keys(result)) {
    result[key] = await attachResolvedSprites(result[key]);
  }

  return result;
}

async function main() {
  console.log("Téléchargement de la page margxt.fr…");
  const result = await scrapeMissingPokemon();

  console.log(`Sans Méga-Évolution : ${result.missingMega.length}`);
  console.log(`Sans Gigamax : ${result.missingGigantamax.length}`);

  // missingShiny et missingEntirely viennent de generate-costume-catalog.mjs
  // (données du jeu) - on les préserve, ce script ne les touche pas.
  let existing = {};
  try {
    existing = JSON.parse(await readFile(OUT_PATH, "utf-8"));
  } catch {
    // Rien de généré encore, tant pis.
  }

  await writeFile(
    OUT_PATH,
    JSON.stringify(
      { missingShiny: existing.missingShiny ?? [], missingEntirely: existing.missingEntirely ?? [], ...result },
      null,
      2
    ) + "\n",
    "utf-8"
  );
  console.log(`✓ Écrit dans ${path.relative(process.cwd(), OUT_PATH)}`);
}

// N'exécute le CLI que si le script est lancé directement (pas importé par la route cron).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
