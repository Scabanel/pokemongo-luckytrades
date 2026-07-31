import costumeCatalog from "@/data/costumes.json";
import gigantamaxIcons from "@/data/gigantamax-icons.json";
import goIcons from "@/data/go-icons.json";
import pogoAvailability from "@/data/pogo-availability.json";

const COSTUME_CATALOG = costumeCatalog as Record<string, { label: string; url: string }[]>;
const GIGANTAMAX_ICONS = gigantamaxIcons as Record<string, string[]>;
const GO_ICONS = goIcons as Record<string, string[]>;
// data/pogo-availability.json vient du Google Sheet que Steven tient à jour
// (voir scripts/generate-pogo-availability.mjs) : la seule source qui dise
// vraiment quelles espèces/variantes sont EN JEU, par opposition à "l'asset
// existe déjà dans le client" (souvent dataminé avant la sortie réelle,
// ex. Ogerpon/Terapagos). Remplace l'ancien data/dynamax-species.json
// (pokexperience.com) et ajoute un filtre équivalent pour Shiny (espèce de
// base, forme régionale, Gigamax) qui n'existait pas avant : tout costume/
// icône marqué shiny dans le catalogue était montré, qu'il soit réellement
// sorti ou non. Seuls les costumes événementiels "classiques" (pas les
// formes régionales) restent hors classeur : leur présence dans
// costumes.json (scrapée du client au moment de l'événement, pas dataminée
// à l'avance comme une nouvelle espèce) reste le seul et bon signal.
const DYNAMAX_SPECIES = new Set(pogoAvailability.dynamaxAvailable as number[]);
const SHINY_DYNAMAX_SPECIES = new Set(pogoAvailability.shinyDynamaxAvailable as number[]);
const SHINY_AVAILABLE_SPECIES = new Set(pogoAvailability.shinyAvailable as number[]);
const GIGANTAMAX_AVAILABLE_SPECIES = new Set(pogoAvailability.gigantamaxAvailable as number[]);
const GIGANTAMAX_SHINY_AVAILABLE_SPECIES = new Set(pogoAvailability.gigantamaxShinyAvailable as number[]);
const REGIONAL_FORM_SHINY_AVAILABLE_SPECIES = new Set(pogoAvailability.regionalFormShinyAvailable as number[]);
// Exportés pour que tout autre formulaire d'ajout (ex: SpritePicker/EntryForm
// dans AdminPanel.tsx, chemin d'ajout unique séparé de BulkAddPicker) applique
// exactement la même restriction plutôt que de la redéfinir/oublier à côté.
export const AVAILABLE_SPECIES = new Set(pogoAvailability.available as number[]);
export const DYNAMAX_AVAILABLE_SPECIES = DYNAMAX_SPECIES;
export { GIGANTAMAX_AVAILABLE_SPECIES };
const ICON_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";
// data/costumes.json mélange les vraies formes régionales (Alola/Galar/Hisui/
// Paldea) parmi les costumes événementiels — ce ne sont pas des costumes,
// juste une autre apparence naturelle de l'espèce, donc aucun tag "costume"
// ne doit leur être posé (détecté par préfixe de label, ex: "Alola",
// "Galarian Standard", "Hisuian (2)", "Paldea Combat" — vérifié
// exhaustivement sur tout le catalogue). Un visuel propre nécessite quand
// même de figer customSpriteUrl (voir variantNeedsPinnedSprite ci-dessous),
// juste sans passer par la catégorie "tags" affichée à l'utilisateur.
const REGIONAL_FORM_PREFIX = /^(alola|galar|hisui|paldea)/i;

export interface SpriteVariant {
  key: string;
  label: string;
  url: string;
  shiny: boolean;
  tags: string[];
  gender: "male" | "female" | null;
}

// Un costume "X (2)" est systématiquement le pendant féminin de "X" (vérifié
// exhaustivement : le suffixe "(2)" dans data/costumes.json correspond
// exactement, sans exception, au marqueur ".g2." dans l'URL du fichier
// PokeMiners — "gender 2"). Si "X" seul existe sans "X (2)", l'apparence est
// unique/asexuée : pas de badge dans ce cas.
export function detectCostumeGender(label: string, allLabels: string[]): "male" | "female" | null {
  // Le "(2)" se place AVANT le "✨" final ("Anniversary (2) ✨", pas
  // "Anniversary ✨ (2)") : il faut retirer/rajouter le sparkle à part pour
  // comparer le bon pendant, sinon les shiny ne se pairent jamais.
  const isShinyLabel = label.endsWith(" ✨");
  const core = isShinyLabel ? label.slice(0, -2) : label;
  const isSecond = core.includes(" (2)");
  const baseCore = core.replace(" (2)", "");
  const pairCore = isSecond ? baseCore : `${baseCore} (2)`;
  const pairLabel = isShinyLabel ? `${pairCore} ✨` : pairCore;
  if (!allLabels.includes(pairLabel)) return null;
  return isSecond ? "female" : "male";
}

// Toutes les variantes visuelles sélectionnables d'un Pokémon pour le picker
// d'ajout en masse : le costume officiel (base + formes + costumes
// événementiels, déjà tout dans data/costumes.json — Unown A-Z, Deoxys
// Attaque/Défense/Vitesse, déguisements Pikachu... y sont mélangés), plus le
// Gigamax officiel séparément (fichier dédié), plus deux entrées Dynamax
// (même sprite que la base : Dynamax ne change pas l'apparence dans GO,
// contrairement à Gigamax).
export function getSpriteVariants(pokemonId: number): SpriteVariant[] {
  // Les Méga-Évolutions ne servent à rien dans cette appli (pas de mécanique
  // Méga dans les échanges/recherches Pokémon GO) : on les exclut du picker.
  // "Gigantamax" est lui un pur doublon de gigantamax-icons.json (même
  // fichier exact, vérifié) : sans ce filtre, il récupérait à tort le tag
  // "costume" et créait une tuile identique à celle du Gigamax dédié plus bas.
  const costumes = (COSTUME_CATALOG[String(pokemonId)] ?? []).filter(
    (c) => !c.label.startsWith("Mega") && !c.label.startsWith("Gigantamax")
  );
  const allLabels = costumes.map((c) => c.label);
  // Shiny de forme régionale pas encore sorti (voir
  // REGIONAL_FORM_SHINY_AVAILABLE_SPECIES ci-dessus) : contrairement aux
  // costumes événementiels classiques, le classeur suit bien le shiny de
  // chaque forme régionale.
  const regionalFormShinyReleased = REGIONAL_FORM_SHINY_AVAILABLE_SPECIES.has(pokemonId);
  const variants: SpriteVariant[] = costumes
    .filter((c) => regionalFormShinyReleased || !(REGIONAL_FORM_PREFIX.test(c.label) && c.label.includes("✨")))
    .map((c) => ({
      key: c.url,
      label: c.label,
      url: c.url,
      shiny: c.label.includes("✨"),
      // Seuls les vrais costumes événementiels sont tagués "costume" : ni la
      // base, ni les formes régionales (voir REGIONAL_FORM_PREFIX plus haut).
      tags: c.label.startsWith("Officiel Pokémon GO") || REGIONAL_FORM_PREFIX.test(c.label) ? [] : ["costume"],
      gender: detectCostumeGender(c.label, allLabels),
    }));

  // Shiny "de base" (hors costume/forme régionale) pas encore sorti pour
  // cette espèce (voir SHINY_AVAILABLE_SPECIES ci-dessus) : le classeur de
  // Steven ne suit QUE le shiny sauvage/de base, pas les costumes — un shiny
  // événementiel (ex. déguisement d'anniversaire) peut très bien être sorti
  // avant le shiny sauvage de l'espèce, et sa présence dans costumes.json
  // (scrapée du client au moment de l'événement, pas dataminée à l'avance
  // comme une nouvelle espèce) suffit déjà à le confirmer réellement sorti.
  const shinyReleased = SHINY_AVAILABLE_SPECIES.has(pokemonId);
  const baseShinyIndex = variants.findIndex((v) => v.label === "Officiel Pokémon GO ✨");
  if (baseShinyIndex !== -1 && !shinyReleased) variants.splice(baseShinyIndex, 1);

  // costumes.json ne couvre que les espèces ayant déjà eu un costume/une
  // forme événementielle (~925/1025) : sans repli, tout Pokémon jamais
  // costumé n'aurait AUCUNE tuile du tout dans le picker, pas même son sprite
  // de base. go-icons.json couvre lui l'icône officielle de chaque espèce.
  if (!costumes.some((c) => c.label.startsWith("Officiel Pokémon GO"))) {
    const files = GO_ICONS[String(pokemonId)];
    if (files?.[0]) {
      variants.unshift({ key: `base-${files[0]}`, label: "Officiel Pokémon GO", url: `${ICON_BASE}/${encodeURIComponent(files[0])}`, shiny: false, tags: [], gender: null });
    }
    if (files?.[1] && shinyReleased) {
      variants.unshift({ key: `base-${files[1]}`, label: "Officiel Pokémon GO ✨", url: `${ICON_BASE}/${encodeURIComponent(files[1])}`, shiny: true, tags: [], gender: null });
    }
  }

  // Gigamax : le fichier existe parfois dans le datamine avant sa sortie
  // réelle en jeu (voir GIGANTAMAX_AVAILABLE_SPECIES ci-dessus) — sans ce
  // filtre, un Gigamax pas encore sorti (ex: Évoli) serait quand même
  // proposé.
  const gmax = GIGANTAMAX_AVAILABLE_SPECIES.has(pokemonId) ? GIGANTAMAX_ICONS[String(pokemonId)] : undefined;
  if (gmax) {
    const [normal, shiny] = gmax;
    if (normal) {
      variants.push({
        key: `gmax-${normal}`,
        label: "Gigamax",
        url: `${ICON_BASE}/${encodeURIComponent(normal)}`,
        shiny: false,
        tags: ["gigamax"],
        gender: null,
      });
    }
    if (shiny && GIGANTAMAX_SHINY_AVAILABLE_SPECIES.has(pokemonId)) {
      variants.push({
        key: `gmax-${shiny}`,
        label: "Gigamax ✨",
        url: `${ICON_BASE}/${encodeURIComponent(shiny)}`,
        shiny: true,
        tags: ["gigamax"],
        gender: null,
      });
    }
  }

  if (DYNAMAX_SPECIES.has(pokemonId)) {
    const base = variants.find((v) => v.label === "Officiel Pokémon GO");
    const baseShiny = variants.find((v) => v.label === "Officiel Pokémon GO ✨");
    if (base) {
      variants.push({ key: `dynamax-${base.url}`, label: "Dynamax", url: base.url, shiny: false, tags: ["dynamax"], gender: null });
    }
    // Shiny D-Max est une case à part sur le classeur : certaines espèces ont
    // Dynamax sans encore avoir Shiny Dynamax (ex: Ronflex l'a eu bien plus
    // tard que son Dynamax normal).
    if (baseShiny && SHINY_DYNAMAX_SPECIES.has(pokemonId)) {
      variants.push({ key: `dynamax-${baseShiny.url}`, label: "Dynamax ✨", url: baseShiny.url, shiny: true, tags: ["dynamax"], gender: null });
    }
  }

  return variants;
}

// Un shiny (base, forme régionale ou Gigamax) marqué "✨" dans le catalogue
// est-il réellement sorti dans GO, ou juste présent dans le datamine (voir
// commentaire en tête de fichier) ? Centralise la logique déjà appliquée par
// getSpriteVariants ci-dessus, pour que tout autre picker de sprite (ex:
// SpritePicker dans AdminPanel.tsx, chemin d'ajout unique séparé de
// BulkAddPicker) reste cohérent avec le même classeur au lieu de refaire ce
// calcul à côté (et de dériver au fil des mises à jour du classeur).
export function isCostumeShinyReleased(pokemonId: number, label: string): boolean {
  if (!label.includes("✨")) return true;
  if (REGIONAL_FORM_PREFIX.test(label)) return REGIONAL_FORM_SHINY_AVAILABLE_SPECIES.has(pokemonId);
  if (label.startsWith("Gigantamax")) return GIGANTAMAX_SHINY_AVAILABLE_SPECIES.has(pokemonId);
  if (label.startsWith("Officiel Pokémon GO")) return SHINY_AVAILABLE_SPECIES.has(pokemonId);
  // Costume événementiel classique : pas suivi par le classeur, sa présence
  // dans costumes.json (scrapée du client au moment de l'événement) suffit.
  return true;
}

// Un visuel qui ne peut pas être reconstruit juste à partir de
// pokemonId+tags+shiny (contrairement à la base/Dynamax/Gigamax, dérivés
// dynamiquement par PokemonCard) a besoin que customSpriteUrl soit figé :
// costumes événementiels, formes régionales, et variantes de genre pairées
// (même sans costume, ex. Pikachu femelle a une queue différente).
export function variantNeedsPinnedSprite(variant: SpriteVariant): boolean {
  return variant.tags.includes("costume") || REGIONAL_FORM_PREFIX.test(variant.label) || !!variant.gender;
}

// customSpriteUrl ne représente une VRAIE variante distincte en jeu (pour le
// matching "Dispo chez X dresseurs", badges want/give réciproques dans
// PokemonCard.tsx) que s'il correspond exactement à un costume/forme
// régionale/genre du catalogue (variantNeedsPinnedSprite) — càd une entrée
// qui EXISTE dans data/costumes.json avec une apparence réellement
// différente en jeu. Toute autre URL (sprite animé/officiel PokeAPI d'un
// Pokémon sans aucun costume comme Kyogre/Groudon, choix esthétique
// personnel, URL manuelle...) ne change rien à ce que le Pokémon EST dans
// GO : deux dresseurs ayant chacun choisi un style d'affichage différent
// pour le même Kyogre de base doivent quand même matcher entre eux. Avant ce
// correctif, seule l'URL exacte de "Officiel Pokémon GO" était reconnue
// comme équivalente à vide ; un sprite animé pris ailleurs (fetchAllSprites)
// restait à tort traité comme une forme différente, cassant le matching
// alors qu'aucune vraie variante n'existe pour ces espèces. Calculé au
// rendu (jamais stocké), donc s'applique aux entrées déjà existantes sans
// backfill à maintenir — même logique que le genre/légendaire ci-dessus.
export function canonicalCustomSpriteUrl(pokemonId: number, customSpriteUrl: string | null | undefined): string {
  if (!customSpriteUrl) return "";
  const isRealVariant = getSpriteVariants(pokemonId).some((v) => v.url === customSpriteUrl && variantNeedsPinnedSprite(v));
  return isRealVariant ? customSpriteUrl : "";
}

// Pour les entrées ajoutées avant l'existence du champ PokemonEntry.gender :
// retrouve le genre a posteriori en retrouvant, dans le catalogue, quel
// costume correspond exactement à ce customSpriteUrl, puis en appliquant la
// même détection de paire que detectCostumeGender. Calculé au rendu (jamais
// stocké), donc s'applique automatiquement à toutes les entrées existantes
// sans backfill à maintenir — même logique que le badge légendaire.
export function getGenderForCustomSprite(pokemonId: number, customSpriteUrl: string | null | undefined): "male" | "female" | null {
  if (!customSpriteUrl) return null;
  const costumes = COSTUME_CATALOG[String(pokemonId)] ?? [];
  const match = costumes.find((c) => c.url === customSpriteUrl);
  if (!match) return null;
  const allLabels = costumes.map((c) => c.label);
  return detectCostumeGender(match.label, allLabels);
}
