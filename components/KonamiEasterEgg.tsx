"use client";

import { useEffect, useRef, useState } from "react";

// Konami code classique : haut haut bas bas gauche droite gauche droite b a.
// Comparaison en minuscules pour ne pas dépendre de l'état de Shift (b/a
// suffisent, pas besoin de Maj).
const KONAMI_SEQUENCE = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

const FADE_MS = 350;

export default function KonamiEasterEgg() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const bufferRef = useRef<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ne pas voler les flèches/lettres pendant qu'on tape dans un champ.
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const buffer = [...bufferRef.current, key].slice(-KONAMI_SEQUENCE.length);
      bufferRef.current = buffer;

      if (buffer.length === KONAMI_SEQUENCE.length && buffer.every((k, i) => k === KONAMI_SEQUENCE[i])) {
        bufferRef.current = [];
        openCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openCard = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setMounted(true);
    // Monte d'abord avec opacity 0, puis passe à 1 au frame suivant pour
    // que la transition CSS ait un état de départ à animer depuis.
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const closeCard = () => {
    setVisible(false);
    closeTimeoutRef.current = setTimeout(() => setMounted(false), FADE_MS);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 22;
    const rotateX = (0.5 - y) * 22;
    const distance = Math.hypot(x - 0.5, y - 0.5);

    card.style.setProperty("--rx", `${rotateX}deg`);
    card.style.setProperty("--ry", `${rotateY}deg`);
    card.style.setProperty("--px", `${x * 100}%`);
    card.style.setProperty("--py", `${y * 100}%`);
    card.style.setProperty("--glare-opacity", `${Math.max(0, 0.65 - distance * 0.5)}`);
    card.style.setProperty("--tilt-transition", "none");
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-transition", "transform 0.6s ease");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--glare-opacity", "0");
  };

  if (!mounted) return null;

  return (
    <div
      onClick={closeCard}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(8,5,0,0.82)",
        backdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        cursor: "pointer",
      }}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          {
            "--rx": "0deg",
            "--ry": "0deg",
            "--px": "50%",
            "--py": "50%",
            "--glare-opacity": "0",
            "--tilt-transition": "transform 0.6s ease",
            position: "relative",
            height: "min(76vh, 560px)",
            aspectRatio: "5 / 7",
            borderRadius: 20,
            cursor: "default",
            transform: `scale(${visible ? 1 : 0.9}) perspective(900px) rotateX(var(--rx)) rotateY(var(--ry))`,
            transition: `${visible ? "" : "transform 0.3s ease, "}var(--tilt-transition)`,
          } as React.CSSProperties
        }
      >
        {/* Cadre de carte : dégradé or/violet aux couleurs de l'app */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 20,
            padding: 10,
            background: "linear-gradient(155deg, #ffd700 0%, #b464ff 55%, #0b0700 100%)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,215,0,0.4)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 14,
              background: "#0b0700",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Nom */}
            <div
              style={{
                padding: "10px 14px 6px",
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.1rem, 3.2vw, 1.5rem)",
                  color: "#ffd700",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  textShadow: "0 0 12px rgba(255,215,0,0.5)",
                }}
              >
                Saphire
              </span>
              <span
                style={{
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  color: "#b464ff",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Légendaire
              </span>
            </div>

            {/* Photo */}
            <div
              style={{
                margin: "0 12px",
                borderRadius: 10,
                overflow: "hidden",
                border: "2px solid rgba(255,215,0,0.5)",
                flex: 1,
                position: "relative",
                background: "#000",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Saphire.jpg"
                alt="Saphire"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            {/* Bas de carte : infos de capture */}
            <div
              style={{
                padding: "10px 14px 14px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "Exo 2, sans-serif",
                  fontSize: "0.72rem",
                  color: "rgba(232,237,245,0.7)",
                }}
              >
                Capturée par
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "#ffd700",
                }}
              >
                Sayen974 &amp; Estelle97417
              </p>
            </div>

            {/* Reflet holographique, suit la souris */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                mixBlendMode: "color-dodge",
                opacity: "var(--glare-opacity)",
                background:
                  "repeating-linear-gradient(115deg, #ff6b6b 0%, #ffd700 12%, #4ade80 24%, #4ea8ff 36%, #b464ff 48%, #ff6b6b 60%)",
                backgroundSize: "300% 300%",
                backgroundPosition: "var(--px) var(--py)",
              }}
            />
            {/* Éclat blanc, suit aussi la souris */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                mixBlendMode: "overlay",
                opacity: "var(--glare-opacity)",
                background:
                  "radial-gradient(circle at var(--px) var(--py), rgba(255,255,255,0.85) 0%, transparent 60%)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
