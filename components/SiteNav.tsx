"use client";

// Header sobre et statique inspiré de la DA VertiForge (channelingChaos/tools/vertiforge) :
// barre fixe en haut, fond sombre quasi opaque, simple bordure de séparation, pas de glow ni de
// néon. Contraste avec le reste du site (particules, ombres colorées) qui reste réservé au
// contenu de chaque page, pas à la navigation elle-même.
//
// ═══ SUR MOBILE, CE N'EST PLUS UNE BARRE EN HAUT MAIS DES ONGLETS EN BAS ═══
//
// Mesure du 2026-09-04 (npm run check:mobile) : les cinq liens tenaient sur une ligne de
// 375px, mais à 8,32px de texte dans des cibles de 22px de haut. Soit la moitié du plancher
// tactile de 44px, sur TOUTES les pages puisque cette barre est partagée.
//
// Le CSS documentait ce choix : « tout doit tenir sur une seule ligne, on réduit fortement
// tailles/paddings/gaps plutôt que de laisser le flex-wrap passer sur 2-3 lignes ».
// L'intention était juste - une barre de navigation sur trois lignes mange l'écran. Le moyen
// ne l'était pas : rétrécir jusqu'à 8px atteint l'objectif de place en perdant l'objectif de
// la barre, qui est qu'on puisse la lire et l'atteindre.
//
// Cinq entrées est exactement ce qui tient dans une barre d'onglets en bas, le motif que
// tout le monde connaît des applications mobiles. Et le bas de l'écran est la zone que le
// pouce atteint sans changer de prise, contrairement au coin haut droit.
//
// Décision de Steven, 2026-09-04.

const LINKS = [
  // `short` sert UNIQUEMENT à la barre d'onglets, où chaque onglet dispose de 375/5 = 75px.
  // « Pas encore disponibles » y est illisible; le libellé complet reste sur le header de
  // bureau et dans le titre de la page, donc rien n'est perdu pour qui cherche le sens.
  { href: "/", label: "Accueil", short: "Accueil" },
  { href: "/dresseurs", label: "Dresseurs", short: "Dresseurs" },
  { href: "/pas-encore-sortis", label: "Pas encore disponibles", short: "À venir" },
  { href: "/evenements", label: "Événements", short: "Événements" },
  { href: "/mon-espace", label: "Mon espace", short: "Mon espace" },
];

/** Partagé par les deux versions de la marque, pour qu'elles ne divergent jamais. */
const STYLE_MARQUE: React.CSSProperties = {
  fontFamily: "Exo 2, sans-serif",
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--encre)",
  // Halo réduit de 12px à 6px et d'opacité 0.35 à 0.25 : sur du jaune posé sur du noir,
  // un halo large fait baver les contours et REDUIT le contraste perçu au lieu de
  // l'augmenter. Voir le lot 3 du plan de refonte.
  textShadow: "none",
};

export default function SiteNav({ active }: { active: string }) {
  return (
    <>
      <header
        className="site-nav sticky top-0 z-20 flex items-center gap-4"
        style={{
          borderBottom: "1px solid var(--trait-leger)",
          background: "color-mix(in srgb, var(--papier) 92%, transparent)",
        }}
      >
        {/* ═══ SUR MOBILE, LA MARQUE EST UN TITRE, PAS UN LIEN ═══

            Le titre complet sortait de l'écran et s'affichait « ÉCHANGES POKÉMON
            STRASBOURG GO EVEN... » : trois quarts d'une ligne pour une phrase coupée.
            Signalé par Steven sur son téléphone le 2026-09-04.

            Deux choses en découlent. Le libellé raccourci tient en entier à 375px, donc
            plus d'ellipse. Et il cesse d'être un LIEN : un lien doit faire 44px de haut
            pour rester atteignable au pouce, ce qui imposait à lui seul la hauteur du
            header, alors qu'il ne mène qu'à l'accueil - déjà présent en bas dans la barre
            d'onglets, en cible de 56px sous le pouce. Le rendre non cliquable ne retire
            donc aucun chemin, et rend une vingtaine de pixels d'écran sur chaque page.

            Les deux versions sont RENDUES, l'une masquée par CSS selon la largeur : le
            serveur ne connaît pas la taille de l'écran, et un rendu conditionnel en
            JavaScript ferait clignoter le header à l'hydratation. */}
        <a
          href="/"
          className="site-nav-brand flex items-center gap-2"
          style={{ textDecoration: "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="site-nav-brand-icon"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
            alt=""
            width={22}
            height={22}
            style={{ imageRendering: "pixelated" }}
          />
          <span className="site-nav-brand-text" style={STYLE_MARQUE}>
            Échanges Pokémon Strasbourg GO Events!
          </span>
        </a>

        <span className="site-nav-titre flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="site-nav-brand-icon"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
            alt=""
            width={18}
            height={18}
            style={{ imageRendering: "pixelated" }}
          />
          <span className="site-nav-brand-text" style={STYLE_MARQUE}>
            Échanges Pokémon Strasbourg
          </span>
        </span>
        <nav className="site-nav-links flex" style={{ marginLeft: "auto" }}>
          {LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="site-nav-link"
              style={{
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 600,
                letterSpacing: "0.02em",
                textDecoration: "none",
                border: "1px solid",
                transition: "border-color 0.15s, color 0.15s, background 0.15s",
                ...(active === href
                  ? {
                      background: "color-mix(in srgb, var(--encre) 12%, transparent)",
                      borderColor: "color-mix(in srgb, var(--encre) 40%, transparent)",
                      color: "var(--encre)",
                    }
                  : {
                      background: "transparent",
                      borderColor: "var(--trait-leger)",
                      color: "var(--encre-tres-douce)",
                    }),
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* La barre d'onglets. Rendue toujours, masquée par CSS au-dessus de 640px : un rendu
          conditionnel en JavaScript ferait clignoter la barre à l'hydratation, et le serveur
          ne connaît pas la largeur de l'écran. */}
      <nav className="mobile-tabs" aria-label="Navigation principale">
        {LINKS.map(({ href, short }) => (
          <a
            key={href}
            href={href}
            className={`mobile-tab${active === href ? " mobile-tab-active" : ""}`}
            aria-current={active === href ? "page" : undefined}
          >
            {short}
          </a>
        ))}
      </nav>
    </>
  );
}
