"use client";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/dresseurs", label: "Dresseurs" },
  { href: "/pas-encore-sortis", label: "Pas encore sortis" },
  { href: "/evenements", label: "Événements" },
  { href: "/admin", label: "Mon espace" },
];

export default function SiteNav({ active }: { active: string }) {
  return (
    <nav className="relative z-10 flex gap-2 flex-wrap justify-center pt-6 pb-2">
      {LINKS.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 700,
            fontSize: "0.78rem",
            letterSpacing: "0.04em",
            textDecoration: "none",
            border: "1px solid",
            transition: "all 0.15s",
            ...(active === href
              ? {
                  background: "rgba(10,255,224,0.15)",
                  borderColor: "rgba(10,255,224,0.4)",
                  color: "#0affe0",
                }
              : {
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "rgba(232,237,245,0.5)",
                }),
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
