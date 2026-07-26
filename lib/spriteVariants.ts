import costumeCatalog from "@/data/costumes.json";
import gigantamaxIcons from "@/data/gigantamax-icons.json";
import goIcons from "@/data/go-icons.json";
import dynamaxSpecies from "@/data/dynamax-species.json";

const COSTUME_CATALOG = costumeCatalog as Record<string, { label: string; url: string }[]>;
const GIGANTAMAX_ICONS = gigantamaxIcons as Record<string, string[]>;
const GO_ICONS = goIcons as Record<string, string[]>;
// Liste des dex ID ayant réellement une forme Dynamax en jeu (extraite du
// catalogue pokexperience.com, lui-même dérivé du GAME_MASTER Niantic) :
// contrairement à Gigamax (déjà limité par gigantamax-icons.json), rien
// dans nos autres sources ne dit quelles espèces ont un Dynamax — sans ce
// filtre, toutes les espèces avec un sprite de base en auraient un à tort.
const DYNAMAX_SPECIES = new Set(dynamaxSpecies as number[]);
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
  const variants: SpriteVariant[] = costumes.map((c) => ({
    key: c.url,
    label: c.label,
    url: c.url,
    shiny: c.label.includes("✨"),
    // Seuls les vrais costumes événementiels sont tagués "costume" : ni la
    // base, ni les formes régionales (voir REGIONAL_FORM_PREFIX plus haut).
    tags: c.label.startsWith("Officiel Pokémon GO") || REGIONAL_FORM_PREFIX.test(c.label) ? [] : ["costume"],
    gender: detectCostumeGender(c.label, allLabels),
  }));

  // costumes.json ne couvre que les espèces ayant déjà eu un costume/une
  // forme événementielle (~925/1025) : sans repli, tout Pokémon jamais
  // costumé n'aurait AUCUNE tuile du tout dans le picker, pas même son sprite
  // de base. go-icons.json couvre lui l'icône officielle de chaque espèce.
  if (!costumes.some((c) => c.label.startsWith("Officiel Pokémon GO"))) {
    const files = GO_ICONS[String(pokemonId)];
    if (files?.[0]) {
      variants.unshift({ key: `base-${files[0]}`, label: "Officiel Pokémon GO", url: `${ICON_BASE}/${encodeURIComponent(files[0])}`, shiny: false, tags: [], gender: null });
    }
    if (files?.[1]) {
      variants.unshift({ key: `base-${files[1]}`, label: "Officiel Pokémon GO ✨", url: `${ICON_BASE}/${encodeURIComponent(files[1])}`, shiny: true, tags: [], gender: null });
    }
  }

  const gmax = GIGANTAMAX_ICONS[String(pokemonId)];
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
    if (shiny) {
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
    if (baseShiny) {
      variants.push({ key: `dynamax-${baseShiny.url}`, label: "Dynamax ✨", url: baseShiny.url, shiny: true, tags: ["dynamax"], gender: null });
    }
  }

  return variants;
}

// Un visuel qui ne peut pas être reconstruit juste à partir de
// pokemonId+tags+shiny (contrairement à la base/Dynamax/Gigamax, dérivés
// dynamiquement par PokemonCard) a besoin que customSpriteUrl soit figé :
// costumes événementiels, formes régionales, et variantes de genre pairées
// (même sans costume, ex. Pikachu femelle a une queue différente).
export function variantNeedsPinnedSprite(variant: SpriteVariant): boolean {
  return variant.tags.includes("costume") || REGIONAL_FORM_PREFIX.test(variant.label) || !!variant.gender;
}
