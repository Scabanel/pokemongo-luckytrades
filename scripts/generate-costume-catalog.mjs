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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POKEMON_LIST_PATH = path.join(__dirname, "..", "data", "pokemon.json");
const OUT_PATH = path.join(__dirname, "..", "data", "costumes.json");
// Sous-ensemble léger (icône de base + shiny uniquement) pour PokemonSprite.tsx,
// utilisé sur chaque carte du catalogue public — costumes.json (tous les
// costumes historiques, ~700 Ko) ne doit être chargé que côté admin.
const ICONS_OUT_PATH = path.join(__dirname, "..", "data", "go-icons.json");
// Petit fichier pour l'onglet public "Pas encore sortis dans GO" : Pokémon
// absents du jeu, sans shiny, ou sans Gigamax (liste figée ci-dessous — le
// Gigamax a une liste d'espèces éligibles fixe dans les jeux principaux,
// contrairement au Dynamax qui n'en a pas et n'est donc pas calculable ici).
const MISSING_OUT_PATH = path.join(__dirname, "..", "data", "missing-in-go.json");

// Espèces pouvant Gigamax dans les jeux principaux (Épée/Bouclier + DLC),
// retiré depuis Écarlate/Violet — liste fixe, ne changera plus.
// Source : https://bulbapedia.bulbagarden.net/wiki/Gigantamax
const GIGANTAMAX_ELIGIBLE_DEX_IDS = [
  3, 6, 9, 12, 25, 52, 68, 94, 99, 131, 133, 143, 569, 809, 812, 815, 818, 823,
  826, 834, 839, 841, 842, 844, 849, 851, 858, 861, 869, 879, 884, 892,
];

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
  // Un token (même sans permissions particulières) évite la limite très
  // basse des requêtes non-authentifiées (60/h) sur l'API GitHub. On tente
  // `gh auth token` (CLI déjà connecté en local) et on retombe sur une
  // requête anonyme si absent — ne bloque jamais la génération.
  let token;
  try {
    const { execSync } = await import("node:child_process");
    token = execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    // gh non disponible/non connecté : requête anonyme (peut être limitée)
  }
  const res = await fetch(TREE_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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
  await writeFile(ICONS_OUT_PATH, JSON.stringify(icons) + "\n", "utf-8");
  console.log(`✓ ${Object.keys(icons).length} icônes de base → ${path.relative(process.cwd(), ICONS_OUT_PATH)}`);

  const pokemonList = JSON.parse(await readFile(POKEMON_LIST_PATH, "utf-8"));
  const nameById = new Map(pokemonList.map((p) => [p.id, p.frenchName]));
  const withName = (id) => ({ id, name: nameById.get(id) ?? `#${id}` });

  const missingEntirelyIds = [];
  for (let id = 1; id <= 1025; id++) {
    if (!icons[id]) missingEntirelyIds.push(id);
  }
  const missingShinyIds = Object.entries(icons)
    .filter(([, files]) => files.length === 1)
    .map(([id]) => Number(id));
  const missingGigantamaxIds = GIGANTAMAX_ELIGIBLE_DEX_IDS.filter((id) => {
    const list = catalog[id];
    return !list || !list.some((e) => e.label.toLowerCase().includes("gigantamax"));
  });

  const missingEntirely = missingEntirelyIds.map(withName).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const missingShiny = missingShinyIds.map(withName).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const missingGigantamax = missingGigantamaxIds.map(withName).sort((a, b) => a.name.localeCompare(b.name, "fr"));

  await writeFile(
    MISSING_OUT_PATH,
    JSON.stringify({ missingEntirely, missingShiny, missingGigantamax }, null, 2) + "\n",
    "utf-8"
  );
  console.log(
    `✓ Pas encore sortis : ${missingEntirely.length} absents, ${missingShiny.length} sans shiny, ${missingGigantamax.length} sans Gigamax → ${path.relative(process.cwd(), MISSING_OUT_PATH)}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
