"use client";

// The footer's basement: an endless runner in the arcade's own language.
// The Eyeball It reticle hops Tetris pieces, colour chips and letterforms
// along an artboard baseline. Calm at rest — nothing moves until the player
// starts it, and reduced-motion users get a still scene instead of a game.
// Runs only while visible, pauses when the tab hides, and the best score
// lives in localStorage only: this is an easter egg, not a tenth game.
//
// The whole driver (draw/tick loop/input) lives inside one effect as plain
// closures — hooks and self-referencing callbacks don't mix.

import { useEffect, useRef, useState } from "react";
import {
  createRun,
  jump,
  startRun,
  tick,
  RUNNER,
  type Obstacle,
  type RunState,
} from "@/lib/footerrun/engine";

const BEST_KEY = "arcade/v1/footer-run";
const HEIGHT = 180;
const BASELINE = 36; // px above the canvas bottom

type Tokens = {
  ink: string;
  dim: string;
  accent: string;
  border: string;
  tee: string;
  ell: string;
  chip: string;
};

export function FooterRun() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "dead">("idle");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    let state: RunState = createRun();
    let best = 0;
    let rafId = 0;
    let last = 0;
    let visible = false;

    try {
      best = Number(window.localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      /* ignore */
    }

    // Canvas cannot resolve var(--…) — read the resolved tokens per draw,
    // same trick as Steady Hand and Cutout, so the scene follows the theme.
    const tokens = (): Tokens => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string, fallback: string) =>
        cs.getPropertyValue(n).trim() || fallback;
      return {
        ink: v("--ink", "#888"),
        dim: v("--ink-dim", "#777"),
        accent: v("--accent", "#b8860b"),
        border: v("--panel-border", "#999"),
        tee: v("--c-T", "#888"),
        ell: v("--c-I", "#888"),
        chip: v("--c-O", "#888"),
      };
    };

    const pad = (n: number) => String(Math.floor(n)).padStart(5, "0");

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const t = tokens();
      const ground = h - BASELINE;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // clouds — lock-on pings on slow parallax
      ctx.strokeStyle = t.border;
      ctx.lineWidth = 1;
      const drift = state.score * 2.4;
      for (const [baseX, y, r] of [
        [w * 0.25, 38, 11],
        [w * 0.6, 24, 8],
        [w * 0.85, 46, 13],
      ] as const) {
        const span = w + 60;
        const x = ((((baseX - drift * 0.4) % span) + span) % span) - 30;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // baseline + scrolling ticks
      ctx.strokeStyle = t.dim;
      ctx.beginPath();
      ctx.moveTo(0, ground + 0.5);
      ctx.lineTo(w, ground + 0.5);
      ctx.stroke();
      ctx.strokeStyle = t.border;
      const dashSpan = 46;
      const offset = ((drift % dashSpan) + dashSpan) % dashSpan;
      for (let x = -offset; x < w; x += dashSpan) {
        ctx.beginPath();
        ctx.moveTo(x, ground + 10.5);
        ctx.lineTo(x + 16, ground + 10.5);
        ctx.stroke();
      }

      for (const o of state.obstacles) drawObstacle(ctx, o, ground, t);

      // the reticle runner
      const ry = ground - RUNNER.size - state.y;
      ctx.strokeStyle = state.phase === "dead" ? t.dim : t.accent;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(RUNNER.x + 0.5, ry + 0.5, RUNNER.size, RUNNER.size);
      const cx = RUNNER.x + RUNNER.size / 2;
      const cy = ry + RUNNER.size / 2;
      ctx.beginPath();
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ] as const) {
        ctx.moveTo(cx + dx * (RUNNER.size / 2 + 2), cy + dy * (RUNNER.size / 2 + 2));
        ctx.lineTo(cx + dx * (RUNNER.size / 2 + 6), cy + dy * (RUNNER.size / 2 + 6));
      }
      ctx.stroke();

      // score, in the borrowed grammar
      ctx.fillStyle = t.dim;
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        `score ${pad(state.score)}   best ${pad(Math.max(best, state.score))}`,
        w - 14,
        18,
      );
    };

    const loop = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      tick(state, now - last, canvas.width / dpr);
      last = now;
      draw();
      if (state.phase === "running" && visible && !document.hidden) {
        rafId = requestAnimationFrame(loop);
      } else {
        if (state.phase === "dead") {
          if (state.score > best) {
            best = state.score;
            try {
              window.localStorage.setItem(BEST_KEY, String(Math.floor(best)));
            } catch {
              /* ignore */
            }
          }
          setPhase("dead");
        }
        rafId = 0;
      }
    };

    const resume = () => {
      if (state.phase === "running" && rafId === 0 && visible && !document.hidden) {
        last = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    };

    const act = () => {
      if (state.phase === "running") {
        jump(state);
        return;
      }
      state = startRun(Date.now());
      setPhase("running");
      cancelAnimationFrame(rafId);
      rafId = 0;
      resume();
    };
    actRef.current = act;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);

    const size = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(wrap.clientWidth * dpr);
      canvas.height = Math.round(HEIGHT * dpr);
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting;
        resume();
      },
      { threshold: 0.5 },
    );
    io.observe(wrap);

    const onKey = (e: KeyboardEvent) => {
      if (!visible || mq.matches) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        act();
      }
    };
    window.addEventListener("keydown", onKey);

    const onVis = () => resume();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      actRef.current = null;
      mq.removeEventListener("change", onMq);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height: HEIGHT }}
      role="application"
      aria-label="Hidden mini-game: an endless runner. Press space or tap to jump."
      tabIndex={reduced ? -1 : 0}
      onPointerDown={reduced ? undefined : () => actRef.current?.()}
      onKeyDown={
        reduced
          ? undefined
          : (e) => {
              if (e.key === "Enter") actRef.current?.();
            }
      }
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {!reduced && phase !== "running" && (
        <div
          className="absolute inset-x-0 flex justify-center pointer-events-none font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ top: 52, color: "var(--ink-dim)" }}
        >
          {phase === "dead" ? "caught · space to run again" : "press space to run _"}
        </div>
      )}
    </div>
  );
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  o: Obstacle,
  ground: number,
  t: Tokens,
): void {
  const top = ground - o.h;
  switch (o.kind) {
    case "tee": {
      // Tetris T: three cells across, one below centre
      const c = o.w / 3;
      ctx.fillStyle = t.tee;
      ctx.fillRect(o.x, top, o.w, c);
      ctx.fillRect(o.x + c, top + c, c, c);
      break;
    }
    case "ell": {
      // Tetris L: two cells up, one foot right
      const c = o.w / 2;
      ctx.fillStyle = t.ell;
      ctx.fillRect(o.x, top, c, o.h);
      ctx.fillRect(o.x + c, ground - c, c, c);
      break;
    }
    case "chip":
      ctx.fillStyle = t.chip;
      ctx.fillRect(o.x, top, o.w, o.h);
      ctx.strokeStyle = t.dim;
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 0.5, top + 0.5, o.w - 1, o.h - 1);
      break;
    case "aye":
    case "vee":
      ctx.fillStyle = t.ink;
      ctx.font = `600 ${o.h}px serif`;
      ctx.textAlign = "left";
      ctx.fillText(o.kind === "aye" ? "A" : "V", o.x, ground);
      break;
  }
}
