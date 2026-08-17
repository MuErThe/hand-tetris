// Steady Hand: trace the curve. A Bézier path is drawn on the artboard and
// the player follows it in one stroke; the score is how close the stroke stayed
// and how much of the path it actually covered.
//
// Geometry is normalised to a 0..1 play area (y = 0 top), like Eyeball It, so
// the engine never needs to know the pixel size of the surface.

export type CurveType =
  | "arc" // one gentle bend: the baseline
  | "s-curve" // an inflection: the hand has to reverse its bias
  | "tight" // small radius, where corners get cut
  | "sweep" // long and shallow, where drift accumulates
  | "hook" // straight into a sudden bend
  | "wave"; // repeated inflections, the endurance test

export const CURVE_TYPES: CurveType[] = [
  "arc",
  "s-curve",
  "tight",
  "sweep",
  "hook",
  "wave",
];

export const TYPE_LABEL: Record<CurveType, string> = {
  arc: "ARC",
  "s-curve": "S-CURVE",
  tight: "TIGHT",
  sweep: "SWEEP",
  hook: "HOOK",
  wave: "WAVE",
};

export interface Pt {
  x: number;
  y: number;
}

/** One cubic Bézier segment. Segments in a path share endpoints. */
export interface Cubic {
  p0: Pt;
  p1: Pt;
  p2: Pt;
  p3: Pt;
}

export interface Challenge {
  type: CurveType;
  prompt: string;
  segments: Cubic[];
  /** Mean deviation at or beyond this (normalised units) scores zero. */
  tol: number;
}

export interface Evaluation {
  /** Normalised error, 0 = perfect … 1 = at/over tolerance. */
  errorPct: number;
  points: number;
  /** Mistake tag for lesson lookup. */
  tag: string;
  /** Mean deviation from the path, normalised. */
  meanDev: number;
  /** Worst single deviation, normalised. */
  maxDev: number;
  /** Fraction of the path the stroke actually covered, 0..1. */
  coverage: number;
  guessDisplay: string;
  targetDisplay: string;
  errorDisplay: string;
}

export const ROUNDS_PER_SESSION = 8;
export const MAX_ROUND_POINTS = 1000;

/**
 * Deviation tolerance as a fraction of the play area. ~5% is forgiving enough
 * that a steady hand scores well on a laptop trackpad, tight enough that
 * corner-cutting shows up.
 */
export const DEV_TOL = 0.05;

/** Below this much of the path traced, the round is treated as abandoned. */
export const MIN_COVERAGE = 0.55;
