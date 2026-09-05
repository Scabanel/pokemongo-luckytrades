/* ═══════════════════════════════════════════════════════════════════════════════════════
   LES COULEURS DE LA DA, EN VALEURS LITTERALES

   Les images OpenGraph (les apercus qui s'affichent quand on colle un lien du site sur
   Discord) sont rendues par `ImageResponse` de next/og, qui s'appuie sur satori.

   ═══ SATORI NE CONNAIT PAS LES VARIABLES CSS ═══

   C'est la cause d'un bug reel : la migration des couleurs vers les tokens a converti ces
   deux fichiers comme les autres, en `var(--papier)`, `var(--encre)`. Satori ne resout pas
   ces variables, donc plus AUCUNE couleur ne s'appliquait : l'apercu Discord est devenu un
   rectangle noir avec une pokeball minuscule au milieu. Signale par Steven, capture a
   l'appui, apres qu'il a colle le lien sur le Discord de la communaute.

   Un rendu serveur d'image n'a pas de feuille de style, pas de racine de document, pas de
   cascade. Il faut donc des valeurs litterales.

   ═══ UN MIROIR, ET IL EST VERIFIE ═══

   Le danger d'un miroir est qu'il derive de sa source sans que personne ne le remarque. Ces
   valeurs sont donc reprises telles quelles de app/tokens.css, et `check:da` echoue si
   l'une d'elles n'y figure plus. Changer une couleur de la DA sans changer celle-ci fera
   virer la sonde au rouge.

   C'est la SEULE copie autorisee, et c'est pour ca qu'elle est centralisee ici plutot que
   recopiee dans chaque image : une exception qui se duplique cesse d'etre une exception.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

export const OG = {
  papier: "#F6F4EE",
  surface: "#FFFFFF",
  surfaceCreuse: "#E9E9E4",
  encre: "#14161A",
  encreDouce: "#55595F",
  encreTresDouce: "#73767D",
  traitLeger: "#CFCFC9",
  ligneMiroir: "#6D28A8",
  ligneCherche: "#0B6E8F",
  ligneDonne: "#A65600",
  or: "#F2A900",
  orPale: "#FDF0D2",
  cherchePale: "#DFF0F5",
} as const;

/** Le bandeau de trois couleurs sous le header, repris a l'identique sur les apercus :
 *  c'est le signe le plus reconnaissable de la DA, et il fonctionne meme en vignette. */
export const BANDE_LIGNES = [OG.ligneMiroir, OG.ligneCherche, OG.ligneDonne];
