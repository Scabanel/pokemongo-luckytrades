"use client";

import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const FEATURES_COLOR = "#b464ff";
const UPCOMING_COLOR = "#ffd93d";

const FEATURES = [
  {
    title: "Trois listes par dresseur",
    text: "Je recherche, Je peux donner, Échanges miroir : chacun voit en un coup d'oeil ce que tout le monde recherche ou propose.",
  },
  {
    title: "Trouve vite ce qu'il te faut",
    text: "Filtre par Shiny, Fond d'événement, Gigamax, Dynamax ou Costume, ou tape direct le nom du Pokémon.",
  },
  {
    title: "Tri intelligent",
    text: "Toutes les listes sont triées par numéro de Pokédex, et \"Je recherche\" met en plus tes priorités en premier.",
  },
  {
    title: "Sprites animés et vrais visuels",
    text: "Sprites animés par défaut, vrais sprites Gigamax, costumes spéciaux, fonds d'événement... tout est fidèle à ce que tu as en jeu.",
  },
  {
    title: "Association automatique des échanges",
    text: "Lie une entrée \"Je recherche\" à une entrée \"Je peux donner\" pour un même échange : les deux se mettent à jour automatiquement, y compris quand c'est marqué échangé.",
  },
  {
    title: "Plusieurs exemplaires",
    text: "Indique la quantité disponible d'un Pokémon à donner, et décompte-la au fur et à mesure des échanges.",
  },
  {
    title: "Pokémon pas encore disponibles",
    text: "Consulte la liste des Pokémon (et formes shiny, Gigamax, Méga) qui ne sont pas encore sortis dans Pokémon GO.",
  },
  {
    title: "Événements de la communauté",
    text: "Community Day, raids spéciaux, saisons : retrouve les événements en cours et à venir sans quitter l'appli.",
  },
  {
    title: "Code Ami sur ta page",
    text: "Une fois renseigné, ton Code Ami s'affiche sur ta page dresseur, copiable en un clic pour que tout le monde puisse t'ajouter.",
  },
  {
    title: "Partage ta page en un clic",
    text: "Copie le lien de ta page dresseur pour le balancer direct sur Discord.",
  },
];

const UPCOMING = [
  "Demande de réservation de Pokémon directement dans l'application, avec notifications !",
  "Intégration des événements communautaires strasbourgeois à venir ?",
  "Jeux concours",
  "··· ·− ·−−· ···· ·· ·−·",
];

export default function FonctionnalitesPage() {
  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/fonctionnalites" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <header className="text-center mb-8">
          <h1
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: FEATURES_COLOR,
              textTransform: "uppercase",
              textShadow: `0 0 20px ${FEATURES_COLOR}59`,
            }}
          >
            Fonctionnalités et prochaines mises à jour
          </h1>
          <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 6 }}>
            Ce que l'appli sait déjà faire pour toi, et ce qui arrive bientôt.
          </p>
        </header>

        <section className="mb-12">
          <h2
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 700,
              color: FEATURES_COLOR,
              fontSize: "1.1rem",
              marginBottom: 14,
            }}
          >
            Ce que tu peux faire
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {FEATURES.map(({ title, text }) => (
              <div key={title} className="glass-card p-5" style={{ textAlign: "left" }}>
                <h3
                  style={{
                    fontFamily: "Exo 2, sans-serif",
                    fontWeight: 700,
                    color: "#e8edf5",
                    fontSize: "0.95rem",
                    marginBottom: 6,
                  }}
                >
                  {title}
                </h3>
                <p style={{ color: "rgba(232,237,245,0.5)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 700,
              color: UPCOMING_COLOR,
              fontSize: "1.1rem",
              marginBottom: 14,
            }}
          >
            Prochaines mises à jour
          </h2>
          <div className="glass-card p-5" style={{ textAlign: "left" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {UPCOMING.map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    color: "rgba(232,237,245,0.75)",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: UPCOMING_COLOR, fontWeight: 900 }}>·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p style={{ textAlign: "center", color: "rgba(232,237,245,0.45)", fontSize: "0.85rem" }}>
          Si tu as des propositions de fonctionnalités ou des bugs à remonter, contacte-moi
          directement sur Discord ! <span style={{ color: "#0affe0", fontWeight: 700 }}>@Vorthil</span>
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
