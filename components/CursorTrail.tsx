"use client";

import { useEffect, useRef } from "react";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  hue: number;
}

/** Gold dust that falls away from the cursor as it moves. Desktop only. */
export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    let particles: Particle[] = [];
    const onMove = (e: MouseEvent) => {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: e.clientX + rand(-3, 3),
          y: e.clientY + rand(-3, 3),
          vx: rand(-0.35, 0.35),
          vy: rand(-0.15, 0.55),
          life: 0,
          max: rand(28, 58),
          r: rand(0.5, 1.7),
          hue: rand(42, 52),
        });
      }
      // Cap so fast mouse movement can't flood the frame
      if (particles.length > 240) particles.splice(0, particles.length - 240);
    };

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      particles = particles.filter((p) => p.life < p.max);
      for (const p of particles) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.012; // gentle gravity — dust settles
        const a = 1 - p.life / p.max;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 62%, ${a * 0.9})`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, ${a})`;
        ctx.shadowBlur = 6;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[60] pointer-events-none"
      aria-hidden="true"
    />
  );
}
