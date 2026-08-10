import { useEffect, useRef } from "react";

/**
 * Soft drifting particles + connecting lines in the brand hues, fixed behind the app content.
 * Skips animation entirely under prefers-reduced-motion (draws one static frame instead).
 */
export function AmbientBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = ["91,79,239", "31,179,161", "255,107,85"];
    let width = 0;
    let height = 0;
    let raf = 0;

    function resize() {
      width = canvas!.width = canvas!.offsetWidth;
      height = canvas!.height = canvas!.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(46, Math.floor((width * height) / 34000));
    const particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      c: colors[i % colors.length],
    }));

    function frame() {
      ctx!.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            ctx!.strokeStyle = `rgba(${p.c},${0.09 * (1 - d / 150)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx!.fillStyle = `rgba(${p.c},0.5)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      if (!reduceMotion) raf = requestAnimationFrame(frame);
    }
    frame();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60"}
    />
  );
}
