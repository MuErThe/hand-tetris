// Double Take: pure generators + scoring. No React, no DOM.

import {
  type Archetype,
  type El,
  type Evaluation,
  type FlawType,
  type Rect,
  type Role,
  type Round,
  type Spec,
  ARCHETYPES,
  BASE_POINTS,
  MAX_ROUND_POINTS,
  PANEL_H,
  PANEL_W,
  SPEED_WINDOW_MS,
  TYPE_HINT,
} from "./types";
import { COPY, NOUNS, baseSpec, layout, rolesOf } from "./archetypes";
import { blend, contrastRatio as wcagContrast } from "@/lib/colour/space";

function rand(): number {
  return Math.random();
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * Flaw magnitudes, from most obvious to subtlest. `subtlety` 0..1 interpolates,
 * so later rounds ask a finer question than the first ones.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Effective WCAG contrast of the meta ink at a given opacity, against the card
 * ground. The card palette is pinned (see CARD in ./types) precisely so this
 * number means the same thing in either theme: the ground is part of the
 * measurement, as with the Colour Forge mat.
 */
export function contrastRatio(alpha: number): number {
  const ground = { r: 255, g: 255, b: 255 };
  const ink = { r: 28, g: 28, b: 26 };
  return wcagContrast(blend(ink, ground, alpha), ground);
}

/**
 * The role each flaw lives on. The marker is then a box the layout actually
 * produced, so it cannot drift out of step with the card the way a hard-coded
 * table of rectangles did.
 */
const FOCUS_ROLES: Record<FlawType, Role[]> = {
  alignment: ["drift"],
  spacing: ["stack"],
  hierarchy: ["title", "meta"],
  contrast: ["meta"],
  radius: ["sibB"],
  padding: [],
  placement: ["nudge"],
  proximity: ["title", "meta"],
  consistency: ["iconRow"],
};

/** The role a flaw needs the card to have before it can be asked there. */
const REQUIRES: Partial<Record<FlawType, Role>> = {
  radius: "sibB",
  placement: "nudge",
  consistency: "iconRow",
};

const SUPPORT: Record<Archetype, Set<FlawType>> = ARCHETYPES.reduce(
  (acc, a) => {
    const roles = rolesOf(a);
    acc[a] = new Set(
      (Object.keys(FOCUS_ROLES) as FlawType[]).filter((f) => {
        const need = REQUIRES[f];
        return need === undefined || roles.has(need);
      }),
    );
    return acc;
  },
  {} as Record<Archetype, Set<FlawType>>,
);

export function hostsFor(type: FlawType): Archetype[] {
  return ARCHETYPES.filter((a) => SUPPORT[a].has(type));
}

/** Bounding box of the elements carrying any of `roles`, with breathing room. */
function focusRect(els: El[], roles: Role[]): Rect {
  const hits = els.filter((e) => e.roles?.some((r) => roles.includes(r)));
  if (hits.length === 0) return { x: 3, y: 3, w: PANEL_W - 6, h: PANEL_H - 6 };
  const x0 = Math.min(...hits.map((e) => e.x));
  const y0 = Math.min(...hits.map((e) => e.y));
  const x1 = Math.max(...hits.map((e) => e.x + e.w));
  const y1 = Math.max(...hits.map((e) => e.y + e.h));
  const pad = 6;
  const x = Math.max(2, x0 - pad);
  const y = Math.max(2, y0 - pad);
  return {
    x,
    y,
    w: Math.min(PANEL_W - 2, x1 + pad) - x,
    h: Math.min(PANEL_H - 2, y1 + pad) - y,
  };
}

/**
 * Build one round: a clean card and a copy of it with a single flaw applied.
 *
 * @param subtlety 0 = the most obvious version of this flaw, 1 = the subtlest.
 * @param avoid    an archetype not to repeat back-to-back, where there's a choice.
 */
export function generate(
  type: FlawType,
  subtlety = 0.5,
  avoid?: Archetype,
): Round {
  const hosts = hostsFor(type);
  const pool = hosts.filter((a) => a !== avoid);
  const archetype = pick(pool.length > 0 ? pool : hosts);
  const copy = pick(COPY[archetype]);
  const nouns = NOUNS[archetype];

  const clean: Spec = baseSpec();
  const flawed: Spec = baseSpec();
  let flawLabel: string;

  switch (type) {
    case "alignment": {
      // A group drifts off the column the rest of the card shares.
      const d = lerp(9, 3, subtlety) * (rand() < 0.5 ? -1 : 1);
      flawed.driftX = d;
      flawLabel = `${nouns.drift} sits ${Math.abs(d).toFixed(0)}px ${d > 0 ? "right of" : "left of"} the column everything else uses`;
      break;
    }
    case "spacing": {
      // One gap in the rhythm runs loose.
      const d = lerp(8, 2.5, subtlety);
      flawed.gapDrift = d;
      flawLabel = `the gap above ${nouns.stack} runs ${(clean.gap + d).toFixed(1)}px against the ${clean.gap}px used everywhere else`;
      break;
    }
    case "hierarchy": {
      // The meta line creeps up until it competes with the title.
      const target = lerp(14.2, 12.6, subtlety);
      flawed.leadSize = target;
      flawLabel = `${nouns.meta} grew to ${target.toFixed(1)}px against a ${clean.titleSize}px title, too close to rank`;
      break;
    }
    case "contrast": {
      // Faint enough to fail AA against the card ground. Even the subtlest
      // instance lands at 3.3:1; the "tasteful grey" that fails real people.
      const a = lerp(0.3, 0.5, subtlety);
      flawed.leadAlpha = a;
      flawLabel = `${nouns.meta} sits at ${contrastRatio(a).toFixed(1)}:1 against the card, under the 4.5:1 minimum for body text`;
      break;
    }
    case "radius": {
      // One control forgets the system's corner value.
      const d = lerp(6, 2, subtlety);
      flawed.radiusDrift = d;
      flawLabel = `one of ${nouns.sib} is rounded to ${(clean.radius + d).toFixed(0)}px while its sibling stays at ${clean.radius}px`;
      break;
    }
    case "padding": {
      // The container stops being centred on its own contents.
      const d = lerp(10, 3.5, subtlety);
      flawed.padR = clean.padR + d;
      flawLabel = `the right padding runs ${d.toFixed(1)}px deeper than the left`;
      break;
    }
    case "placement": {
      // An icon stops sitting on the centreline of what it labels.
      const d = lerp(4, 1.5, subtlety) * (rand() < 0.5 ? -1 : 1);
      flawed.nudgeY = d;
      flawLabel = `${nouns.nudge} sits ${Math.abs(d).toFixed(1)}px ${d > 0 ? "below" : "above"} the centreline of what it labels`;
      break;
    }
    case "proximity": {
      // The pair loosens until it stops reading as one thing. Layouts advance
      // by GROUP_GAP rather than this value, so nothing below the pair moves.
      const d = lerp(9, 3.5, subtlety);
      const g = clean.groupGap + d;
      flawed.groupGap = g;
      flawLabel = `${nouns.meta} drifted to ${g.toFixed(1)}px under ${nouns.title} while whole blocks sit ${clean.gap}px apart, and a pair has to be clearly tighter than that to read as one thing`;
      break;
    }
    case "consistency": {
      // One sibling in a set is drawn off-size.
      const d = lerp(5, 1.75, subtlety);
      flawed.iconDrift = d;
      flawLabel = `one icon in ${nouns.iconRow} is drawn at ${(clean.iconSize + d).toFixed(1)}px while the rest are ${clean.iconSize}px`;
      break;
    }
  }

  const cleanEls = layout(archetype, clean, copy);
  const flawedEls = layout(archetype, flawed, copy);
  const cleanIdx: 0 | 1 = rand() < 0.5 ? 0 : 1;

  return {
    type,
    archetype,
    prompt: `Pick the one that's right: ${TYPE_HINT[type]}.`,
    cleanIdx,
    clean: cleanEls,
    flawed: flawedEls,
    flawLabel,
    focus: focusRect(flawedEls, FOCUS_ROLES[type]),
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
