// Steady Hand — pure geometry + scoring. No React, no DOM.

import {
  type Challenge,
  type Cubic,
  type CurveType,
  type Evaluation,
  type Pt,
  DEV_TOL,
  MAX_ROUND_POINTS,
  MIN_COVERAGE,
} from "./types";

function rand(): number {
  return Math.random();
}

function jitter(amount: number): number {
  return (rand() - 0.5) * 2 * amount;
}

/** Point on a cubic at parameter t. */
export function cubicAt(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * c.p0.x + b * c.p1.x + d * c.p2.x + e * c.p3.x,
    y: a * c.p0.y + b * c.p1.y + d * c.p2.y + e * c.p3.y,
  };
}

/**
 * Dense polyline for a path. Everything downstream — drawing, nearest-point
 * search, arc length, coverage — works off this one approximation, so the
 * thing being scored is exactly the thing being drawn.
 */
export function samplePath(segments: Cubic[], perSegment = 90): Pt[] {
  const out: Pt[] = [];
  segments.forEach((seg, i) => {
    // Skip t=0 on later segments: it duplicates the previous endpoint.
    const start = i === 0 ? 0 : 1;
    for (let k = start; k <= perSegment; k++) {
      out.push(cubicAt(seg, k / perSegment));
    }
  });
  return out;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ── Curve recipes ─────────────────────────────────────────────────────────
// Authored left-to-right in the 0..1 box, then randomly flipped so a type
// can't be memorised as a single shape.

type Recipe = () => Cubic[];

const RECIPES: Record<CurveType, Recipe> = {
  arc: () => [
    {
      p0: { x: 0.12, y: 0.68 + jitter(0.06) },
      p1: { x: 0.34, y: 0.2 + jitter(0.08) },
      p2: { x: 0.66, y: 0.2 + jitter(0.08) },
      p3: { x: 0.88, y: 0.68 + jitter(0.06) },
    },
  ],
  "s-curve": () => {
    const mid = { x: 0.5, y: 0.5 + jitter(0.05) };
    return [
      {
        p0: { x: 0.12, y: 0.78 + jitter(0.05) },
        p1: { x: 0.26, y: 0.74 },
        p2: { x: 0.34, y: 0.54 },
        p3: mid,
      },
      {
        p0: mid,
        p1: { x: 0.66, y: 0.46 },
        p2: { x: 0.74, y: 0.26 },
        p3: { x: 0.88, y: 0.22 + jitter(0.05) },
      },
    ];
  },
  tight: () => [
    {
      p0: { x: 0.18, y: 0.78 },
      p1: { x: 0.78 + jitter(0.06), y: 0.74 },
      p2: { x: 0.8 + jitter(0.06), y: 0.2 },
      p3: { x: 0.34, y: 0.26 + jitter(0.05) },
    },
  ],
  sweep: () => [
    {
      p0: { x: 0.08, y: 0.6 + jitter(0.08) },
      p1: { x: 0.36, y: 0.46 + jitter(0.06) },
      p2: { x: 0.64, y: 0.54 + jitter(0.06) },
      p3: { x: 0.92, y: 0.4 + jitter(0.08) },
    },
  ],
  hook: () => {
    const mid = { x: 0.62 + jitter(0.05), y: 0.72 };
    return [
      {
        p0: { x: 0.12, y: 0.74 },
        p1: { x: 0.28, y: 0.735 },
        p2: { x: 0.46, y: 0.73 },
        p3: mid,
      },
      {
        p0: mid,
        p1: { x: 0.84, y: 0.7 },
        p2: { x: 0.86, y: 0.3 },
        p3: { x: 0.6, y: 0.2 + jitter(0.05) },
      },
    ];
  },
  wave: () => {
    const a = { x: 0.36, y: 0.5 };
    const b = { x: 0.64, y: 0.5 };
    return [
      {
        p0: { x: 0.1, y: 0.5 },
        p1: { x: 0.18, y: 0.22 + jitter(0.05) },
        p2: { x: 0.28, y: 0.22 + jitter(0.05) },
        p3: a,
      },
      {
        p0: a,
        p1: { x: 0.44, y: 0.78 + jitter(0.05) },
        p2: { x: 0.56, y: 0.78 + jitter(0.05) },
        p3: b,
      },
      {
        p0: b,
        p1: { x: 0.72, y: 0.22 + jitter(0.05) },
        p2: { x: 0.82, y: 0.22 + jitter(0.05) },
        p3: { x: 0.9, y: 0.5 },
      },
    ];
  },
};

const PROMPTS: Record<CurveType, string> = {
  arc: "Trace the arc in one stroke — start at the marker.",
  "s-curve": "Follow the S through its turn — one stroke, no lifting.",
  tight: "Take the tight bend without cutting the corner.",
  sweep: "Long and shallow — hold the line all the way across.",
  hook: "Straight, then the hook. Don't round off the transition.",
  wave: "Ride every inflection — one continuous stroke.",
};

function flip(segments: Cubic[], flipX: boolean, flipY: boolean): Cubic[] {
  const f = (p: Pt): Pt => ({
    x: flipX ? 1 - p.x : p.x,
    y: flipY ? 1 - p.y : p.y,
  });
  return segments.map((s) => ({ p0: f(s.p0), p1: f(s.p1), p2: f(s.p2), p3: f(s.p3) }));
}

export function generate(type: CurveType): Challenge {
  let segments = RECIPES[type]();
  segments = flip(segments, rand() < 0.5, rand() < 0.5);
  return { type, prompt: PROMPTS[type], segments, tol: DEV_TOL };
}

// ── Scoring ───────────────────────────────────────────────────────────────

/** Cumulative arc length along a polyline, plus its total. */
function arcLengths(poly: Pt[]): { cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < poly.length; i++) {
    cum.push(cum[i - 1] + dist(poly[i - 1], poly[i]));
  }
  return { cum, total: cum[cum.length - 1] };
}

/**
 * Score a traced stroke against the path.
 *
 * Two things matter and they are scored separately on purpose: how far the
 * stroke strayed (deviation), and how much of the path it actually covered.
 * Without the second, stopping after a confident inch would score perfectly.
 */
export function evaluate(challenge: Challenge, trace: Pt[]): Evaluation {
  const poly = samplePath(challenge.segments);
  const { cum, total } = arcLengths(poly);

  if (trace.length < 2) {
    return {
      errorPct: 1,
      points: 0,
      tag: "short",
      meanDev: 1,
      maxDev: 1,
      coverage: 0,
      guessDisplay: "no stroke",
      targetDisplay: "the full path",
      errorDisplay: "—",
    };
  }

  // Nearest path point for each traced sample — this is the deviation.
  let sumDev = 0;
  let maxDev = 0;
  // Signed offsets, for telling corner-cutting from swinging wide.
  let signedSum = 0;
  const devs: number[] = [];

  for (const t of trace) {
    let best = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < poly.length; i++) {
      const d = dist(t, poly[i]);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    sumDev += best;
    maxDev = Math.max(maxDev, best);
    devs.push(best);

    // Which side of the path: cross product of the local tangent with the
    // offset vector. Sign is arbitrary but consistent along the path.
    const i0 = Math.max(0, bestIdx - 1);
    const i1 = Math.min(poly.length - 1, bestIdx + 1);
    const tx = poly[i1].x - poly[i0].x;
    const ty = poly[i1].y - poly[i0].y;
    const ox = t.x - poly[bestIdx].x;
    const oy = t.y - poly[bestIdx].y;
    signedSum += Math.sign(tx * oy - ty * ox) * best;
  }

  const meanDev = sumDev / trace.length;

  // Coverage is measured from the PATH's side: for every point on the path,
  // how close did the stroke ever come? Asking it this way round answers "how
  // much of this did you actually trace". Asking it the other way round — which
  // path points a stroke landed on — undercounts badly, because a fast stroke
  // samples sparsely while still passing along the whole path.
  const reached = poly.map((p) => {
    let best = Infinity;
    for (const t of trace) {
      const d = dist(p, t);
      if (d < best) best = d;
    }
    return best <= challenge.tol;
  });
  let covered = 0;
  for (let i = 1; i < poly.length; i++) {
    if (reached[i - 1] && reached[i]) covered += cum[i] - cum[i - 1];
  }
  const coverage = total > 0 ? Math.min(1, covered / total) : 0;

  const devError = Math.min(1, meanDev / challenge.tol);
  // An incomplete stroke can't score better than the fraction it covered.
  const coverageError = coverage >= MIN_COVERAGE ? 1 - coverage : 1;
  const errorPct = Math.min(1, Math.max(devError, coverageError));

  const points = Math.round(MAX_ROUND_POINTS * Math.pow(1 - errorPct, 2));

  // Variance separates an unsteady hand from a steady one that took a
  // consistently wrong line.
  const variance =
    devs.reduce((a, d) => a + (d - meanDev) ** 2, 0) / devs.length;
  const wobble = Math.sqrt(variance) / (meanDev || 1);
  const bias = Math.abs(signedSum / trace.length) / (meanDev || 1);

  let tag: string;
  if (coverage < MIN_COVERAGE) tag = "short";
  else if (bias > 0.55) tag = "drift";
  else if (wobble > 0.7) tag = "wobble";
  else tag = "_default";

  return {
    errorPct,
    points,
    tag,
    meanDev,
    maxDev,
    coverage,
    guessDisplay: `${(meanDev * 100).toFixed(1)}% off`,
    targetDisplay: `${Math.round(coverage * 100)}% traced`,
    errorDisplay: `worst ${(maxDev * 100).toFixed(1)}%`,
  };
}
