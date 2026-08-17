// Contrast Call: read a colour pair and call its WCAG contrast ratio.
//
// One interaction throughout (place a caret on the ratio rail); what changes
// between challenge types is the STIMULUS, because that is where the learning
// is. Warm hues flatter themselves, deep blues read darker than they measure,
// and two saturated hues can vibrate while failing badly: the eye has
// specific, teachable biases and each type targets one.

export type ContrastType =
  | "mono" // neutral greys: the honest baseline
  | "warm" // reds/oranges/yellows, which read brighter than they measure
  | "cool" // blues/greens/purples, which read darker than they measure
  | "clash" // two saturated hues at similar luminance: vibration ≠ contrast
  | "threshold" // clustered around 4.5:1, where the decision actually happens
  | "extreme"; // the compressed ends of the scale

export const CONTRAST_TYPES: ContrastType[] = [
  "mono",
  "warm",
  "cool",
  "clash",
  "threshold",
  "extreme",
];

export const TYPE_LABEL: Record<ContrastType, string> = {
  mono: "GREYSCALE",
  warm: "WARM",
  cool: "COOL",
  clash: "CLASH",
  threshold: "THRESHOLD",
  extreme: "EXTREMES",
};

export interface Challenge {
  type: ContrastType;
  prompt: string;
  /** CSS colours for the sample. */
  fg: string;
  bg: string;
  /** The true ratio, computed from the colours actually produced. */
  ratio: number;
  /** True ratio as a rail position, 0..1. */
  target: number;
  /** Positional tolerance beyond which the round scores zero. */
  tol: number;
  /** The words shown in the sample. */
  sample: string;
}

export interface Evaluation {
  /** Normalised error, 0 = perfect … 1 = at/over tolerance. */
  errorPct: number;
  points: number;
  /** Mistake tag for lesson lookup: "over" | "under". */
  tag: string;
  guessDisplay: string;
  targetDisplay: string;
  errorDisplay: string;
  /** Whether the true pair passes the WCAG thresholds. */
  passes: { aaBody: boolean; aaLarge: boolean; aaaBody: boolean };
}

/** The rail runs 1:1 … 21:1; the full range a pair of sRGB colours can span. */
export const RAIL_MIN = 1;
export const RAIL_MAX = 21;

/**
 * Ratios are logarithmic in use: the gap between 1:1 and 2:1 matters far more
 * than the gap between 15:1 and 16:1. Placing the rail in log space gives the
 * decision zone (3:1 to 7:1) the room it deserves and puts 4.5:1 near the
 * middle, where the player can actually aim at it.
 */
export function ratioToPos(ratio: number): number {
  const r = Math.max(RAIL_MIN, Math.min(RAIL_MAX, ratio));
  return Math.log(r) / Math.log(RAIL_MAX);
}

export function posToRatio(pos: number): number {
  const p = Math.max(0, Math.min(1, pos));
  return Math.exp(p * Math.log(RAIL_MAX));
}

/** The thresholds worth marking on the rail. */
export const LANDMARKS: { ratio: number; label: string }[] = [
  { ratio: 3, label: "3:1" },
  { ratio: 4.5, label: "4.5:1" },
  { ratio: 7, label: "7:1" },
];

export const ROUNDS_PER_SESSION = 10;
export const MAX_ROUND_POINTS = 1000;
/** Being this far off along the rail scores zero. */
export const POS_TOL = 0.15;
