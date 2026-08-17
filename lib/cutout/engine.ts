// Cutout: pure generators + scoring. No React, no DOM.

import {
  type BoolOp,
  type Evaluation,
  type Round,
  type Shape,
  type ShapeKind,
  BASE_POINTS,
  MAX_ROUND_POINTS,
  OP_HINT,
  SPEED_WINDOW_MS,
} from "./types";

function rand(): number {
  return Math.random();
}

function between(lo: number, hi: number): number {
  return lo + rand() * (hi - lo);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const KINDS: ShapeKind[] = ["circle", "rect", "roundrect", "triangle"];

/** Is a point inside a shape? Used to measure overlap, not to draw. */
export function contains(s: Shape, px: number, py: number): boolean {
  const { x, y, w, h } = s;
  if (px < x || px > x + w || py < y || py > y + h) return false;
  switch (s.kind) {
    case "rect":
      return true;
    case "circle": {
      const nx = (px - (x + w / 2)) / (w / 2);
      const ny = (py - (y + h / 2)) / (h / 2);
      return nx * nx + ny * ny <= 1;
    }
    case "roundrect": {
      const r = (s.r ?? 0.22) * Math.min(w, h);
      const dx = Math.max(x + r - px, 0, px - (x + w - r));
      const dy = Math.max(y + r - py, 0, py - (y + h - r));
      return dx * dx + dy * dy <= r * r;
    }
    case "triangle": {
      // Apex top-centre, base along the bottom edge.
      const ax = x + w / 2;
      const ay = y;
      const bx = x;
      const by = y + h;
      const cx2 = x + w;
      const cy2 = y + h;
      const d = (by - cy2) * (ax - cx2) + (cx2 - bx) * (ay - cy2);
      const l1 = ((by - cy2) * (px - cx2) + (cx2 - bx) * (py - cy2)) / d;
      const l2 = ((cy2 - ay) * (px - cx2) + (ax - cx2) * (py - cy2)) / d;
      const l3 = 1 - l1 - l2;
      return l1 >= 0 && l2 >= 0 && l3 >= 0;
    }
  }
}

/**
 * Overlap of B with A, as a fraction of the smaller shape's area. Sampled on a
 * coarse grid: precision doesn't matter here, only whether the overlap is a
 * real region rather than a sliver or a containment.
 */
function overlapFraction(a: Shape, b: Shape): number {
  const N = 56;
  let areaA = 0;
  let areaB = 0;
  let both = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const px = (i + 0.5) / N;
      const py = (j + 0.5) / N;
      const inA = contains(a, px, py);
      const inB = contains(b, px, py);
      if (inA) areaA++;
      if (inB) areaB++;
      if (inA && inB) both++;
    }
  }
  const smaller = Math.min(areaA, areaB);
  return smaller === 0 ? 0 : both / smaller;
}

/**
 * Every operation has to yield a visibly different silhouette, or the round has
 * more than one right answer. That needs three things to hold:
 *
 *   - the shapes genuinely overlap        (else intersect is empty, and
 *                                          exclude and union are identical)
 *   - neither contains the other          (else one subtraction is empty and
 *                                          intersect equals the smaller shape)
 *   - the two shapes differ               (else A−B and B−A are both empty)
 *
 * The first two are measured rather than assumed: a triangle offset far enough
 * can have overlapping bounding boxes and no overlapping area at all.
 */
function layoutOnce(): { a: Shape; b: Shape } {
  const kindA = pick(KINDS);
  // Different kinds read more clearly, and guarantee the shapes differ.
  const kindB = pick(KINDS.filter((k) => k !== kindA));

  const size = between(0.4, 0.48);
  const sizeB = size * between(0.85, 1.15);

  // Offset far enough that neither swallows the other, close enough that the
  // overlap is a substantial region rather than a sliver.
  const dx = size * between(0.38, 0.56) * (rand() < 0.5 ? -1 : 1);
  const dy = size * between(0.28, 0.46) * (rand() < 0.5 ? -1 : 1);

  const cx = 0.5 - dx / 2;
  const cy = 0.5 - dy / 2;

  return {
    a: {
      kind: kindA,
      x: cx - size / 2,
      y: cy - size / 2,
      w: size,
      h: size,
      r: 0.22,
    },
    b: {
      kind: kindB,
      x: cx + dx - sizeB / 2,
      y: cy + dy - sizeB / 2,
      w: sizeB,
      h: sizeB,
      r: 0.22,
    },
  };
}

/** Partial overlap: enough to be a region, not so much it's a containment. */
const MIN_OVERLAP = 0.18;
const MAX_OVERLAP = 0.72;

function layout(): { a: Shape; b: Shape } {
  let best = layoutOnce();
  let bestScore = -1;
  for (let i = 0; i < 24; i++) {
    const cand = layoutOnce();
    const f = overlapFraction(cand.a, cand.b);
    if (f >= MIN_OVERLAP && f <= MAX_OVERLAP) return cand;
    // Keep whichever came closest, so generate() always returns something.
    const score = -Math.abs(f - (MIN_OVERLAP + MAX_OVERLAP) / 2);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best;
}

export function generate(op: BoolOp): Round {
  const { a, b } = layout();
  return {
    type: op,
    prompt: "Which operation turns A and B into that shape?",
    a,
    b,
  };
}

/**
 * Score a pick. Correct banks BASE_POINTS plus a speed share; a wrong pick
 * scores nothing: with five named operations there is no partial credit for
 * choosing the wrong one.
 */
export function evaluate(
  round: Round,
  picked: BoolOp,
  elapsedMs: number,
): Evaluation {
  const correct = picked === round.type;
  if (!correct) {
    return { correct, errorPct: 1, points: 0, tag: "missed", picked };
  }
  const speed = Math.max(0, Math.min(1, 1 - elapsedMs / SPEED_WINDOW_MS));
  return {
    correct,
    errorPct: 0,
    points: Math.round(BASE_POINTS + (MAX_ROUND_POINTS - BASE_POINTS) * speed),
    tag: "caught",
    picked,
  };
}

/** Plain-language description of an operation, for the reveal. */
export function describe(op: BoolOp): string {
  return OP_HINT[op];
}
