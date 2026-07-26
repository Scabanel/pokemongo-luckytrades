// Source de vérité déclarée par Steven pour "qu'est-ce qui est réellement
// sorti dans Pokémon GO" (espèce de base, Shiny, Dynamax, Shiny D-Max,
// Gigamax, Méga-Évolution) : un Google Sheet qu'il tient à jour lui-même,
// remplaçant à la fois l'heuristique par présence d'icône PokeMiners
// (repérait "sorti" un peu trop tôt : les assets client sont souvent
// dataminés avant la sortie réelle en jeu, ex. Ogerpon/Terapagos) et le
// scrape margxt.fr (mission d'origine de missingGigantamax/missingMega,
// voir generate-missing-pokemon.mjs) pour missingEntirely/missingShiny/
// missingGigantamax/missingMega tout à la fois.
//
// Le classeur expose un onglet "Available" par pseudo-région, plus un
// onglet "Regional Formes" qui regroupe formes régionales, Gigamax et
// Méga/Primo dans une seule liste par nom ("Gigantamax Charizard",
// "Mega Clefable", "Primal Kyogre"...).
//
// L'export CSV public échoue (page d'erreur Google Drive) sans un
// User-Agent de navigateur ; l'export XLSX complet, lui, fonctionne et
// donne accès à tous les onglets en un seul fichier.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as XLSX from "xlsx";
import { attachResolvedSprites } from "./resolve-sprite.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "pogo-availability.json");
const POKEMON_LIST_PATH = path.join(__dirname, "..", "data", "pokemon.json");

const SHEET_ID = "1z7OmsXvibyKJex2fDQN-ilYGSmOaTbPfo37m0rUUkH8";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

// Un par pseudo-région du classeur : chaque ligne y est une espèce de base
// (numéro national), colonnes fixes (voir en-tête réel ci-dessous).
const BASE_TABS = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Hisui", "Paldea", "Unknown"];
const FORMS_TAB = "Regional Formes";

// Colonnes de chaque onglet région (ligne d'en-tête réelle, vérifiée sur le
// classeur ; XLSX.utils.sheet_to_json ignore la colonne A vide, donc les
// index démarrent directement à "No.") : No. | Name | Available | Captured |
// Seen | Shinies | Shiny Caught | Shadow | Shadow Shiny | Dynamax |
// Shiny D-Max | HOME | Region Locked. "Captured"/"Seen"/"Shiny Caught"/"HOME"
// sont le suivi personnel de Steven, sans intérêt ici.
const COL = { id: 0, name: 1, available: 2, shiny: 5, dynamax: 9, shinyDynamax: 10 };

async function fetchWorkbook() {
  const res = await fetch(SHEET_URL, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Export Google Sheet → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return XLSX.read(buf, { type: "buffer" });
}

// Scrape pur (aucune écriture disque) : réutilisé par le CLI ci-dessous et
// par app/api/cron/refresh-data/route.ts.
export async function scrapePogoAvailability(pokemonList) {
  const wb = await fetchWorkbook();

  const available = new Set();
  const shinyAvailable = new Set();
  const dynamaxAvailable = new Set();
  const shinyDynamaxAvailable = new Set();

  for (const tabName of BASE_TABS) {
    const sheet = wb.Sheets[tabName];
    if (!sheet) continue;
    // range: 1 saute la ligne de titre vide au-dessus de l'en-tête réel.
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1 });
    for (const row of rows) {
      const id = row[COL.id];
      if (typeof id !== "number") continue;
      if (row[COL.available] === true) available.add(id);
      if (row[COL.shiny] === true) shinyAvailable.add(id);
      if (row[COL.dynamax] === true) dynamaxAvailable.add(id);
      if (row[COL.shinyDynamax] === true) shinyDynamaxAvailable.add(id);
    }
  }

  const gigantamaxAvailable = new Set();
  const gigantamaxCandidateIds = new Set();
  const gigantamaxShinyAvailable = new Set();
  const megaAvailable = new Set();
  const megaCandidateIds = new Set();
  // Une espèce n'a jamais qu'une seule forme régionale (Alola/Galar/Hisui/
  // Paldea) : un simple Set de dex ID suffit, pas besoin de préciser laquelle.
  const regionalFormShinyAvailable = new Set();
  const formsSheet = wb.Sheets[FORMS_TAB];
  if (formsSheet) {
    const rows = XLSX.utils.sheet_to_json(formsSheet, { header: 1, range: 1 });
    for (const row of rows) {
      const id = row[COL.id];
      const name = row[COL.name];
      if (typeof id !== "number" || typeof name !== "string") continue;
      const isAvailable = row[COL.available] === true;
      const isShinyAvailable = row[COL.shiny] === true;
      if (/^gigantamax/i.test(name)) {
        gigantamaxCandidateIds.add(id);
        if (isAvailable) gigantamaxAvailable.add(id);
        if (isShinyAvailable) gigantamaxShinyAvailable.add(id);
      } else if (/^(mega|primal)/i.test(name)) {
        megaCandidateIds.add(id);
        if (isAvailable) megaAvailable.add(id);
      } else if (isShinyAvailable) {
        // Le reste de l'onglet est fait de formes régionales (Alolan/
        // Galarian/Hisuian/Paldean) — vérifié exhaustivement, seules
        // Gigamax/Méga/Primal sont exclues ci-dessus.
        regionalFormShinyAvailable.add(id);
      }
    }
  }

  const nameById = new Map(pokemonList.map((p) => [p.id, p.frenchName]));
  const withName = (id, label) => ({ id, name: label ? label(nameById.get(id) ?? `#${id}`) : nameById.get(id) ?? `#${id}` });
  const speciesIds = pokemonList.map((p) => p.id);

  const missingEntirely = speciesIds.filter((id) => !available.has(id)).sort((a, b) => a - b).map((id) => withName(id));
  const missingShiny = speciesIds.filter((id) => available.has(id) && !shinyAvailable.has(id)).sort((a, b) => a - b).map((id) => withName(id));
  const missingGigantamax = speciesIds.filter((id) => available.has(id) && !gigantamaxAvailable.has(id) && gigantamaxCandidateIds.has(id))
    .sort((a, b) => a - b).map((id) => withName(id, (n) => `${n} Gigamax`));
  const missingMega = speciesIds.filter((id) => available.has(id) && !megaAvailable.has(id) && megaCandidateIds.has(id))
    .sort((a, b) => a - b).map((id) => withName(id, (n) => `Méga-${n}`));

  return {
    availability: {
      available: [...available].sort((a, b) => a - b),
      shinyAvailable: [...shinyAvailable].sort((a, b) => a - b),
      dynamaxAvailable: [...dynamaxAvailable].sort((a, b) => a - b),
      shinyDynamaxAvailable: [...shinyDynamaxAvailable].sort((a, b) => a - b),
      gigantamaxAvailable: [...gigantamaxAvailable].sort((a, b) => a - b),
      gigantamaxShinyAvailable: [...gigantamaxShinyAvailable].sort((a, b) => a - b),
      megaAvailable: [...megaAvailable].sort((a, b) => a - b),
      regionalFormShinyAvailable: [...regionalFormShinyAvailable].sort((a, b) => a - b),
    },
    missing: {
      missingEntirely: await attachResolvedSprites(missingEntirely),
      missingShiny: await attachResolvedSprites(missingShiny),
      missingGigantamax: await attachResolvedSprites(missingGigantamax),
      missingMega: await attachResolvedSprites(missingMega),
    },
  };
}

async function main() {
  console.log("Téléchargement du Google Sheet (classeur complet)…");
  const pokemonList = JSON.parse(await readFile(POKEMON_LIST_PATH, "utf-8"));
  const { availability, missing } = await scrapePogoAvailability(pokemonList);

  console.log(`✓ ${availability.available.length} espèces sorties`);
  console.log(`✓ ${missing.missingEntirely.length} absentes du jeu`);
  console.log(`✓ ${missing.missingShiny.length} sans shiny`);
  console.log(`✓ ${missing.missingGigantamax.length} sans Gigamax`);
  console.log(`✓ ${missing.missingMega.length} sans Méga-Évolution`);

  await writeFile(OUT_PATH, JSON.stringify(availability, null, 2) + "\n", "utf-8");
  console.log(`  → ${path.relative(process.cwd(), OUT_PATH)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
