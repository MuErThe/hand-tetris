// Pure endless-runner engine for the footer easter egg: the Eyeball It
// eye hopping over pieces of the arcade. No React, no DOM: the canvas
// component calls tick() with elapsed time and draws from the state.
// Local-only by design; nothing here ever touches the leaderboard.

// Ground pieces sit on the baseline and are jumped. "flyer" hangs from the
// sky: an arrow pointing at the ground, passed by staying down. It is the
// one hurdle that punishes pressing.
export type ObstacleKind = "tee" | "ell" | "chip" | "aye" | "vee" | "arrow" | "flyer";

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
  /** Flyers only: bottom edge above the baseline; `h` rises from there. */
  yBottom?: number;
}

export interface RunState {
  phase: "idle" | "running" | "dead";
  /** Runner's bottom edge above the baseline (0 = grounded). */
  y: number;
  vy: number;
  /** World speed, px/s. Steps up through gears over a run. */
  speed: number;
  score: number;
  /** Time spent running, ms. Drives the gears, the sky and the pools. */
  elapsedMs: number;
  /** Current gear, 0..4. */
  stage: number;
  /** elapsedMs at the last gear change, for the draw-side cue. */
  gearChangedAt: number;
  obstacles: Obstacle[];
  untilSpawn: number; // ms
  seed: number;
  /** Last kind dealt; never repeated back to back. */
  lastKind: ObstacleKind | null;
}

// World scale ~2.2× the original small footer: big Notion-sized pieces.
// GRAVITY and JUMP_V scale together, which keeps airtime identical while
// jump height grows with the world, so the game feels the same.
export const RUNNER = { x: 120, size: 36 };
const GRAVITY = 5280; // px/s²
const JUMP_V = 1584; // px/s
/** Apex of a clean jump, px above the baseline. */
const JUMP_APEX = (JUMP_V * JUMP_V) / (2 * GRAVITY); // ≈ 238

// Gears: a stage every 20 s, speed easing to the stage's target over about
// 1.5 s. Plateaus give the player time to settle before the next step.
const STAGE_MS = 20_000;
const SPEEDS = [500, 640, 800, 960, 1140];
const SPEED_RATE = 110; // px/s per second, toward the gear's target
/** Random slack added to the spawn gap, ms: tightens with each gear. */
const SLACK = [900, 775, 650, 525, 400];

// The sky runs on its own clock: day, a 30 s dusk from 60 s, night from
// 90 s, a 30 s dawn from 150 s, then round again. 180 s per cycle.
const SKY_CYCLE_MS = 180_000;
const DUSK_AT = 60_000;
const NIGHT_AT = 90_000;
const DAWN_AT = 150_000;

/** Flyer bottom edge: a grounded runner (top at 36) passes clean beneath. */
const FLYER_BOTTOM = 92;
const SIZES: Record<ObstacleKind, { w: number; h: number }> = {
  tee: { w: 66, h: 44 },
  ell: { w: 44, h: 66 },
  chip: { w: 40, h: 52 },
  aye: { w: 44, h: 56 },
  vee: { w: 44, h: 56 },
  arrow: { w: 48, h: 44 },
  // Flyers reach past the apex so no jump clears them: the read is "stay
  // down", never "jump higher".
  flyer: { w: 26, h: Math.ceil(JUMP_APEX - FLYER_BOTTOM) + 8 },
};
const GROUND_KINDS: ObstacleKind[] = ["tee", "ell", "chip", "aye", "vee"];

/** Ground kinds dealt at a gear: pieces first, the arrow from gear 2. */
function poolFor(stage: number): ObstacleKind[] {
  return stage >= 2 ? [...GROUND_KINDS, "arrow"] : GROUND_KINDS;
}

export function createRun(): RunState {
  return {
    phase: "idle",
    y: 0,
    vy: 0,
    speed: SPEEDS[0],
    score: 0,
    elapsedMs: 0,
    stage: 0,
    gearChangedAt: 0,
    obstacles: [],
    untilSpawn: 900,
    seed: 1,
    lastKind: null,
  };
}

/**
 * Where the sky is, 0 = full day, 1 = full night, at a moment in the run.
 * `snap` skips the 30 s fades (reduced motion): night from 90 s to 180 s.
 */
export function skyPhase(elapsedMs: number, snap = false): number {
  const t = elapsedMs % SKY_CYCLE_MS;
  if (snap) return t >= NIGHT_AT ? 1 : 0;
  if (t < DUSK_AT) return 0;
  if (t < NIGHT_AT) return (t - DUSK_AT) / (NIGHT_AT - DUSK_AT);
  if (t < DAWN_AT) return 1;
  return 1 - (t - DAWN_AT) / (SKY_CYCLE_MS - DAWN_AT);
}

/** The stint's name, for the caught line: day, dusk, night or dawn. */
export function skyName(elapsedMs: number): "day" | "dusk" | "night" | "dawn" {
  const t = elapsedMs % SKY_CYCLE_MS;
  if (t < DUSK_AT) return "day";
  if (t < NIGHT_AT) return "dusk";
  if (t < DAWN_AT) return "night";
  return "dawn";
}

/** Wind, 0..1: it gets up through dusk and dawn and drops when the sky settles. */
export function windAt(elapsedMs: number): number {
  return Math.sin(Math.PI * skyPhase(elapsedMs));
}

export function startRun(seed: number): RunState {
  return { ...createRun(), phase: "running", seed: seed | 0 || 1 };
}

// mulberry32 step on the embedded seed: deterministic per run.
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

/** Next ground kind from the gear's pool: uniform, never the same twice running. */
function pickKind(s: RunState): ObstacleKind {
  const pool = poolFor(s.stage);
  let kind: ObstacleKind;
  do {
    kind = pool[Math.floor(rand(s) * pool.length)];
  } while (kind === s.lastKind);
  s.lastKind = kind;
  return kind;
}

/** Advance the world. `width` is the visible width so spawns enter off-screen. */
export function tick(s: RunState, dtMs: number, width: number): void {
  if (s.phase !== "running") return;
  const dt = Math.min(dtMs, 50) / 1000; // clamp long frames (tab switches)

  s.elapsedMs += dt * 1000;
  const stage = Math.min(SPEEDS.length - 1, Math.floor(s.elapsedMs / STAGE_MS));
  if (stage !== s.stage) {
    s.stage = stage;
    s.gearChangedAt = s.elapsedMs;
  }
  const target = SPEEDS[s.stage];
  s.speed = Math.min(target, s.speed + SPEED_RATE * dt);
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
    const airtimeMs = ((2 * JUMP_V) / GRAVITY) * 1000;
    let x = width + 40;

    const deal = rand(s);
    if (s.stage >= 2 && deal < 0.22) {
      // A flyer, always alone: the arrow hangs from the sky and the player
      // passes by staying down. The gap after it is a full airtime plus
      // slack, so a ground cluster is never dealt while they're still under.
      const base = SIZES.flyer;
      s.obstacles.push({
        x,
        w: base.w,
        h: base.h,
        kind: "flyer",
        yBottom: FLYER_BOTTOM,
      });
      s.lastKind = "flyer";
      x += base.w;
    } else if (s.stage >= 3 && deal < 0.4) {
      // A kerned pair: A and V set tight, one jump. Kern Combat's letters
      // as a hurdle; the scale is shared so the pair reads as one word.
      const k = 0.85 + rand(s) * 0.25;
      for (const kind of ["aye", "vee"] as const) {
        const w = Math.round(SIZES[kind].w * k);
        const h = Math.round(SIZES[kind].h * k);
        s.obstacles.push({ x, w, h, kind });
        x += w + 6;
      }
      s.lastKind = "vee";
    } else {
      // Deal a cluster of 1-3 pieces: kinds never repeat back to back, every
      // piece gets its own scale (so heights vary), and bigger clusters are
      // kept short and tight so a single jump can still clear them.
      const roll = rand(s);
      const count = roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
      const minScale = count === 1 ? 0.75 : 0.65;
      const maxScale = count === 1 ? 1.35 : count === 2 ? 1.05 : 0.8;
      for (let i = 0; i < count; i++) {
        const kind = pickKind(s);
        const base = SIZES[kind];
        const k = minScale + rand(s) * (maxScale - minScale);
        const w = Math.round(base.w * k);
        let h = Math.round(base.h * k);
        // Singles and pairs sometimes carry a rider: a second piece stacked
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
          // The no-repeat rule applies to the baseline sequence: restore it
          // so a rider doesn't let the next base piece echo this one.
          s.lastKind = kind;
        }
        s.obstacles.push({ x, w, h, kind, top });
        x += w + 18 + rand(s) * 18;
      }
    }
    // The floor of the gap is the full jump's airtime plus a beat, and the
    // cluster's own width rides on top, so a clean player is never dealt
    // an impossible hand. The slack narrows with each gear.
    const clusterMs = ((x - width) / s.speed) * 1000;
    s.untilSpawn = airtimeMs + clusterMs + 260 + rand(s) * SLACK[s.stage];
  }

  // AABB with a small forgiveness inset: this is a footer, not a boss fight.
  const rx = RUNNER.x + 3;
  const rw = RUNNER.size - 6;
  for (const o of s.obstacles) {
    const xOverlap = rx < o.x + o.w - 2 && rx + rw > o.x + 2;
    if (!xOverlap) continue;
    if (o.yBottom !== undefined) {
      // Flyer: hit when the runner's top rises into it. It reaches the apex,
      // so there is no jumping over; only under.
      const runnerTop = s.y + RUNNER.size;
      if (runnerTop > o.yBottom + 3 && s.y < o.yBottom + o.h) {
        s.phase = "dead";
        break;
      }
    } else if (s.y < o.h - 3) {
      s.phase = "dead";
      break;
    }
  }
}
