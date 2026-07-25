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
// data/costumes.json mélange les vrais costumes événementiels ET les formes
// régionales (Alola/Galar/Hisui/Paldea) sous la même structure — ce ne sont
// pas des costumes, juste une autre apparence naturelle de l'espèce. Détecté
// par préfixe de label (ex: "Alola", "Galarian Standard", "Hisuian (2)",
// "Paldea Combat" — vérifié exhaustivement sur tout le catalogue).
const REGIONAL_FORM_PREFIX = /^(alola|galar|hisui|paldea)/i;

export interface SpriteVariant {
  key: string;
  label: string;
  url: string;
  shiny: boolean;
  tags: string[];
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
  const costumes = (COSTUME_CATALOG[String(pokemonId)] ?? []).filter((c) => !c.label.startsWith("Mega"));
  const variants: SpriteVariant[] = costumes.map((c) => ({
    key: c.url,
    label: c.label,
    url: c.url,
    shiny: c.label.includes("✨"),
    tags: c.label.startsWith("Officiel Pokémon GO")
      ? []
      : REGIONAL_FORM_PREFIX.test(c.label)
        ? ["forme-regionale"]
        : ["costume"],
  }));

  // costumes.json ne couvre que les espèces ayant déjà eu un costume/une
  // forme événementielle (~925/1025) : sans repli, tout Pokémon jamais
  // costumé n'aurait AUCUNE tuile du tout dans le picker, pas même son sprite
  // de base. go-icons.json couvre lui l'icône officielle de chaque espèce.
  if (!costumes.some((c) => c.label.startsWith("Officiel Pokémon GO"))) {
    const files = GO_ICONS[String(pokemonId)];
    if (files?.[0]) {
      variants.unshift({ key: `base-${files[0]}`, label: "Officiel Pokémon GO", url: `${ICON_BASE}/${encodeURIComponent(files[0])}`, shiny: false, tags: [] });
    }
    if (files?.[1]) {
      variants.unshift({ key: `base-${files[1]}`, label: "Officiel Pokémon GO ✨", url: `${ICON_BASE}/${encodeURIComponent(files[1])}`, shiny: true, tags: [] });
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
      });
    }
    if (shiny) {
      variants.push({
        key: `gmax-${shiny}`,
        label: "Gigamax ✨",
        url: `${ICON_BASE}/${encodeURIComponent(shiny)}`,
        shiny: true,
        tags: ["gigamax"],
      });
    }
  }

  if (DYNAMAX_SPECIES.has(pokemonId)) {
    const base = variants.find((v) => v.label === "Officiel Pokémon GO");
    const baseShiny = variants.find((v) => v.label === "Officiel Pokémon GO ✨");
    if (base) {
      variants.push({ key: `dynamax-${base.url}`, label: "Dynamax", url: base.url, shiny: false, tags: ["dynamax"] });
    }
    if (baseShiny) {
      variants.push({ key: `dynamax-${baseShiny.url}`, label: "Dynamax ✨", url: baseShiny.url, shiny: true, tags: ["dynamax"] });
    }
  }

  return variants;
}
