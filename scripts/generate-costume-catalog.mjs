// Génère data/costumes.json : tous les costumes officiels Pokémon GO par
// Pokémon (icône du jeu telle qu'extraite par la communauté), avec un libellé
// lisible dérivé du nom de fichier. Remplace le système précédent qui devinait
// une liste de ~24 suffixes Pokekalos à la main — ici c'est la source du jeu
// elle-même, à jour en continu par PokeMiners/pogo_assets.
//
// Source : https://github.com/PokeMiners/pogo_assets
// Dossier : Images/Pokemon - 256x256/Addressable Assets/
// Format de fichier : pm{dexId}[.{code}][.g2][.s].icon.png
//   - code : identifiant de costume/forme lisible (ex: HALLOWEEN_2021_NOEVOLVE)
//   - g2   : variante de genre/forme alternative
//   - s    : version shiny
//
// À relancer périodiquement (npm run gen:costumes) pour récupérer les
// nouveaux costumes ajoutés au jeu.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { attachResolvedSprites } from "./resolve-sprite.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POKEMON_LIST_PATH = path.join(__dirname, "..", "data", "pokemon.json");
const OUT_PATH = path.join(__dirname, "..", "data", "costumes.json");
// Sous-ensemble léger (icône de base + shiny uniquement) pour PokemonSprite.tsx,
// utilisé sur chaque carte du catalogue public — costumes.json (tous les
// costumes historiques, ~700 Ko) ne doit être chargé que côté admin.
const ICONS_OUT_PATH = path.join(__dirname, "..", "data", "go-icons.json");
// Sprites de forme Gigamax officiels (léger : une poignée d'espèces), utilisé
// pour afficher le vrai visuel Gigamax sur les tuiles publiques et privées.
const GIGANTAMAX_ICONS_OUT_PATH = path.join(__dirname, "..", "data", "gigantamax-icons.json");
// Fichier pour la page publique "Pas encore sortis dans GO". Ce script ne
// calcule ici que missingShiny (heuristique de sprite chromatique manquant) ;
// missingEntirely/missingGigantamax/missingMega viennent de
// scripts/generate-missing-pokemon.mjs (source margxt.fr), préservés lors de
// l'écriture.
const MISSING_OUT_PATH = path.join(__dirname, "..", "data", "missing-in-go.json");
// Fonds d'événement (GO Fest villes, anniversaires, équipes...) — génériques,
// pas liés à un Pokémon précis dans les données du jeu (contrairement aux
// costumes). Voir docs/research-fond-backgrounds.md pour le détail de la
// recherche qui a mené à cette source.
const BACKGROUNDS_OUT_PATH = path.join(__dirname, "..", "data", "backgrounds.json");
const BACKGROUNDS_PREFIX = "Images/LocationCards/";
const BACKGROUNDS_RAW_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/LocationCards";

const TREE_URL = "https://api.github.com/repos/PokeMiners/pogo_assets/git/trees/master?recursive=1";
const ASSET_PREFIX = "Images/Pokemon - 256x256/Addressable Assets/";
const RAW_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";

const FILENAME_RE = /^pm(\d+)((?:\.[^.]+)*)\.icon\.png$/;

function humanizeCode(code) {
  if (!code) return null;
  const stripped = code.replace(/^[cf]/, "").replace(/_NOEVOLVE$/, "");
  return stripped
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function humanizeBackgroundFilename(filename) {
  const stripped = filename.replace(/\.png$/i, "").replace(/^(sb_|lc_)/, "");
  const spaced = stripped
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")     // lettre → chiffre
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")     // chiffre → lettre
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseFilename(name) {
  const m = name.match(FILENAME_RE);
  if (!m) return null;
  const dexId = Number(m[1]);
  const tokens = m[2] ? m[2].split(".").filter(Boolean) : [];
  let g2 = false, shiny = false, code = null;
  for (const tok of tokens) {
    if (tok === "g2") g2 = true;
    else if (tok === "s") shiny = true;
    else code = tok;
  }
  return { dexId, code, g2, shiny };
}

// Récupère l'arborescence PokeMiners/pogo_assets. `githubToken` (optionnel)
// évite la limite très basse des requêtes non-authentifiées (60/h) sur
// l'API GitHub, en CLI local on retombe sur `gh auth token` si absent.
//
// L'API GitHub exige un User-Agent (sinon 403), et cet endpoint (arbre
// recursif d'un repo de plusieurs milliers de fichiers) répond parfois par
// un 500 transitoire - on retente quelques fois avant d'abandonner.
async function fetchTree(githubToken) {
  let token = githubToken;
  if (!token) {
    try {
      const { execSync } = await import("node:child_process");
      token = execSync("gh auth token", { encoding: "utf-8" }).trim();
    } catch {
      // gh non disponible/non connecté : requête anonyme (peut être limitée)
    }
  }

  const headers = {
    "User-Agent": "pokemongo-luckytrades",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(TREE_URL, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.truncated) {
        console.warn("⚠ Réponse GitHub tronquée : certains costumes récents pourraient manquer.");
      }
      return data;
    }
    lastError = new Error(`GitHub API ${res.status}`);
    if (res.status < 500 || attempt === 3) throw lastError;
    console.warn(`  ⚠ GitHub API ${res.status} (tentative ${attempt}/3), nouvel essai...`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw lastError;
}

// Calcul pur (aucune écriture disque) : réutilisé par le CLI ci-dessous et
// par app/api/cron/refresh-data/route.ts. `pokemonList` = data/pokemon.json
// déjà chargé (le CLI le lit du disque, la route l'importe directement).
export async function buildCostumeCatalog(pokemonList, githubToken) {
  const data = await fetchTree(githubToken);

  const paths = data.tree
    .map((t) => t.path)
    .filter((p) => p.startsWith(ASSET_PREFIX));

  console.log(`${paths.length} fichiers trouvés, extraction des costumes…`);

  // dexId -> Map<code|null, { g2?: {url,label}, shiny?: ..., g2Shiny?: ... }>
  const byDex = new Map();

  for (const p of paths) {
    const filename = p.slice(ASSET_PREFIX.length);
    const parsed = parseFilename(filename);
    if (!parsed) continue;
    const { dexId, code, g2, shiny } = parsed;
    if (dexId < 1 || dexId > 1025) continue;

    if (!byDex.has(dexId)) byDex.set(dexId, new Map());
    const costumes = byDex.get(dexId);
    if (!costumes.has(code)) costumes.set(code, {});
    const entry = costumes.get(code);
    const key = (g2 ? "g2" : "base") + (shiny ? "Shiny" : "");
    const encodedFilename = encodeURIComponent(filename);
    entry[key] = `${RAW_BASE}/${encodedFilename}`;
  }

  const catalog = {};
  for (const [dexId, costumes] of byDex) {
    const list = [];
    for (const [code, urls] of costumes) {
      const baseLabel = code ? humanizeCode(code) : "Officiel Pokémon GO";
      if (urls.base) list.push({ label: baseLabel, url: urls.base });
      if (urls.baseShiny) list.push({ label: `${baseLabel} ✨`, url: urls.baseShiny });
      if (urls.g2) list.push({ label: `${baseLabel} (2)`, url: urls.g2 });
      if (urls.g2Shiny) list.push({ label: `${baseLabel} (2) ✨`, url: urls.g2Shiny });
    }
    // Le costume de base ("Officiel Pokémon GO") en premier, le reste garde
    // l'ordre d'apparition dans l'arborescence (globalement chronologique).
    list.sort((a, b) => (a.label === "Officiel Pokémon GO" ? -1 : b.label === "Officiel Pokémon GO" ? 1 : 0));
    if (list.length > 0) catalog[dexId] = list;
  }

  const totalCostumes = Object.values(catalog).reduce((sum, l) => sum + l.length, 0);
  console.log(`✓ ${Object.keys(catalog).length} Pokémon avec costumes, ${totalCostumes} sprites au total`);

  // Ne stocke que le nom de fichier (pas l'URL complète, identique pour tous)
  // pour garder ce fichier léger — il est chargé sur chaque carte publique.
  //
  // Certaines espèces (Unown, Burmy, Vivillon, Zygarde, Oricorio...) n'ont
  // JAMAIS d'icône "sans code de forme" dans le jeu — chaque forme a son
  // propre fichier. Dans ce cas on prend la première forme rencontrée comme
  // représentante par défaut plutôt que de considérer l'espèce comme absente.
  const icons = {};
  for (const [dexId, list] of Object.entries(catalog)) {
    let normal = list.find((e) => e.label === "Officiel Pokémon GO")?.url;
    let shiny = list.find((e) => e.label === "Officiel Pokémon GO ✨")?.url;
    if (!normal && list.length > 0) {
      normal = list[0].url;
      shiny = list[1]?.label === `${list[0].label} ✨` ? list[1].url : undefined;
    }
    if (!normal) continue;
    const filename = (url) => decodeURIComponent(url.slice(RAW_BASE.length + 1));
    icons[dexId] = shiny ? [filename(normal), filename(shiny)] : [filename(normal)];
  }
  console.log(`✓ ${Object.keys(icons).length} icônes de base`);

  const nameById = new Map(pokemonList.map((p) => [p.id, p.frenchName]));
  const withName = (id) => ({ id, name: nameById.get(id) ?? `#${id}` });

  const missingShinyIds = Object.entries(icons)
    .filter(([, files]) => files.length === 1)
    .map(([id]) => Number(id));
  const missingShinyBase = missingShinyIds.map(withName).sort((a, b) => a.id - b.id);
  // Sprite résolu et figé une fois pour toutes (voir scripts/resolve-sprite.mjs) :
  // le navigateur affiche l'URL déjà vérifiée au lieu de retenter plusieurs
  // sources à chaque affichage, ce qui s'est révélé peu fiable en pratique.
  const missingShiny = await attachResolvedSprites(missingShinyBase);
  console.log(`✓ ${missingShiny.length} sans shiny`);

  // Absents du jeu : source de vérité = présence ou non d'une icône dans les
  // fichiers du client Pokémon GO lui-même (PokeMiners), pas un site tiers.
  // Avant ce changement, ce champ venait d'un scrape de margxt.fr qui listait
  // à tort des espèces pourtant bien présentes dans le jeu (ex : Amovénus
  // Forme Totémique #905, Colimucus de Hisui #705, qui ont toutes les deux
  // une icône ci-dessus), un fan-site peut se tromper ou dater, l'absence
  // réelle d'icône dans les données du jeu ne peut pas mentir.
  const missingEntirelyIds = pokemonList
    .map((p) => p.id)
    .filter((id) => !icons[id]);
  const missingEntirelyBase = missingEntirelyIds.map(withName).sort((a, b) => a.id - b.id);
  const missingEntirely = await attachResolvedSprites(missingEntirelyBase);
  console.log(`✓ ${missingEntirely.length} absents du jeu`);

  // Sprite officiel de forme Gigamax (aspect visuel réellement différent en jeu),
  // séparé de `icons` (léger, chargé sur chaque tuile publique) car seule une
  // poignée d'espèces peuvent Gigamax, pas la peine d'alourdir go-icons.json
  // pour ça. Le Dynamax, lui, ne change pas l'apparence dans GO : aucune icône
  // de forme dédiée n'existe côté PokeMiners, contrairement au Gigamax.
  const gigantamaxIcons = {};
  for (const [dexId, list] of Object.entries(catalog)) {
    const normal = list.find((e) => e.label === "Gigantamax")?.url;
    const shiny = list.find((e) => e.label === "Gigantamax ✨")?.url;
    if (!normal) continue;
    const filename = (url) => decodeURIComponent(url.slice(RAW_BASE.length + 1));
    gigantamaxIcons[dexId] = shiny ? [filename(normal), filename(shiny)] : [filename(normal)];
  }
  console.log(`✓ ${Object.keys(gigantamaxIcons).length} icônes Gigamax officielles`);

  const backgroundPaths = data.tree
    .map((t) => t.path)
    .filter((p) => p.startsWith(BACKGROUNDS_PREFIX) && /^(sb_|lc_)/i.test(p.slice(BACKGROUNDS_PREFIX.length)));

  const backgrounds = backgroundPaths
    .map((p) => {
      const filename = p.slice(BACKGROUNDS_PREFIX.length);
      return {
        label: humanizeBackgroundFilename(filename),
        url: `${BACKGROUNDS_RAW_BASE}/${encodeURIComponent(filename)}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  console.log(`✓ ${backgrounds.length} fonds d'événement génériques`);

  return { catalog, icons, gigantamaxIcons, missingShiny, missingEntirely, backgrounds };
}

async function main() {
  console.log("Téléchargement de l'arborescence PokeMiners/pogo_assets…");
  const pokemonList = JSON.parse(await readFile(POKEMON_LIST_PATH, "utf-8"));
  const { catalog, icons, gigantamaxIcons, missingShiny, missingEntirely, backgrounds } = await buildCostumeCatalog(pokemonList);

  await writeFile(OUT_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf-8");
  console.log(`  → ${path.relative(process.cwd(), OUT_PATH)}`);

  await writeFile(ICONS_OUT_PATH, JSON.stringify(icons) + "\n", "utf-8");
  console.log(`  → ${path.relative(process.cwd(), ICONS_OUT_PATH)}`);

  await writeFile(GIGANTAMAX_ICONS_OUT_PATH, JSON.stringify(gigantamaxIcons) + "\n", "utf-8");
  console.log(`  → ${path.relative(process.cwd(), GIGANTAMAX_ICONS_OUT_PATH)}`);

  // missingGigantamax/missingMega viennent de scripts/generate-missing-pokemon.mjs
  // (source margxt.fr, pas d'équivalent local pour ces deux-là) - on les préserve.
  let existingMissing = {};
  try {
    existingMissing = JSON.parse(await readFile(MISSING_OUT_PATH, "utf-8"));
  } catch {
    // Pas encore généré par generate-missing-pokemon.mjs, tant pis.
  }
  await writeFile(
    MISSING_OUT_PATH,
    JSON.stringify({ ...existingMissing, missingShiny, missingEntirely }, null, 2) + "\n",
    "utf-8"
  );
  console.log(`  → ${path.relative(process.cwd(), MISSING_OUT_PATH)}`);

  await writeFile(BACKGROUNDS_OUT_PATH, JSON.stringify(backgrounds, null, 2) + "\n", "utf-8");
  console.log(`  → ${path.relative(process.cwd(), BACKGROUNDS_OUT_PATH)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
