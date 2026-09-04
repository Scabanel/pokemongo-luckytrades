// Quels événements Pokémon GO concernent vraiment un joueur strasbourgeois ?
//
// Steven, le 2026-09-04 : « il faut que les évènements n'affichent que les événements
// majeurs qui concernent strasbourg en vrai. Y'en a trop. »
//
// Il y en avait 60 affichés. La moitié étaient injouables depuis Strasbourg : une chasse
// aux tampons au Japon, un musée des fossiles à Chicago, un PokéPark à Tokyo, un City
// Safari à Brisbane. Les faire défiler coûte au lecteur exactement le même effort que les
// vrais, pour zéro information utile.
//
// ═══ LA REGLE, ET POURQUOI ELLE TIENT SUR LES DONNEES REELLES ═══
//
// Le flux est régulier, ce qui permet une règle déterministe plutôt qu'un tri à la main
// qui serait à refaire à chaque passage du cron :
//
//   - Pas de parenthèse dans le titre  ->  événement MONDIAL. « Community Day », « Passe GO
//     Septembre », « Saison Twilight Trails » se jouent depuis n'importe où, Strasbourg
//     comprise. On garde.
//
//   - Une parenthèse  ->  c'est toujours une géographie : (Japon), (Chicago, États-Unis),
//     (France, Allemagne, Australie, États-Unis, en Pologne et au Royaume-Uni). On ne garde
//     que si la France y figure AU NIVEAU DU PAYS.
//
// ═══ LE PIEGE : « Pokémon GO City Safari Marseille (France) » ═══
//
// Celui-là nomme la France dans sa parenthèse et passerait la règle ci-dessus. Mais un City
// Safari est un événement billetté dans UNE ville : depuis Strasbourg, Marseille n'est pas
// plus accessible que Lisbonne. C'est le seul cas du jeu de données où la géographie du
// titre et celle de la parenthèse ne disent pas la même chose, et c'est celui qui justifie
// la seconde condition.
//
// D'où : un événement lié à une ville unique est exclu, sauf si cette ville est Strasbourg.

/** Une entrée du flux `data/upcoming-events.json`. */
export type EvenementBrut = {
  id: string;
  title: string;
  category: string | null;
  start: number;
  end: number;
  url: string | null;
  image: string | null;
};

/**
 * Les pays qui apparaissent dans le flux, relevés le 2026-09-04.
 *
 * Cette liste ne sert PAS à décider qui est gardé - seule la France l'est. Elle sert à
 * distinguer un pays d'une ville dans une parenthèse : dans « (Kakuda, Japon) », « Japon »
 * est ici, « Kakuda » non, donc l'événement est lié à une ville.
 *
 * Un pays inconnu est donc lu comme une ville. C'est le sens sûr : il fait EXCLURE, jamais
 * afficher à tort. Le seul cas où cette approximation change une décision est une
 * parenthèse qui contient à la fois la France et un pays inconnu, et `check:evenements`
 * échoue précisément sur ce cas-là plutôt que de laisser la liste vieillir en silence.
 */
const PAYS = new Set([
  "france", "allemagne", "angleterre", "irlande", "australie", "bresil",
  "etats-unis", "japon", "coree du sud", "taiwan", "indonesie", "hong-kong",
  "hong kong", "malaisie", "mexique", "philippines", "pologne", "portugal",
  "royaume-uni", "singapour", "thailande",
]);

/**
 * Les familles d'événements qui se tiennent dans une seule ville, sur place et souvent sur
 * billet. Relevées sur le flux : City Safari, PokéPark, Safari Zone, plus les musées et
 * observatoires qui sont des lieux physiques uniques.
 */
const FAMILLES_UNE_SEULE_VILLE = [
  "city safari",
  "pokepark",
  "safari zone",
  "musee des fossiles",
  "observatoire pokemon",
];

/**
 * Le motif des entrées que la source n'a pas catégorisées.
 *
 * Nommé une fois et exporté parce que la page et `check:evenements` le comparent tous les
 * deux : recopié en littéral dans trois fichiers, il suffirait d'une reformulation ici pour
 * que la comparaison devienne fausse ailleurs sans que rien n'échoue.
 */
export const MOTIF_NON_CLASSE = "non classe par la source";

/** Retire les accents et la casse : « Taïwan » et « taiwan » doivent se comparer. */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    // Les diacritiques, designes par leur propriete Unicode : coller les marques
    // combinantes en litteral dans une classe de caracteres rend la regex illisible.
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** La géographie entre parenthèses, découpée en morceaux. Vide si l'événement est mondial. */
function geographie(titre: string): string[] {
  const trouve = titre.match(/\(([^)]*)\)/);
  if (!trouve) return [];
  return normaliser(trouve[1])
    // « France, Allemagne et au Royaume-Uni » : les virgules, « et », « en », « au », « aux »
    // sont de la ponctuation de liste, pas des noms de lieux.
    .split(/,| et /)
    // On coupe les espaces AVANT de retirer l'article, pas après : le découpage laisse une
    // espace devant chaque morceau, donc « , en Pologne » donne « en pologne » et l'ancre
    // ^ ne voyait pas le « en ». Le LEGO Store, seul événement France de tout le flux, se
    // faisait alors écarter pour « une seule ville : en pologne ». Attrapé par
    // check:evenements, regle 4.
    .map((m) => m.trim().replace(/^(en|au|aux|a)\s+/, "").trim())
    .filter((m) => m.length > 0);
}

/**
 * Pourquoi cet événement n'est pas montré, ou `null` s'il l'est.
 *
 * Renvoyer le motif plutôt qu'un booléen sert au script de vérification, qui doit pouvoir
 * dire lequel des deux critères a écarté quoi.
 */
export function motifExclusion(e: EvenementBrut): string | null {
  const titre = normaliser(e.title);

  // ═══ « MAJEURS » : la source dit elle-meme ce qui n'est pas un evenement ═══
  //
  // Steven demandait aussi les evenements MAJEURS. Le flux porte un signal net pour ca :
  // `category` est nulle sur exactement quatre entrees, et ces quatre entrees sont
  // « Pleine Lune » - une phase lunaire, pas un evenement du jeu. La source n'a pas su la
  // classer parce qu'il n'y a rien a classer.
  //
  // Verifie le 2026-09-04 : l'ensemble des titres a categorie nulle vaut exactement
  // { "Pleine Lune" }. C'est une correspondance constatee, pas supposee, et
  // check:evenements la reverifie a chaque passage plutot que de la tenir pour acquise.
  if (e.category === null) return MOTIF_NON_CLASSE;

  if (titre.includes("strasbourg")) return null;

  const lieux = geographie(e.title);
  if (lieux.length === 0) return null;                     // mondial

  if (!lieux.includes("france")) {
    return `réservé à : ${lieux.join(", ")}`;
  }

  // La France est citée. Reste à écarter les événements d'une seule ville.
  const villes = lieux.filter((l) => !PAYS.has(l));
  if (villes.length > 0) {
    return `une seule ville : ${villes.join(", ")}`;
  }
  for (const famille of FAMILLES_UNE_SEULE_VILLE) {
    if (titre.includes(famille)) {
      return `événement d'une seule ville (${famille})`;
    }
  }
  return null;
}

/** Vrai si l'événement est jouable depuis Strasbourg. */
export function concerneStrasbourg(e: EvenementBrut): boolean {
  return motifExclusion(e) === null;
}

/**
 * Le nom à afficher sur la carte.
 *
 * Trois Community Day à venir ont pour titre « ? » : la source les annonce avant que
 * Niantic ne révèle le Pokémon vedette. Une carte intitulée « ? » est illisible alors que
 * l'information utile - c'est un Community Day, il est shiny, voici la date - est bien là,
 * dans la catégorie. On l'affiche donc à la place, et on dit pourquoi il manque un nom
 * plutôt que de laisser le lecteur le deviner.
 *
 * Le ✨ est conservé : il signale la disponibilité du shiny, seule exception à la règle
 * « pas de symbole décoratif » du projet.
 */
export function nomAffiche(e: EvenementBrut): { nom: string; note: string | null } {
  const titre = e.title.trim();
  const sansPointInterrogation = titre.replace(/\?/g, "").trim();
  // Il ne reste que le ✨, ou rien : le titre ne portait aucun nom.
  if (sansPointInterrogation === "" || sansPointInterrogation === "✨") {
    return {
      nom: e.category ? `${e.category}${titre.includes("✨") ? " ✨" : ""}` : "Événement",
      note: "Pokémon vedette pas encore annoncé",
    };
  }
  return { nom: titre, note: null };
}

/**
 * Une parenthèse qui contient la France ET un mot inconnu de `PAYS` est le seul cas où
 * l'approximation « inconnu = ville » peut faire disparaître un événement à tort. La sonde
 * s'en sert pour échouer sur ce cas précis, et rester muette sur les autres mots inconnus,
 * qui sont écartés de toute façon.
 */
export function motsAmbigus(evenements: EvenementBrut[]): string[] {
  const ambigus = new Set<string>();
  for (const e of evenements) {
    const lieux = geographie(e.title);
    if (!lieux.includes("france")) continue;
    for (const l of lieux) {
      if (!PAYS.has(l)) ambigus.add(l);
    }
  }
  return [...ambigus];
}
