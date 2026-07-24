"use client";

import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import events from "@/data/upcoming-events.json";

const EVENT_COLOR = "#ffd93d";

type EventEntry = {
  id: string;
  title: string;
  category: string | null;
  start: number;
  end: number;
  url: string | null;
  image: string | null;
};

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
  const ongoing = typed.filter((e) => e.start <= now && e.end >= now);
  const upcoming = typed.filter((e) => e.start > now);

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
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
              textShadow: "0 0 20px rgba(255,217,61,0.35)",
            }}
          >
            Événements Pokémon GO
          </h1>
          <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 6 }}>
            Community Day, raids spéciaux, saisons et événements locaux, en cours ou à venir.
          </p>
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
        <p style={{ color: "rgba(232,237,245,0.3)", padding: 16 }}>{emptyText}</p>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {events.map((e) => (
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
                <img src={e.image} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />
              )}
              <div style={{ padding: 14 }}>
                {e.category && (
                  <span
                    style={{
                      display: "inline-block",
                      background: `${EVENT_COLOR}18`,
                      border: `1px solid ${EVENT_COLOR}40`,
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: EVENT_COLOR,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    {e.category}
                  </span>
                )}
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#e8edf5", marginBottom: 4 }}>
                  {e.title}
                </div>
                <div style={{ color: "rgba(232,237,245,0.4)", fontSize: "0.75rem" }}>
                  {formatRange(e.start, e.end)}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
