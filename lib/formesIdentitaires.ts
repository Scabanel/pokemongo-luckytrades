/* ═══════════════════════════════════════════════════════════════════════════════════════
   LES FORMES QUI FONT PARTIE DE L'IDENTITE, SOURCE UNIQUE

   Une forme regionale (Alola, Galar, Hisui, Paldea) n'est PAS un costume ni une simple
   variante de sprite : c'est un autre Pokemon aux yeux d'un dresseur. Un Sablaireau d'Alola
   ne satisfait pas quelqu'un qui cherche un Sablaireau, et l'inverse est vrai aussi.

   ═══ POURQUOI CE FICHIER NE S'APPELLE PLUS « formesRegionales » ═══

   RyN, le 2026-09-06, sur le Discord : « il y a pas moyen de selectionner directement les
   formes totemiques de Boreas, Fulguris, Demeteros, Amovenus ? A part en choisissant les
   sprites. » Puis, decisif : « je cherche le shiny de sa forme avatar et le shiny de sa
   forme totemique, je peux pas mettre les deux ».

   Une forme Totemique est exactement la meme chose qu'une forme d'Alola : le jeu la traite
   comme un autre Pokemon, et un dresseur qui cherche l'une n'est pas satisfait par l'autre.
   Le mecanisme etait deja ecrit ici, il ne connaissait simplement que les regions. Un
   fichier nomme « formesRegionales » qui definit Therian serait un nom qui ment, et c'est
   la forme de derive contre laquelle tout ce fichier a ete ecrit.

   Etendre plutot que dupliquer : une seconde table des formes, ailleurs, aurait redonne
   exactement les quatre definitions divergentes decrites plus bas.

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

/* ═══════════════════════════════════════════════════════════════════════════════════════
   LES FORMES DES GENIES : AVATAR ET TOTEMIQUE

   Boreas, Fulguris, Demeteros et Amovenus ont deux formes que le jeu traite comme deux
   Pokemon distincts. Le catalogue les nomme « Incarnate » et « Therian », en anglais brut du
   datamine, et les range parmi les costumes.

   DEUX DEFAUTS, ET LE SECOND EST LE PLUS COUTEUX :

     le nom     personne ne cherche « Therian » dans une interface francaise, et aucune
                recherche du depot ne portait de toute facon sur les labels de variante.
     l'identite « Incarnate » est la forme PAR DEFAUT du jeu. Un « Demeteros » tout court
                designe la forme Avatar. La faire compter comme une forme distincte de la
                base separerait un ajout en masse d'un ajout solo qui designent la meme
                chose - l'erreur symetrique de celle qui fusionnait Sablaireau et Sablaireau
                d'Alola, et tout aussi silencieuse.

   D'ou la table : Avatar porte la clef FORME_DE_BASE, qui veut dire « cette entree designe
   explicitement la forme de base ». Ce n'est PAS la meme chose que `null`, qui veut dire
   « aucune forme reconnue dans ce texte » et laisse l'appelant se rabattre sur l'URL. La
   difference decide du resultat : avec `null`, un « Demeteros Avatar » au sprite fige aurait
   pris son URL pour identite et cesse de correspondre a un « Demeteros » tout court.

   Seule la forme Totemique porte donc une identite propre.

   MESURE SUR LE CATALOGUE avant d'ecrire cette table : « Incarnate » et « Therian »
   apparaissent sur exactement 4 especes chacun, les quatre genies et aucune autre. Ce n'est
   donc pas un motif general deguise en cas particulier, c'est une famille fermee. Verifie
   par le harnais, qui echoue si une cinquieme espece apparait. */
/** « Cette entree designe explicitement la forme de base. » A distinguer de `null`, qui dit
 *  « aucune forme reconnue » et laisse l'appelant se rabattre sur l'URL du sprite. */
export const FORME_DE_BASE = "base";

const FORMES_NOMMEES: { label: RegExp; clef: string; francais: string; nom: RegExp }[] = [
  // Les deux motifs sont disjoints, donc l'ordre ne fait ici que la lisibilite.
  { label: /^therian\b/i, clef: "totemique", francais: "Totémique", nom: /\b(?:forme\s+)?tot[ée]mique\b|\btherian\b/i },
  { label: /^incarnate\b/i, clef: FORME_DE_BASE, francais: "Avatar", nom: /\b(?:forme\s+)?avatar\b|\bincarnate\b/i },
];

/** Vrai si ce label designe une forme d'identite non regionale (Avatar, Totemique).
 *
 *  DERIVE DE LA TABLE, jamais reecrit a la main. La premiere version etait une troisieme
 *  regex ecrite a cote, `/^(therian|incarnate)\b/i`, qui ne connaissait donc que l'ecriture
 *  anglaise. Elle est appelee par `variantNeedsPinnedSprite`, qui recoit le libelle
 *  FRANCAIS : « Totémique » ne matchait pas, la forme totemique perdait son sprite fige et
 *  s'affichait avec l'apparence de la forme avatar. Mesure : `pin=false` la ou il fallait
 *  `true`. Trois definitions du meme concept, exactement ce que ce fichier existe pour
 *  empecher - et je l'ai reintroduit en une ligne. */
export const LABEL_FORME_NOMMEE = new RegExp(
  FORMES_NOMMEES.map((f) => `(?:${f.label.source})|(?:${f.nom.source})`).join("|"),
  "i",
);

/** Le libelle francais d'un label de catalogue, ou le label tel quel.
 *
 *  Applique la ou les labels sont MONTRES, jamais la ou ils sont compares a une donnee du
 *  catalogue : traduire une clef de comparaison casserait l'appariement des paires de genre
 *  et la detection du shiny, qui lisent tous deux le label brut. */
export function libelleForme(label: string): string {
  for (const f of FORMES_NOMMEES) {
    if (f.label.test(label)) return label.replace(f.label, f.francais);
  }
  return label;
}

/** La region lue dans un nom d'entree, en minuscules sans accent, ou `null`.
 *  « Sablaireau d'Alola » et « Sabelette Alola » donnent tous les deux `"alola"`. */
export function regionDuNom(nom: string | null | undefined): string | null {
  if (!nom) return null;
  const sansAccent = nom.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const trouve = sansAccent.match(MOTIF_REGION);
  return trouve ? trouve[1].toLowerCase() : null;
}

/** L'identite de forme lue dans le NOM d'une entree, ou `null`.
 *
 *  Superset de `regionDuNom` : couvre les regions ET les formes nommees. C'est cette
 *  fonction que le matching doit appeler, `regionDuNom` ne restant exportee que pour le
 *  harnais qui verifie les formes regionales sur les listes reelles.
 *
 *  « Demeteros Totémique » et « Landorus Therian » donnent tous les deux `"totemique"`.
 *  « Demeteros Avatar » donne `null`, parce que la forme Avatar EST la base - voir la table
 *  FORMES_NOMMEES pour la raison, qui n'est pas un detail. */
export function formeDuNom(nom: string | null | undefined): string | null {
  if (!nom) return null;
  for (const f of FORMES_NOMMEES) {
    if (f.nom.test(nom)) return f.clef;
  }
  return regionDuNom(nom);
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
  if (!label) return null;

  /* Les formes nommees d'abord. Le label peut arriver sous sa forme brute du catalogue
     (« Therian ✨ ») ou deja traduit pour l'affichage (« Totémique ✨ ») : les deux doivent
     donner la meme clef, sans quoi une entree creee par un picker ne se reconnaitrait pas
     dans une entree creee par l'autre. */
  for (const f of FORMES_NOMMEES) {
    if (f.label.test(label) || f.nom.test(label)) return f.clef;
  }

  if (!LABEL_FORME_REGIONALE.test(label)) return null;
  return label
    .replace(/✨/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    // « Galarian » et « Alola » doivent donner la meme racine que le nom : on normalise
    // l'adjectif anglais vers le nom de region nu.
    .replace(MOTIF_REGION, (_m, region: string) => region.toLowerCase());
}
