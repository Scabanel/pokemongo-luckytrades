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

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "costumes.json");
// Sous-ensemble léger (icône de base + shiny uniquement) pour PokemonSprite.tsx,
// utilisé sur chaque carte du catalogue public — costumes.json (tous les
// costumes historiques, ~700 Ko) ne doit être chargé que côté admin.
const ICONS_OUT_PATH = path.join(__dirname, "..", "data", "go-icons.json");

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

async function main() {
  console.log("Téléchargement de l'arborescence PokeMiners/pogo_assets…");
  const res = await fetch(TREE_URL);
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  if (data.truncated) {
    console.warn("⚠ Réponse GitHub tronquée — certains costumes récents pourraient manquer.");
  }

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

  await writeFile(OUT_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf-8");
  const totalCostumes = Object.values(catalog).reduce((sum, l) => sum + l.length, 0);
  console.log(`✓ ${Object.keys(catalog).length} Pokémon avec costumes, ${totalCostumes} sprites au total → ${path.relative(process.cwd(), OUT_PATH)}`);

  // Ne stocke que le nom de fichier (pas l'URL complète, identique pour tous)
  // pour garder ce fichier léger — il est chargé sur chaque carte publique.
  const icons = {};
  for (const [dexId, list] of Object.entries(catalog)) {
    const normal = list.find((e) => e.label === "Officiel Pokémon GO")?.url;
    const shiny = list.find((e) => e.label === "Officiel Pokémon GO ✨")?.url;
    if (!normal) continue;
    const filename = (url) => decodeURIComponent(url.slice(RAW_BASE.length + 1));
    icons[dexId] = shiny ? [filename(normal), filename(shiny)] : [filename(normal)];
  }
  await writeFile(ICONS_OUT_PATH, JSON.stringify(icons) + "\n", "utf-8");
  console.log(`✓ ${Object.keys(icons).length} icônes de base → ${path.relative(process.cwd(), ICONS_OUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
