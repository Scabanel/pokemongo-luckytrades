import donnees from "@/data/generations.json";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   DECOUPER UNE LISTE PAR REGION

   Steven, le 2026-09-04 : « comment faire pour visualiser au mieux l'ensemble ? Car tout
   scroller c'est un enfer. Aussi il faudrait afficher des separateurs selon les regions /
   generations ca rendra aussi les choses plus lisibles. »

   Les deux demandes se repondent : une liste de 253 Pokemon est illisible parce qu'elle n'a
   aucun point de repere. Decoupee en regions, elle en gagne neuf, et ces neuf reperes
   servent aussi de destinations - on saute a Sinnoh au lieu de faire defiler jusqu'a
   Sinnoh.

   Les bornes viennent de data/generations.json, genere depuis PokeAPI. Elles ne sont PAS
   ecrites de memoire : une borne fausse d'une unite range un Pokemon dans la mauvaise
   region, personne ne le remarque, et le separateur qui devait clarifier se met a mentir.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

export type Borne = { generation: number; region: string; du: number; au: number; especes: number };
export const BORNES = donnees.bornes as Borne[];

/** La region d'un numero de Pokedex, ou `null` s'il sort des bornes connues. */
export function regionDe(pokemonId: number): Borne | null {
  return BORNES.find((b) => pokemonId >= b.du && pokemonId <= b.au) ?? null;
}

/** Le strict minimum pour ranger une entree : son numero, son identite, et son rang.
 *  Generique parce que « Mon espace » et la page publique d'un dresseur portent deux types
 *  d'entree legerement differents (l'un exige shiny/completed, l'autre les rend optionnels),
 *  et qu'une fonction de rangement n'a aucune raison de connaitre le reste. */
export type Rangeable = { id: string; pokemonId: number; priority?: number | null };

export type Section<T extends Rangeable = Rangeable> = { borne: Borne; entries: T[] };

/** La section de tete, pour les Pokemon que le dresseur a classes 1, 2 ou 3. */
const PRIORITES: Borne = { generation: 0, region: "Priorités", du: 0, au: 0, especes: 0 };

/** Les Pokemon d'une generation pas encore couverte par data/generations.json. */
const HORS_BORNES: Borne = { generation: 999, region: "Nouvelle génération", du: 0, au: 0, especes: 0 };

/**
 * Regroupe une liste en sections : les priorites d'abord, puis une section PAR REGION, dans
 * l'ordre des generations.
 *
 * ═══ POURQUOI ON REGROUPE AU LIEU DE DECOUPER ═══
 *
 * Premiere version : elle parcourait la liste et coupait a chaque changement de region, en
 * partant du principe que les entrees etant triees par numero, les regions seraient
 * contigues. J'avais meme ecrit ici qu'une region apparaissant deux fois serait « le
 * comportement juste », au nom du respect de l'ordre choisi par le dresseur.
 *
 * C'etait faux, et la mesure l'a montre tout de suite : la liste « Je recherche » de Steven
 * a produit DOUZE sections dont « Hoenn » deux fois, « Sinnoh » deux fois et « Alola » deux
 * fois. La cause est que `sortEntries` trie d'abord par PRIORITE, donc les trois Pokemon
 * classes 1, 2 et 3 precedent tout le reste et fragmentent leurs regions.
 *
 * Une barre de navigation avec deux boutons « Hoenn » n'aide personne : c'est exactement le
 * contraire du repere que Steven demandait. Les priorites gardent donc leur rang, mais dans
 * une section a elles, et chaque region n'apparait qu'une fois.
 *
 * Les regions vides ne produisent pas de section : un separateur « Kalos 0 » sur une liste
 * sans Pokemon de Kalos est du bruit, pas un repere.
 */
export function decouperParRegion<T extends Rangeable>(entries: T[]): Section<T>[] {
  const prioritaires = entries.filter((e) => e.priority === 1 || e.priority === 2 || e.priority === 3);
  const prioritaireIds = new Set(prioritaires.map((e) => e.id));
  const reste = entries.filter((e) => !prioritaireIds.has(e.id));

  const parGeneration = new Map<number, Section<T>>();
  for (const entry of reste) {
    const borne = regionDe(entry.pokemonId) ?? HORS_BORNES;
    const section = parGeneration.get(borne.generation);
    if (section) section.entries.push(entry);
    else parGeneration.set(borne.generation, { borne, entries: [entry] });
  }

  const sections: Section<T>[] = [...parGeneration.values()].sort((a, b) => a.borne.generation - b.borne.generation);
  if (prioritaires.length > 0) sections.unshift({ borne: PRIORITES, entries: prioritaires });
  return sections;
}

/** Un identifiant d'ancre stable, pour que la barre de saut puisse viser une section. */
export function ancreDe(borne: Borne): string {
  return `region-${borne.generation}`;
}
