"use client";

import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import events from "@/data/upcoming-events.json";
import {
  concerneStrasbourg, motifExclusion, nomAffiche, MOTIF_NON_CLASSE, type EvenementBrut,
} from "@/lib/evenements-pertinents";

const EVENT_COLOR = "var(--encre)";

type EventEntry = EvenementBrut;

function formatRange(start: number, end: number) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  // Précise l'année seulement si l'événement chevauche plusieurs années
  // (sinon "22 mai au 12 avril" a l'air de finir avant de commencer).
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { day: "2-digit", month: "long" }
    : { day: "2-digit", month: "long", year: "numeric" };
  const startStr = startDate.toLocaleDateString("fr-FR", opts);
  const endStr = endDate.toLocaleDateString("fr-FR", opts);
  return startStr === endStr ? startStr : `${startStr} au ${endStr}`;
}

export default function EvenementsPage() {
  const now = Date.now();
  const typed = events as EventEntry[];

  // Le flux mélange les régions du monde : chasses aux tampons au Japon, musée des fossiles
  // à Chicago, City Safari à Brisbane. La règle est dans lib/evenements-pertinents.ts et
  // vérifiée par `npm run check:evenements`.
  const actifs = typed.filter((e) => e.end >= now);
  const pertinents = actifs.filter(concerneStrasbourg);

  // On ne compte que les exclusions GEOGRAPHIQUES : ce sont les seules dont le lecteur perd
  // quelque chose. Les entrees sans categorie sont des phases lunaires, annoncer « 4 de plus
  // sont caches » ne lui apprendrait rien qu'il puisse vouloir.
  const ecartesAilleurs = actifs.filter((e) => {
    const motif = motifExclusion(e);
    return motif !== null && motif !== MOTIF_NON_CLASSE;
  }).length;

  const ongoing = pertinents.filter((e) => e.start <= now);
  const upcoming = pertinents.filter((e) => e.start > now);

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "var(--papier)" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/evenements" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <header className="text-center mb-8">
          <h1
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: EVENT_COLOR,
              textTransform: "uppercase",
              textShadow: "none",
            }}
          >
            Événements Pokémon GO
          </h1>
          <p style={{ color: "var(--encre-tres-douce)", fontSize: "0.85rem", marginTop: 6 }}>
            Community Day, raids spéciaux, saisons et ligues, en cours ou à venir.
          </p>
          {/* Dire ce qui est retiré, et sur quel critère. Un filtre muet donne l'impression
              que la page est incomplète; celui-ci se justifie en une ligne. */}
          {ecartesAilleurs > 0 && (
            <p style={{ color: "var(--encre-tres-douce)", fontSize: "0.75rem", marginTop: 4 }}>
              {ecartesAilleurs} événements réservés à d&apos;autres régions ne sont pas affichés.
            </p>
          )}
        </header>

        <EventSection title="En cours" events={ongoing} emptyText="Aucun événement en cours." />
        <div className="mt-10">
          <EventSection title="À venir" events={upcoming} emptyText="Rien de prévu pour le moment." />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function EventSection({ title, events, emptyText }: { title: string; events: EventEntry[]; emptyText: string }) {
  return (
    <section>
      <h2
        style={{
          fontFamily: "Exo 2, sans-serif",
          fontWeight: 700,
          color: EVENT_COLOR,
          fontSize: "1.1rem",
          marginBottom: 12,
        }}
      >
        {title} ({events.length})
      </h2>
      {events.length === 0 ? (
        <p style={{ color: "var(--encre-tres-douce)", padding: 16 }}>{emptyText}</p>
      ) : (
        <div className="grid event-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}>
          {events.map((e) => {
            // Un seul appel : quand le titre manque, nomAffiche renvoie la CATEGORIE comme
            // nom, et l'afficher aussi en pastille l'ecrirait deux fois sur la meme carte.
            const { nom, note } = nomAffiche(e);
            return (
            <a
              key={e.id}
              href={e.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card overflow-hidden"
              style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}
            >
              {e.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.image} alt="" className="event-image"
                style={{ width: "100%", height: 120, objectFit: "cover" }} />
              )}
              <div style={{ padding: 14 }}>
                {e.category && !note && (
                  <span
                    style={{
                      display: "inline-block",
                      background: `${EVENT_COLOR}18`,
                      border: `1px solid ${EVENT_COLOR}40`,
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: EVENT_COLOR,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    {e.category}
                  </span>
                )}
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--encre)", marginBottom: 4 }}>
                  {nom}
                </div>
                {note && (
                  <div style={{ color: "var(--encre-tres-douce)", fontSize: "0.75rem", marginBottom: 4, fontStyle: "italic" }}>
                    {note}
                  </div>
                )}
                <div style={{ color: "var(--encre-tres-douce)", fontSize: "0.75rem" }}>
                  {formatRange(e.start, e.end)}
                </div>
              </div>
            </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
