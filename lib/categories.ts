import type { EntryCategory } from "./types";

// Couleur/icône/glow des 3 catégories d'échange : c'était dupliqué à l'identique
// dans app/page.tsx (TABS) et components/PokemonCard.tsx (CATEGORY_COLOR/GLOW).
// Changer une couleur de catégorie ne demande plus qu'une seule modification ici.
//
// Note : le libellé "miroir" existe par ailleurs en 3 variantes légèrement
// différentes selon l'écran ("Échanges miroir" / "Échange miroir" / "Miroir").
// Elles ne sont pas unifiées ici pour ne pas changer du texte visible sans
// que ce soit demandé, voir le label ci-dessous qui reprend la variante la
// plus répandue ; les écrans qui affichent un texte différent gardent leur
// propre libellé local.
export const CATEGORIES: Record<
  EntryCategory,
  { label: string; color: string; glow: string }
> = {
  mirror: {
    label: "Échanges miroir",
    color: "var(--ligne-miroir)",
    glow: "radial-gradient(circle, var(--ligne-miroir) 0%, transparent 70%)",
  },
  want: {
    label: "Je recherche",
    color: "var(--ligne-cherche)",
    glow: "radial-gradient(circle, var(--ligne-cherche) 0%, transparent 70%)",
  },
  give: {
    label: "Je peux donner",
    // La couleur d'origine etait #ffd93d, un jaune. La migration vers les tokens l'a prise
    // pour de l'or decoratif et l'a passee en encre, ce qui a fait perdre a cette
    // categorie sa ligne : sur le panneau de partage, « Je peux donner » s'affichait en
    // noir a cote de « Je recherche » en teal. C'est bien une ligne du reseau, pas du
    // mobilier, et l'ambre brule est le jaune rendu lisible sur du papier.
    color: "var(--ligne-donne)",
    glow: "radial-gradient(circle, var(--ligne-donne) 0%, transparent 70%)",
  },
};

// Ordre d'affichage utilisé sur le catalogue public et dans la liste admin.
export const CATEGORY_DISPLAY_ORDER: EntryCategory[] = ["mirror", "want", "give"];

// `entry.category` vient de Prisma en tant que `string` brut (pas de enum en base) :
// ce helper évite de caster à la main à chaque site d'appel.
export function getCategory(key: string) {
  return CATEGORIES[key as EntryCategory];
}
