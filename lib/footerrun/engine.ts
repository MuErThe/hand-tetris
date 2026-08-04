// Pure endless-runner engine for the footer easter egg — the Eyeball It
// reticle hopping over pieces of the arcade. No React, no DOM: the canvas
// component calls tick() with elapsed time and draws from the state.
// Local-only by design; nothing here ever touches the leaderboard.

export type ObstacleKind = "tee" | "ell" | "chip" | "aye" | "vee";

export interface Obstacle {
  /** Left edge in world px (the runner's x is fixed). */
  x: number;
  w: number;
  /** TOTAL collision height from the baseline, rider included. */
  h: number;
  /** The piece sitting on the baseline. */
  kind: ObstacleKind;
  /** Optional rider stacked on top of it (its own height within `h`). */
  top?: { kind: ObstacleKind; h: number };
}

export interface RunState {
  phase: "idle" | "running" | "dead";
  /** Runner's bottom edge above the baseline (0 = grounded). */
  y: number;
  vy: number;
  /** World speed, px/s. Ramps up over a run. */
  speed: number;
  score: number;
  obstacles: Obstacle[];
  untilSpawn: number; // ms
  seed: number;
  /** Last kind dealt — never repeated back to back. */
  lastKind: ObstacleKind | null;
}

// World scale ~2.2× the original small footer — big Notion-sized pieces.
// GRAVITY and JUMP_V scale together, which keeps airtime identical while
// jump height grows with the world, so the game feels the same.
export const RUNNER = { x: 120, size: 36 };
const GRAVITY = 5280; // px/s²
const JUMP_V = 1584; // px/s
const BASE_SPEED = 500;
const MAX_SPEED = 1140;
const RAMP = 15; // px/s gained per second

const SIZES: Record<ObstacleKind, { w: number; h: number }> = {
  tee: { w: 66, h: 44 },
  ell: { w: 44, h: 66 },
  chip: { w: 40, h: 52 },
  aye: { w: 44, h: 56 },
  vee: { w: 44, h: 56 },
};
const KINDS: ObstacleKind[] = ["tee", "ell", "chip", "aye", "vee"];

export function createRun(): RunState {
  return {
    phase: "idle",
    y: 0,
    vy: 0,
    speed: BASE_SPEED,
    score: 0,
    obstacles: [],
    untilSpawn: 900,
    seed: 1,
    lastKind: null,
  };
}

export function startRun(seed: number): RunState {
  return { ...createRun(), phase: "running", seed: seed | 0 || 1 };
}

// mulberry32 step on the embedded seed — deterministic per run.
function rand(s: RunState): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Jump if grounded; no-op mid-air or outside a run. */
export function jump(s: RunState): void {
  if (s.phase === "running" && s.y === 0) s.vy = JUMP_V;
}

/** Next obstacle kind — uniform, but never the same twice running. */
function pickKind(s: RunState): ObstacleKind {
  let kind: ObstacleKind;
  do {
    kind = KINDS[Math.floor(rand(s) * KINDS.length)];
  } while (kind === s.lastKind);
  s.lastKind = kind;
  return kind;
}

/** Advance the world. `width` is the visible width so spawns enter off-screen. */
export function tick(s: RunState, dtMs: number, width: number): void {
  if (s.phase !== "running") return;
  const dt = Math.min(dtMs, 50) / 1000; // clamp long frames (tab switches)

  s.speed = Math.min(MAX_SPEED, s.speed + RAMP * dt);
  s.score += s.speed * dt * 0.045;

  if (s.y > 0 || s.vy > 0) {
    s.y += s.vy * dt;
    s.vy -= GRAVITY * dt;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
    }
  }

  for (const o of s.obstacles) o.x -= s.speed * dt;
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -80);

  s.untilSpawn -= dtMs;
  if (s.untilSpawn <= 0) {
    // Deal a cluster of 1–3 pieces: kinds never repeat back to back, every
    // piece gets its own scale (so heights vary), and bigger clusters are
    // kept short and tight so a single jump can still clear them.
    const roll = rand(s);
    const count = roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
    const minScale = count === 1 ? 0.75 : 0.65;
    const maxScale = count === 1 ? 1.35 : count === 2 ? 1.05 : 0.8;
    let x = width + 40;
    for (let i = 0; i < count; i++) {
      const kind = pickKind(s);
      const base = SIZES[kind];
      const k = minScale + rand(s) * (maxScale - minScale);
      const w = Math.round(base.w * k);
      let h = Math.round(base.h * k);
      // Singles and pairs sometimes carry a rider — a second piece stacked
      // on top. Total height stays within a clean jump's clearance.
      let top: Obstacle["top"];
      if (count < 3 && rand(s) < (count === 1 ? 0.45 : 0.2)) {
        const topKind = pickKind(s); // never matches its own base
        const topH = Math.min(
          Math.round(SIZES[topKind].h * (0.5 + rand(s) * 0.35)),
          100 - h,
        );
        if (topH >= 18) {
          top = { kind: topKind, h: topH };
          h += topH;
        }
        // The no-repeat rule applies to the baseline sequence — restore it
        // so a rider doesn't let the next base piece echo this one.
        s.lastKind = kind;
      }
      s.obstacles.push({ x, w, h, kind, top });
      x += w + 18 + rand(s) * 18;
    }
    // The floor of the gap is the full jump's airtime plus a beat — and the
    // cluster's own width rides on top — so a clean player is never dealt
    // an impossible hand.
    const airtimeMs = ((2 * JUMP_V) / GRAVITY) * 1000;
    const clusterMs = ((x - width) / s.speed) * 1000;
    s.untilSpawn = airtimeMs + clusterMs + 260 + rand(s) * 900;
  }

  // AABB with a small forgiveness inset — this is a footer, not a boss fight.
  const rx = RUNNER.x + 3;
  const rw = RUNNER.size - 6;
  for (const o of s.obstacles) {
    const xOverlap = rx < o.x + o.w - 2 && rx + rw > o.x + 2;
    if (xOverlap && s.y < o.h - 3) {
      s.phase = "dead";
      break;
    }
  }
}
