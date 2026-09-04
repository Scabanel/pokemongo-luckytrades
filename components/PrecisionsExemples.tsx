import PokemonSprite from "@/components/PokemonSprite";
import { POKEMON_SIZES } from "@/lib/entryMatching";
import genderDifferences from "@/data/gender-differences.json";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   UN POKEMON N'EST PAS QU'UNE ESPECE

   Steven : « Mets bien sur la landing des exemples de pokemon a fonds, a taille, a genre
   differents et dis bien que le matching de recherche fonctionne sur ca aussi ! »

   C'est la fonction la moins evidente du site et la plus utile a un dresseur qui cherche
   vraiment quelque chose de precis. Elle etait mentionnee sur /fonctionnalites, dans un
   journal de versions que personne ne lit avant de s'inscrire.

   ═══ CE QUE LA VERIFICATION A CHANGE ═══

   Le fond et la taille entraient bien dans `entriesMatch`. Le GENRE, non : il etait
   affiche sur la carte et ignore par le matching. Annoncer le contraire aurait ete une
   promesse fausse sur la page dont le travail est d'etablir la confiance, donc le genre a
   ete ajoute au matching avec la meme semantique que les deux autres (voir
   `wantedGenderMatches` dans lib/entryMatching.ts). La phrase de cette section est
   maintenant vraie, ce qui est la seule facon acceptable de l'ecrire.

   ═══ POURQUOI DES EXEMPLES ILLUSTRATIFS ET NON DES ENTREES REELLES ═══

   Cette section explique une FONCTION, elle n'annonce pas un stock. Les chiffres de la
   landing, eux, sont reels parce qu'ils pretendent decrire l'activite du site. Ici un
   Dracaufeu sur un fond de Go Fest montre a quoi ressemble un fond; aller chercher une
   entree reelle qui en porte un couterait une requete de plus pour la meme demonstration,
   et la section disparaitrait le jour ou personne n'en a.

   Le fond et les tailles viennent quand meme des donnees du site (data/backgrounds.json,
   POKEMON_SIZES) et non de valeurs inventees : ce sont les memes que dans le formulaire.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Un fond de Go Fest, pris dans data/backgrounds.json. Reconnaissable et daté, donc
 *  exactement le genre de souvenir pour lequel on precise un fond. */
const FOND = {
  label: "Go Fest 2024",
  url: "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/LocationCards/sb_GoFest2024_radiance.png",
};

/** Le meme traitement que sur une vraie carte (components/PokemonCard.tsx) : le fond est
 *  voile de papier, sinon le sprite se perd dedans. */
const VOILE = `linear-gradient(color-mix(in srgb, var(--papier) 55%, transparent), color-mix(in srgb, var(--papier) 80%, transparent))`;

function Tuile({
  titre,
  detail,
  children,
}: {
  titre: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* Les cadres sont EMPILES et non cote a cote. Mesure a 768px : la tuile du genre
          en portait deux, ce qui ne laissait que 59px de large au texte dans une colonne de
          233px, et le document debordait de 18px. Une colonne de cadres garde la meme
          largeur quel qu en soit le nombre. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "0 0 auto" }}>{children}</div>
      {/* minWidth: 0 : sans lui un element flex refuse de descendre sous la largeur de son
          contenu, et la tuile du genre - deux cadres plus du texte - faisait deborder le
          document de 18px a 768px. Mesure par check:mobile. */}
      <div style={{ minWidth: 0 }}>
        <h3 style={{
          fontFamily: "Exo 2, sans-serif", fontWeight: 800, fontSize: "0.9375rem",
          color: "var(--encre)", margin: "0 0 3px", textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}>
          {titre}
        </h3>
        <p style={{ color: "var(--encre-douce)", fontSize: "0.8125rem", lineHeight: 1.45, margin: 0, overflowWrap: "anywhere" }}>
          {detail}
        </p>
      </div>
    </div>
  );
}

/** Le cadre carre commun aux trois exemples, pour qu'ils s'alignent. */
function Cadre({ children, fond }: { children: React.ReactNode; fond?: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: 66,
        height: 66,
        borderRadius: 8,
        border: "var(--trait-fin) solid var(--trait-leger)",
        background: fond ? `${VOILE}, url(${fond}) center / cover` : "var(--surface-creuse)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      {children}
    </div>
  );
}

/** La pastille de genre, reprise de la carte : bleu pour male, magenta pour femelle. */
function Genre({ male }: { male: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute", top: 3, left: 3,
        width: 20, height: 20, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: male ? "var(--ligne-cherche)" : "var(--tag-max)",
        color: "var(--surface)", fontWeight: 800, fontSize: 13, lineHeight: 1,
      }}
    >
      {male ? "♂" : "♀"}
    </span>
  );
}

export default function PrecisionsExemples() {
  return (
    <section style={{ marginBottom: 44 }}>
      <h2 className="station" style={{
        fontFamily: "Exo 2, sans-serif", fontSize: "1.25rem", fontWeight: 800,
        color: "var(--encre)", margin: "0 0 6px", textTransform: "uppercase",
        letterSpacing: "0.02em",
      }}>
        Précise ce que tu cherches vraiment
      </h2>
      <p style={{ color: "var(--encre-douce)", fontSize: "0.9rem", margin: "0 0 16px", maxWidth: "56ch" }}>
        Un Pokémon, ce n&apos;est pas qu&apos;une espèce. Tu peux préciser le fond
        d&apos;événement, le record de taille et le genre, et{" "}
        <strong style={{ color: "var(--encre)" }}>
          les correspondances en tiennent compte
        </strong>{" "}
        : un « Je recherche » avec un fond précis ne remonte que les Pokémon qui ont
        exactement ce fond. Pareil pour la taille et le genre.
      </p>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>

        <Tuile
          titre="Le fond"
          detail={`Le souvenir d'un événement précis, ici ${FOND.label}. Sans fond précisé, n'importe lequel convient.`}
        >
          <Cadre fond={FOND.url}>
            <PokemonSprite pokemonId={6} alt="Dracaufeu" size={50} />
          </Cadre>
        </Tuile>

        <Tuile
          titre="La taille"
          detail={`Les records ${POKEMON_SIZES.join(", ")} sont recherchés pour eux-mêmes, et pas seulement pour l'espèce.`}
        >
          <Cadre>
            <PokemonSprite pokemonId={129} alt="Magicarpe" size={50} />
            <span
              aria-hidden="true"
              style={{
                position: "absolute", bottom: 3, right: 3,
                background: "var(--encre)", color: "var(--surface)",
                fontFamily: "Exo 2, sans-serif", fontWeight: 800, fontSize: 12,   // le plancher, jamais en dessous
                padding: "2px 7px", borderRadius: 999, letterSpacing: "0.04em",
              }}
            >
              XXL
            </span>
          </Cadre>
        </Tuile>

        <Tuile
          titre="Le genre"
          detail={`Pikachu n'a pas la même queue selon le genre. Sur les ${genderDifferences.ids.length} espèces concernées, les correspondances en tiennent compte.`}
        >
          <Cadre>
            <Genre male />
            <PokemonSprite pokemonId={25} alt="Pikachu mâle" size={44} />
          </Cadre>
          <Cadre>
            <Genre male={false} />
            <PokemonSprite pokemonId={25} alt="Pikachu femelle" size={44} />
          </Cadre>
        </Tuile>

      </div>
    </section>
  );
}
