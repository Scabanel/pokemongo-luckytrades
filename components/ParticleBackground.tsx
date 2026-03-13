"use client";

import { useEffect, useRef } from "react";

// 4-pointed star path helper
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const inner = r * 0.35;
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

// Lucky trade gold palette
const COLORS = [
  { r: 255, g: 215, b: 0 },   // gold
  { r: 255, g: 193, b: 7 },   // amber
  { r: 255, g: 236, b: 100 }, // pale gold
  { r: 255, g: 167, b: 38 },  // deep amber
  { r: 255, g: 248, b: 180 }, // near-white gold
];

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
  isStar: boolean;
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

    const count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 13000));
    particlesRef.current = Array.from({ length: count }, () => {
      const isStar = Math.random() < 0.45;
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: isStar ? Math.random() * 4 + 2 : Math.random() * 2.5 + 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.55 + 0.1,
        alphaDir: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.009 + 0.003),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        isStar,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0.04 || p.alpha >= 0.7) p.alphaDir *= -1;
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        const { r, g, b } = p.color;

        // Outer glow
        const glowR = p.isStar ? p.radius * 5 : p.radius * 4;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        gradient.addColorStop(0, `rgba(${r},${g},${b},${p.alpha * 0.7})`);
        gradient.addColorStop(0.4, `rgba(${r},${g},${b},${p.alpha * 0.25})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(p.alpha * 2.2, 0.95)})`;

        if (p.isStar) {
          ctx.translate(-p.x, -p.y);
          drawStar(ctx, p.x, p.y, p.radius);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
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
      style={{ opacity: 0.65 }}
    />
  );
}
