// Contrast Call — pure generators + scoring. No React, no DOM.

import {
  contrastRatio,
  hslToRgb,
  relativeLuminance,
  rgbToCss,
  type Hsl,
} from "@/lib/colour/space";
import {
  type Challenge,
  type ContrastType,
  type Evaluation,
  MAX_ROUND_POINTS,
  POS_TOL,
  ratioToPos,
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

const SAMPLES = [
  "Save changes",
  "Continue to payment",
  "Your session expires soon",
  "Download the report",
  "Reset your password",
  "Two items need review",
];

const WARM_HUES = [0, 14, 28, 40, 52];
const COOL_HUES = [150, 190, 215, 250, 280];

/**
 * Find the HSL lightness whose colour hits a target relative luminance, for a
 * fixed hue and saturation. Luminance rises monotonically with lightness, so a
 * bisection always converges — and solving for luminance (rather than picking
 * a colour and hoping) is what lets each round target a chosen ratio.
 *
 * Returns null when the target is unreachable at this hue/saturation, which
 * happens for vivid hues near the ends of the range.
 */
function solveForLuminance(h: number, s: number, targetY: number): Hsl | null {
  const yAt = (l: number) => relativeLuminance(hslToRgb({ h, s, l }));
  if (targetY < yAt(0) - 0.002 || targetY > yAt(100) + 0.002) return null;
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (yAt(mid) < targetY) lo = mid;
    else hi = mid;
  }
  return { h, s, l: (lo + hi) / 2 };
}

/** Luminance a foreground needs to sit at `ratio` against a given ground. */
function luminanceForRatio(
  groundY: number,
  ratio: number,
  lighter: boolean,
): number {
  return lighter
    ? (groundY + 0.05) * ratio - 0.05
    : (groundY + 0.05) / ratio - 0.05;
}

interface Recipe {
  /** Ratio band this type draws from. */
  band: () => number;
  bg: () => Hsl;
  /** Hue/saturation for the foreground; lightness is solved for. */
  fgHueSat: (bg: Hsl) => { h: number; s: number };
}

const RECIPES: Record<ContrastType, Recipe> = {
  mono: {
    band: () => between(1.6, 12),
    bg: () => ({ h: 0, s: 0, l: between(82, 98) }),
    fgHueSat: () => ({ h: 0, s: 0 }),
  },
  warm: {
    band: () => between(1.8, 9),
    bg: () => ({ h: pick(WARM_HUES), s: between(25, 70), l: between(80, 95) }),
    fgHueSat: (bg) => ({ h: bg.h + between(-14, 14), s: between(45, 85) }),
  },
  cool: {
    band: () => between(1.8, 9),
    bg: () => ({ h: pick(COOL_HUES), s: between(20, 60), l: between(80, 95) }),
    fgHueSat: (bg) => ({ h: bg.h + between(-18, 18), s: between(40, 80) }),
  },
  clash: {
    // Opposing hues at close luminance — the pair that looks loud and fails.
    band: () => between(1.05, 3.2),
    bg: () => ({ h: between(0, 360), s: between(60, 95), l: between(45, 62) }),
    fgHueSat: (bg) => ({ h: bg.h + 180 + between(-40, 40), s: between(60, 95) }),
  },
  threshold: {
    // Straddling 4.5:1, where the answer changes a design decision.
    band: () => between(3.4, 6.0),
    bg: () => ({ h: between(0, 360), s: between(0, 25), l: between(84, 97) }),
    fgHueSat: (bg) => ({ h: bg.h, s: between(0, 45) }),
  },
  extreme: {
    band: () => (rand() < 0.5 ? between(1.05, 1.9) : between(11, 19)),
    bg: () => ({ h: between(0, 360), s: between(0, 35), l: between(70, 98) }),
    fgHueSat: (bg) => ({ h: bg.h, s: between(0, 40) }),
  },
};

/** Generate a fresh, randomised challenge of the given type. */
export function generate(type: ContrastType): Challenge {
  const recipe = RECIPES[type];

  // Try a few times: vivid hues cannot reach every luminance, so a recipe can
  // legitimately fail. Falling back to a neutral foreground guarantees a round.
  let bg: Hsl = recipe.bg();
  let fg: Hsl | null = null;
  for (let attempt = 0; attempt < 12 && !fg; attempt++) {
    bg = recipe.bg();
    const bgY = relativeLuminance(hslToRgb(bg));
    const target = recipe.band();
    const { h, s } = recipe.fgHueSat(bg);
    // Prefer the direction that stays inside the representable range.
    const wantLighter = bgY < 0.18;
    const wanted = luminanceForRatio(bgY, target, wantLighter);
    fg =
      wanted >= 0 && wanted <= 1
        ? solveForLuminance(h, s, wanted)
        : solveForLuminance(h, s, luminanceForRatio(bgY, target, !wantLighter));
  }
  if (!fg) {
    const bgY = relativeLuminance(hslToRgb(bg));
    fg = solveForLuminance(0, 0, luminanceForRatio(bgY, 4.5, bgY < 0.18)) ?? {
      h: 0,
      s: 0,
      l: 0,
    };
  }

  // The truth is whatever the colours actually are, never the requested band —
  // the solver lands close but the pair on screen is the thing being judged.
  const fgRgb = hslToRgb(fg);
  const bgRgb = hslToRgb(bg);
  const ratio = contrastRatio(fgRgb, bgRgb);

  return {
    type,
    prompt: "Call the contrast ratio — place your mark on the rail.",
    fg: rgbToCss(fgRgb),
    bg: rgbToCss(bgRgb),
    ratio,
    target: ratioToPos(ratio),
    tol: POS_TOL,
    sample: pick(SAMPLES),
  };
}

function fmtRatio(r: number): string {
  return `${r.toFixed(1)}:1`;
}

export function evaluate(challenge: Challenge, guessPos: number): Evaluation {
  const raw = Math.abs(guessPos - challenge.target);
  const errorPct = Math.min(1, raw / challenge.tol);
  const guessRatio = Math.exp(
    Math.max(0, Math.min(1, guessPos)) * Math.log(21),
  );

  // Quadratic falloff, matching the other games' feel: near-misses still pay.
  const points = Math.round(MAX_ROUND_POINTS * Math.pow(1 - errorPct, 2));

  return {
    errorPct,
    points,
    tag: guessPos > challenge.target ? "over" : "under",
    guessDisplay: fmtRatio(guessRatio),
    targetDisplay: fmtRatio(challenge.ratio),
    errorDisplay: `${(Math.abs(guessRatio - challenge.ratio)).toFixed(1)}`,
    passes: {
      aaBody: challenge.ratio >= 4.5,
      aaLarge: challenge.ratio >= 3,
      aaaBody: challenge.ratio >= 7,
    },
  };
}
