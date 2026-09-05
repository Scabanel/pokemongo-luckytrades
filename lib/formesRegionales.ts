/* ═══════════════════════════════════════════════════════════════════════════════════════
   LES FORMES REGIONALES, SOURCE UNIQUE

   Une forme regionale (Alola, Galar, Hisui, Paldea) n'est PAS un costume ni une simple
   variante de sprite : c'est un autre Pokemon aux yeux d'un dresseur. Un Sablaireau d'Alola
   ne satisfait pas quelqu'un qui cherche un Sablaireau, et l'inverse est vrai aussi.

   ═══ POURQUOI CE FICHIER EXISTE ═══

   Steven, le 2026-09-05 : « Sablaireau et Sablaireau d'Alola, l'app ne fait pas la
   distinction et considere que les deux sont la forme normale. » Puis, une fois le cas
   corrige : « Fais ca pour toutes les formes regionales du coup. Que ca soit une regle forte
   de l'appli. »

   Au moment de ce correctif, QUATRE endroits du code savaient chacun a leur facon ce qu'est
   une forme regionale : une regex de nom dans lib/tags.ts, une regex de label dans
   lib/spriteVariants.ts, et deux usages qui en dependaient. Quatre definitions qui se
   ressemblent sont quatre definitions qui finiront par diverger, et la divergence sera
   silencieuse. Une regle forte a besoin d'un seul endroit ou elle est ecrite.

   ═══ DEUX SIGNAUX, UN SEUL VOCABULAIRE ═══

   Une forme regionale se reconnait a deux endroits, et il faut les deux :

     le NOM de l'entree    « Sablaireau d'Alola », « Sabelette Alola », « Alolan Sandslash »
     le LABEL du sprite    « Alola », « Galarian Standard », « Paldea Combat »

   Les deux sont necessaires parce que les donnees reelles contiennent les deux cas : un
   ajout en masse produit un nom explicite sans sprite fige, un ajout solo produit un sprite
   du catalogue. Et surtout, une MEME forme existe sous plusieurs sprites - le
   `pm28.fALOLA.s.icon.png` de PokeMiners d'un cote, un GIF anime PokeAPI de l'autre. C'est
   pour ca que la comparaison ne peut pas se faire sur l'URL : elle separerait a tort deux
   representations de la meme chose, et un dresseur ne verrait plus qu'un autre a exactement
   ce qu'il cherche.

   Les deux signaux sont donc ramenes au MEME vocabulaire, pour qu'un nom et un label
   puissent se reconnaitre entre eux.

   ═══ LA REGION SEULE NE SUFFIT PAS ═══

   Piege verifie sur le catalogue : Tauros de Paldea a TROIS races (Combat, Blaze, Aqua) qui
   partagent le meme pokemonId et le meme nom, et Darmanitan de Galar a deux formes (Standard,
   Zen). Une cle reduite a « paldea » les fusionnerait toutes - exactement le bug d'origine,
   deplace d'un cran. La sous-forme du label est donc conservee quand elle existe.

   Consequence assumee : « Tauros de Paldea » sans sprite (region seule) ne correspond pas a
   un « Paldea Combat » fige. L'entree vague ne dit pas laquelle des trois races elle designe,
   donc on ne devine pas. C'etait deja le comportement avant ce fichier.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Les quatre regions a formes alternatives. Aucune autre n'existe en Pokemon GO. */
export const REGIONS = ["alola", "galar", "hisui", "paldea"] as const;

/* Une seule regex pour les deux signaux, et c'est deliberé : une regex qui TESTE et une
   regex qui EXTRAIT, ecrites separement, finissent par ne plus etre d'accord sur les memes
   noms. Ici le test et l'extraction sont le meme motif, donc ils ne peuvent pas diverger.

   Couvre les trois formulations reelles : la preposition francaise (« d'Alola », « de
   Galar »), le nom nu de la convention d'ajout en masse (« Sabelette Alola »), et l'adjectif
   anglais du catalogue (« Alolan », « Galarian », « Hisuian », « Paldean »).

   Verifie sur les 894 labels du catalogue (les 20 labels regionaux captures, zero faux
   positif) et sur les noms reels. La limite de mot compte : « Galarbre » n'est pas Galar. */
const MOTIF_REGION = /\b(?:d[e']\s*)?(alola|galar|hisui|paldea)(?:ian|an|n)?\b/i;

/** Vrai si ce nom designe une forme regionale. Remplace l'ancien `REGIONAL_FORM_NAME`. */
export const NOM_FORME_REGIONALE = MOTIF_REGION;

/** Vrai si ce label de sprite designe une forme regionale (les labels commencent par la
 *  region : « Alola », « Galarian Standard », « Hisuian (2) », « Paldea Combat »). */
export const LABEL_FORME_REGIONALE = /^(alola|galar|hisui|paldea)/i;

/** La region lue dans un nom d'entree, en minuscules sans accent, ou `null`.
 *  « Sablaireau d'Alola » et « Sabelette Alola » donnent tous les deux `"alola"`. */
export function regionDuNom(nom: string | null | undefined): string | null {
  if (!nom) return null;
  const sansAccent = nom.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const trouve = sansAccent.match(MOTIF_REGION);
  return trouve ? trouve[1].toLowerCase() : null;
}

/** L'identite de forme lue dans un label de sprite, ou `null`.
 *
 *  Ramenee au meme vocabulaire que `regionDuNom` pour que les deux signaux se reconnaissent :
 *  « Alola ✨ » donne `"alola"`, comme le nom « Sablaireau d'Alola ». La sous-forme est
 *  gardee quand elle existe (« Paldea Combat » donne `"paldea combat"`), sans quoi les trois
 *  races de Tauros fusionneraient.
 *
 *  Le sparkle est retire : le shiny est un axe separe de l'identite de forme, deja compare
 *  a part. Sans ce retrait, « Alola » et « Alola ✨ » seraient deux formes differentes. */
export function formeDuLabel(label: string | null | undefined): string | null {
  if (!label || !LABEL_FORME_REGIONALE.test(label)) return null;
  return label
    .replace(/✨/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    // « Galarian » et « Alola » doivent donner la meme racine que le nom : on normalise
    // l'adjectif anglais vers le nom de region nu.
    .replace(MOTIF_REGION, (_m, region: string) => region.toLowerCase());
}
