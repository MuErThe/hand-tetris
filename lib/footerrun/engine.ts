// Pure endless-runner engine for the footer easter egg — the Eyeball It
// reticle hopping over pieces of the arcade. No React, no DOM: the canvas
// component calls tick() with elapsed time and draws from the state.
// Local-only by design; nothing here ever touches the leaderboard.

export type ObstacleKind = "tee" | "ell" | "chip" | "aye" | "vee";

export interface Obstacle {
  /** Left edge in world px (the runner's x is fixed). */
  x: number;
  w: number;
  /** Rises from the baseline. */
  h: number;
  kind: ObstacleKind;
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
}

export const RUNNER = { x: 56, size: 16 };
const GRAVITY = 2400; // px/s²
const JUMP_V = 720; // px/s
const BASE_SPEED = 230;
const MAX_SPEED = 520;
const RAMP = 7; // px/s gained per second

const SIZES: Record<ObstacleKind, { w: number; h: number }> = {
  tee: { w: 30, h: 20 },
  ell: { w: 20, h: 30 },
  chip: { w: 18, h: 24 },
  aye: { w: 20, h: 26 },
  vee: { w: 20, h: 26 },
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

/** Advance the world. `width` is the visible width so spawns enter off-screen. */
export function tick(s: RunState, dtMs: number, width: number): void {
  if (s.phase !== "running") return;
  const dt = Math.min(dtMs, 50) / 1000; // clamp long frames (tab switches)

  s.speed = Math.min(MAX_SPEED, s.speed + RAMP * dt);
  s.score += s.speed * dt * 0.1;

  if (s.y > 0 || s.vy > 0) {
    s.y += s.vy * dt;
    s.vy -= GRAVITY * dt;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
    }
  }

  for (const o of s.obstacles) o.x -= s.speed * dt;
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);

  s.untilSpawn -= dtMs;
  if (s.untilSpawn <= 0) {
    const kind = KINDS[Math.floor(rand(s) * KINDS.length)];
    const { w, h } = SIZES[kind];
    s.obstacles.push({ x: width + 20, w, h, kind });
    // The floor of the gap is the full jump's airtime plus a beat, so a
    // clean player is never dealt an impossible pair.
    const airtimeMs = ((2 * JUMP_V) / GRAVITY) * 1000;
    s.untilSpawn = airtimeMs + 260 + rand(s) * 900;
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
