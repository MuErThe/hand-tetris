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
const HEIGHT = 420;
const BASELINE = 64; // px above the canvas bottom

type Tokens = {
  ink: string;
  dim: string;
  accent: string;
  border: string;
  field: string;
  bg: string;
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
        field: v("--field-2", "transparent"),
        bg: v("--bg-0", "#111"),
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

      // a sky of drifting clouds, each on its own parallax speed…
      const drift = state.score * 5;
      for (const [bx, y, sc, sp] of [
        [w * 0.18, 84, 2.0, 0.35],
        [w * 0.48, 150, 1.4, 0.5],
        [w * 0.72, 64, 2.5, 0.28],
        [w * 0.92, 190, 1.7, 0.42],
      ] as const) {
        const span = w + 160;
        const x = ((((bx - drift * sp) % span) + span) % span) - 80;
        drawCloud(ctx, x, y, sc, t);
      }
      // …plus a couple of lock-on pings for the house identity
      ctx.strokeStyle = t.border;
      ctx.lineWidth = 1.5;
      for (const [bx, y, r, sp] of [
        [w * 0.32, 244, 16, 0.6],
        [w * 0.82, 272, 22, 0.45],
      ] as const) {
        const span = w + 120;
        const x = ((((bx - drift * sp) % span) + span) % span) - 60;
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
      ctx.lineWidth = 2;
      const dashSpan = 86;
      const offset = ((drift % dashSpan) + dashSpan) % dashSpan;
      for (let x = -offset; x < w; x += dashSpan) {
        ctx.beginPath();
        ctx.moveTo(x, ground + 20);
        ctx.lineTo(x + 32, ground + 20);
        ctx.stroke();
      }
      for (let x = -offset + dashSpan * 0.55; x < w; x += dashSpan) {
        ctx.beginPath();
        ctx.moveTo(x, ground + 42);
        ctx.lineTo(x + 22, ground + 42);
        ctx.stroke();
      }

      for (const o of state.obstacles) drawObstacle(ctx, o, ground, t);

      // the reticle runner
      const ry = ground - RUNNER.size - state.y;
      ctx.strokeStyle = state.phase === "dead" ? t.dim : t.accent;
      ctx.lineWidth = 2.4;
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
        ctx.moveTo(cx + dx * (RUNNER.size / 2 + 4), cy + dy * (RUNNER.size / 2 + 4));
        ctx.lineTo(cx + dx * (RUNNER.size / 2 + 12), cy + dy * (RUNNER.size / 2 + 12));
      }
      ctx.stroke();

      // score and best — stacked label-over-value, sharing the page's
      // 80px desktop gutter with the footer row above
      const colRight = w - (w >= 768 ? 80 : 24);
      ctx.fillStyle = t.dim;
      ctx.font = "700 16px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.fillText("SCORE", colRight - 138, 48);
      ctx.fillText(pad(state.score), colRight - 138, 76);
      ctx.textAlign = "right";
      ctx.fillText("BEST", colRight, 48);
      ctx.fillText(pad(Math.max(best, state.score)), colRight, 76);
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
          className="absolute inset-x-0 flex justify-center pointer-events-none font-mono font-bold text-[14px] uppercase tracking-[0.18em]"
          style={{ top: HEIGHT * 0.42, color: "var(--ink-dim)" }}
        >
          {phase === "dead" ? "caught · space to run again" : "press space to run _"}
        </div>
      )}
    </div>
  );
}

/** A three-bump cloud outline, filled with the panel surface. */
function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: Tokens,
): void {
  ctx.fillStyle = t.field;
  ctx.strokeStyle = t.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 8 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 10 * s, y - 7 * s, 9 * s, Math.PI * 1.02, Math.PI * 1.98);
  ctx.arc(x + 22 * s, y, 8 * s, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  o: Obstacle,
  ground: number,
  t: Tokens,
): void {
  const baseH = o.h - (o.top?.h ?? 0);
  drawPiece(ctx, o.kind, o.x, o.w, baseH, ground, t);
  if (o.top) drawPiece(ctx, o.top.kind, o.x, o.w, o.top.h, ground - baseH, t);
}

/** Paint one piece whose base sits on `bottom` and which rises `h` above it. */
function drawPiece(
  ctx: CanvasRenderingContext2D,
  kind: Obstacle["kind"],
  x: number,
  w: number,
  h: number,
  bottom: number,
  t: Tokens,
): void {
  const top = bottom - h;
  switch (kind) {
    case "tee": {
      // Tetris T, stretched to fill its whole box so stacks stay flush:
      // bar across the top half, stem down the centre to the base.
      const bar = h * 0.5;
      ctx.fillStyle = t.tee;
      ctx.fillRect(x, top, w, bar);
      ctx.fillRect(x + w / 3, top + bar, w / 3, h - bar);
      break;
    }
    case "ell": {
      // Tetris L: full-height upright, foot flush with the base.
      const c = w / 2;
      ctx.fillStyle = t.ell;
      ctx.fillRect(x, top, c, h);
      ctx.fillRect(x + c, bottom - c, c, c);
      break;
    }
    case "chip":
      ctx.fillStyle = t.chip;
      ctx.fillRect(x, top, w, h);
      break;
    case "aye":
    case "vee": {
      // letterform punched into a SOLID specimen block
      ctx.fillStyle = t.ink;
      ctx.fillRect(x, top, w, h);
      ctx.fillStyle = t.bg;
      ctx.font = `600 ${Math.round(h * 0.62)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(kind === "aye" ? "A" : "V", x + w / 2, top + h / 2 + 1);
      ctx.textBaseline = "alphabetic";
      break;
    }
  }
}
