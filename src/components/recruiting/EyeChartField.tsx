import { useEffect, useRef } from "react";

/**
 * EyeChartField — an abstract, living field of fine Snellen (eye-chart) letters.
 * Letters drift slowly, are gently drawn toward the cursor, and burst into
 * being when the user clicks anywhere on the backdrop. Purely decorative.
 */

const GLYPHS = ["E", "F", "P", "T", "O", "Z", "L", "D", "C", "U", "A", "N", "H", "K", "R"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  size: number;
  rot: number;
  vr: number;
  alpha: number;
  targetAlpha: number;
  life: number; // -1 = permanent ambient
}

export default function EyeChartField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>();
  const parts = useRef<Particle[]>([]);
  const pointer = useRef({ x: -9999, y: -9999, active: false });
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const isLight = () => document.documentElement.classList.contains("light");

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const spawnAmbient = (n: number) => {
      for (let i = 0; i < n; i++) {
        parts.current.push({
          x: rnd(0, w),
          y: rnd(0, h),
          vx: rnd(-0.15, 0.15),
          vy: rnd(-0.18, 0.18),
          char: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          size: rnd(8, 30),
          rot: rnd(-0.4, 0.4),
          vr: rnd(-0.003, 0.003),
          alpha: 0,
          targetAlpha: rnd(0.05, 0.28),
          life: -1,
        });
      }
    };

    const burst = (cx: number, cy: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = rnd(0.8, 3.4);
        parts.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          char: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          size: rnd(10, 26),
          rot: rnd(-0.6, 0.6),
          vr: rnd(-0.02, 0.02),
          alpha: 0,
          targetAlpha: rnd(0.35, 0.7),
          life: rnd(90, 200),
        });
      }
      // keep the population sane
      if (parts.current.length > 460) parts.current.splice(0, parts.current.length - 460);
    };

    const density = Math.round((w * h) / 14000);
    spawnAmbient(Math.max(40, Math.min(120, density)));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const light = isLight();
      const base = light ? "20,90,200" : "150,205,255";
      const px = pointer.current;

      for (let i = parts.current.length - 1; i >= 0; i--) {
        const p = parts.current[i];

        // cursor attraction
        if (px.active) {
          const dx = px.x - p.x;
          const dy = px.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 42000) {
            const d = Math.sqrt(d2) || 1;
            const pull = (1 - d / 205) * 0.4;
            p.vx += (dx / d) * pull;
            p.vy += (dy / d) * pull;
          }
        }

        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vx *= 0.97;
        p.vy *= 0.97;

        // ambient drift keeps a gentle floor of motion
        if (p.life === -1) {
          p.vx += rnd(-0.02, 0.02);
          p.vy += rnd(-0.02, 0.02);
        }

        // wrap ambient particles, expire bursts
        if (p.life === -1) {
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        } else {
          p.life -= 1;
          if (p.life < 30) p.targetAlpha = 0;
          if (p.life <= 0) {
            parts.current.splice(i, 1);
            continue;
          }
        }

        p.alpha += (p.targetAlpha - p.alpha) * 0.05;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.font = `600 ${p.size}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(${base}, ${p.alpha})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.char, 0, 0);
        ctx.restore();
      }

      raf.current = requestAnimationFrame(draw);
    };
    draw();

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };
    const onLeave = () => (pointer.current.active = false);
    const onClick = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      burst(e.clientX - r.left, e.clientY - r.top, 22);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onClick);
    window.addEventListener("pointerleave", onLeave);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onClick);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [dpr]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full pointer-events-none select-none"
    />
  );
}
