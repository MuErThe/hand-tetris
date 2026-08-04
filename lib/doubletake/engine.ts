// Double Take — pure generators + scoring. No React, no DOM.

import {
  type Copy,
  type Evaluation,
  type FlawType,
  type Mock,
  type Rect,
  type Round,
  BASE_POINTS,
  MAX_ROUND_POINTS,
  PANEL_H,
  PANEL_W,
  SPEED_WINDOW_MS,
  TYPE_HINT,
} from "./types";
import {
  blend,
  contrastRatio as wcagContrast,
} from "@/lib/colour/space";

function rand(): number {
  return Math.random();
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** A believable card, so the eye judges a UI rather than an abstract diagram. */
const COPY: Copy[] = [
  { title: "Monthly report", subtitle: "Updated 3 hours ago", primary: "Export", secondary: "Cancel" },
  { title: "Team settings", subtitle: "12 members · 3 pending", primary: "Invite", secondary: "Close" },
  { title: "Payment method", subtitle: "Visa ending 4417", primary: "Update", secondary: "Remove" },
  { title: "Release notes", subtitle: "Version 2.4 · draft", primary: "Publish", secondary: "Discard" },
  { title: "Storage plan", subtitle: "84% of 2 TB used", primary: "Upgrade", secondary: "Details" },
];

/** The flawless baseline. Every flaw is a departure from exactly one of these. */
function baseMock(): Mock {
  return {
    padL: 20,
    padR: 20,
    gaps: [13, 13],
    bodyIndent: 0,
    titleSize: 15,
    subSize: 10.5,
    // 0.72 over the card ground clears 4.5:1 comfortably.
    subAlpha: 0.72,
    btnRadius: [4, 4],
    lineW: [1, 0.84, 0.58],
  };
}

/**
 * Flaw magnitudes, from most obvious to subtlest. `subtlety` 0..1 interpolates,
 * so later rounds ask a finer question than the first ones.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Effective WCAG contrast of the subtitle ink at a given opacity, against the
 * card ground. The card is pinned to fixed colours (see CARD_GROUND/CARD_INK
 * in the renderer) precisely so this number means the same thing in either
 * theme — the ground is part of the measurement, as with the Colour Forge mat.
 */
export function contrastRatio(alpha: number): number {
  const ground = { r: 255, g: 255, b: 255 };
  const ink = { r: 28, g: 28, b: 26 };
  return wcagContrast(blend(ink, ground, alpha), ground);
}

/** Where each flaw lives on the card, for the reveal's marker. */
const FOCUS: Record<FlawType, Rect> = {
  alignment: { x: 12, y: 90, w: PANEL_W - 24, h: 46 },
  spacing: { x: 12, y: 90, w: PANEL_W - 24, h: 46 },
  hierarchy: { x: 48, y: 16, w: PANEL_W - 64, h: 46 },
  contrast: { x: 48, y: 38, w: PANEL_W - 64, h: 24 },
  radius: { x: 126, y: 144, w: 142, h: 38 },
  padding: { x: 4, y: 8, w: PANEL_W - 8, h: PANEL_H - 16 },
};

/**
 * Build one round: a clean card and a copy with a single flaw applied.
 *
 * @param subtlety 0 = the most obvious version of this flaw, 1 = the subtlest.
 */
export function generate(type: FlawType, subtlety = 0.5): Round {
  const clean = baseMock();
  const flawed = baseMock();
  const copy = pick(COPY);
  let flawLabel: string;

  switch (type) {
    case "alignment": {
      // The body stack drifts off the column the title established.
      const d = lerp(9, 3, subtlety) * (rand() < 0.5 ? -1 : 1);
      flawed.bodyIndent = d;
      flawLabel = `the body lines sit ${Math.abs(d).toFixed(0)}px ${d > 0 ? "right of" : "left of"} the column everything else uses`;
      break;
    }
    case "spacing": {
      // One gap in the rhythm runs loose.
      const d = lerp(8, 2.5, subtlety);
      flawed.gaps = [clean.gaps[0], clean.gaps[1] + d];
      flawLabel = `the last gap is ${d.toFixed(1)}px wider than the one above it`;
      break;
    }
    case "hierarchy": {
      // The subtitle creeps up until it competes with the title.
      const target = lerp(14.2, 12.6, subtlety);
      flawed.subSize = target;
      flawLabel = `the label grew to ${target.toFixed(1)}px against a ${clean.titleSize}px title — too close to rank`;
      break;
    }
    case "contrast": {
      // Faint enough to fail AA against the card ground. Even the subtlest
      // instance lands at 3.3:1 — the "tasteful grey" that fails real people.
      const a = lerp(0.3, 0.5, subtlety);
      flawed.subAlpha = a;
      flawLabel = `the label sits at ${contrastRatio(a).toFixed(1)}:1 against the card — under the 4.5:1 minimum for body text`;
      break;
    }
    case "radius": {
      // One button forgets the system's corner value.
      const d = lerp(6, 2, subtlety);
      flawed.btnRadius = [clean.btnRadius[0], clean.btnRadius[1] + d];
      flawLabel = `one button is rounded to ${(clean.btnRadius[1] + d).toFixed(0)}px while its sibling stays at ${clean.btnRadius[1]}px`;
      break;
    }
    case "padding": {
      // The container stops being centred on its own contents.
      const d = lerp(10, 3.5, subtlety);
      flawed.padR = clean.padR + d;
      flawLabel = `the right padding runs ${d.toFixed(1)}px deeper than the left`;
      break;
    }
  }

  const cleanIdx: 0 | 1 = rand() < 0.5 ? 0 : 1;

  return {
    type,
    prompt: `Pick the one that's right — ${TYPE_HINT[type]}.`,
    copy,
    cleanIdx,
    clean,
    flawed,
    flawLabel,
    focus: FOCUS[type],
    subtlety,
  };
}

/**
 * Score a pick. Correct answers bank BASE_POINTS plus a speed share; a wrong
 * pick scores nothing, because there is no half-right when one of them is
 * simply broken.
 */
export function evaluate(
  round: Round,
  choiceIdx: 0 | 1,
  elapsedMs: number,
): Evaluation {
  const correct = choiceIdx === round.cleanIdx;
  if (!correct) {
    return {
      correct,
      errorPct: 1,
      points: 0,
      tag: "missed",
      detail: round.flawLabel,
    };
  }
  const speed = Math.max(0, Math.min(1, 1 - elapsedMs / SPEED_WINDOW_MS));
  const points = Math.round(
    BASE_POINTS + (MAX_ROUND_POINTS - BASE_POINTS) * speed,
  );
  return {
    correct,
    errorPct: 0,
    points,
    tag: "caught",
    detail: round.flawLabel,
  };
}

/** Layout maths shared by the renderer, kept beside the spec it derives from. */
export function contentWidth(m: Mock): number {
  return PANEL_W - m.padL - m.padR;
}
