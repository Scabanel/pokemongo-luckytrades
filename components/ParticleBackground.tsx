"use client";

import { useEffect, useRef } from "react";

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const inner = r * 0.28;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const radius = i % 2 === 0 ? r : inner;
    const px = x + Math.cos(angle - Math.PI / 2) * radius;
    const py = y + Math.sin(angle - Math.PI / 2) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

const COLORS = [
  { r: 255, g: 215, b: 0 },   // or
  { r: 255, g: 193, b: 7 },   // ambre
  { r: 255, g: 236, b: 100 }, // or pâle
  { r: 255, g: 167, b: 38 },  // ambre foncé
  { r: 255, g: 248, b: 190 }, // blanc doré
];

type ParticleType = "bokeh" | "orb" | "star";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  alphaDir: number;
  rotation: number;
  rotationSpeed: number;
  type: ParticleType;
}

function spawnParticle(w: number, h: number, fromBottom = false): Particle {
  const roll = Math.random();
  const type: ParticleType = roll < 0.22 ? "bokeh" : roll < 0.52 ? "star" : "orb";
  const radius =
    type === "bokeh" ? Math.random() * 55 + 20 :
    type === "orb"   ? Math.random() * 6 + 2.5 :
                       Math.random() * 4.5 + 2;

  const y = fromBottom
    ? h + radius
    : type === "bokeh"
      ? h * (0.4 + Math.random() * 0.6)
      : Math.random() * h;

  return {
    x: Math.random() * w,
    y,
    vx: (Math.random() - 0.5) * 0.28,
    vy: -(Math.random() * (type === "bokeh" ? 0.22 : 0.5) + 0.08),
    radius,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: type === "bokeh"
      ? Math.random() * 0.13 + 0.04
      : Math.random() * 0.5 + 0.15,
    alphaDir: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.005 + 0.002),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.025,
    type,
  };
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(85, Math.floor((window.innerWidth * window.innerHeight) / 10000));
    particlesRef.current = Array.from({ length: count }, () =>
      spawnParticle(window.innerWidth, window.innerHeight, false)
    );

    const drawBottomAura = (cx: number, strength: number) => {
      const h = canvas.height;
      const r = h * 0.62;
      const grad = ctx.createRadialGradient(cx, h, 0, cx, h, r);
      grad.addColorStop(0,   `rgba(255, 200, 0, ${0.22 * strength})`);
      grad.addColorStop(0.25, `rgba(255, 170, 0, ${0.12 * strength})`);
      grad.addColorStop(0.55, `rgba(255, 140, 0, ${0.05 * strength})`);
      grad.addColorStop(1,   `rgba(255, 100, 0, 0)`);
      ctx.beginPath();
      ctx.ellipse(cx, h, r * 0.95, r, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grandes auras dorées au bas de l'écran
      drawBottomAura(canvas.width * 0.5,  1.0);
      drawBottomAura(canvas.width * 0.22, 0.55);
      drawBottomAura(canvas.width * 0.78, 0.55);

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];

        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;
        p.rotation += p.rotationSpeed;

        const maxAlpha = p.type === "bokeh" ? 0.18 : 0.72;
        if (p.alpha <= 0.02 || p.alpha >= maxAlpha) p.alphaDir *= -1;

        // Sortie par les côtés → réapparition côté opposé
        if (p.x < -p.radius * 2) p.x = canvas.width + p.radius;
        if (p.x > canvas.width + p.radius * 2) p.x = -p.radius;

        // Sortie par le haut → respawn au bas
        if (p.y < -p.radius * 2) {
          particlesRef.current[i] = spawnParticle(canvas.width, canvas.height, true);
          continue;
        }

        const { r, g, b } = p.color;

        if (p.type === "bokeh") {
          // Grand bokeh doux
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0,   `rgba(${r},${g},${b},${p.alpha})`);
          grad.addColorStop(0.45, `rgba(${r},${g},${b},${p.alpha * 0.45})`);
          grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

        } else if (p.type === "orb") {
          // Orbe avec halo
          const glowR = p.radius * 5;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
          grad.addColorStop(0,  `rgba(${r},${g},${b},${p.alpha * 0.85})`);
          grad.addColorStop(0.3, `rgba(${r},${g},${b},${p.alpha * 0.35})`);
          grad.addColorStop(1,  `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          // Noyau dur
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(p.alpha * 2.2, 0.92)})`;
          ctx.fill();

        } else {
          // Étoile scintillante avec croix de lumière
          const glowR = p.radius * 7;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
          grad.addColorStop(0,  `rgba(${r},${g},${b},${p.alpha * 0.7})`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${p.alpha * 0.15})`);
          grad.addColorStop(1,  `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Croix de lumière (lens flare subtil)
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = p.alpha * 0.35;
          for (let arm = 0; arm < 2; arm++) {
            const lg = ctx.createLinearGradient(-p.radius * 5, 0, p.radius * 5, 0);
            lg.addColorStop(0, `rgba(${r},${g},${b},0)`);
            lg.addColorStop(0.5, `rgba(${r},${g},${b},0.9)`);
            lg.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = lg;
            ctx.fillRect(-p.radius * 5, -0.5, p.radius * 10, 1);
            ctx.rotate(Math.PI / 2);
          }
          ctx.globalAlpha = 1;
          ctx.restore();

          // Forme étoile
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(p.alpha * 2.8, 0.97)})`;
          ctx.translate(-p.x, -p.y);
          drawStar(ctx, p.x, p.y, p.radius);
          ctx.fill();
          ctx.restore();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
}
