// Double Take: spot the flawed interface. Two renderings of the same card sit
// side by side; exactly one carries a single deliberate defect. The player
// picks the CLEAN one.
//
// Every flaw is one parameterised mutation of the card spec, which is what
// makes the teach-back honest: there is precisely one thing wrong, we know
// which number we moved, and the lesson names that principle. Nothing is
// hand-drawn: the cards are laid out from numbers into positioned elements,
// so difficulty is a magnitude rather than a new asset, and the reveal can
// mark the exact box the mutation moved.

/** The design principle each round tests. One flaw type per round. */
export type FlawType =
  | "alignment" // shared edges must actually share
  | "spacing" // even vertical rhythm
  | "hierarchy" // a decisive size step between ranks
  | "contrast" // body text must clear 4.5:1
  | "radius" // sibling corners share one value
  | "padding" // equal padding on opposite sides
  | "placement" // an icon centred on the text it labels
  | "proximity" // things sit nearest what they belong to
  | "consistency"; // siblings in a set are drawn at one size

export const FLAW_TYPES: FlawType[] = [
  "alignment",
  "spacing",
  "hierarchy",
  "contrast",
  "radius",
  "padding",
  "placement",
  "proximity",
  "consistency",
];

export const TYPE_LABEL: Record<FlawType, string> = {
  alignment: "ALIGNMENT",
  spacing: "SPACING",
  hierarchy: "HIERARCHY",
  contrast: "CONTRAST",
  radius: "RADIUS",
  padding: "PADDING",
  placement: "PLACEMENT",
  proximity: "PROXIMITY",
  consistency: "CONSISTENCY",
};

/** What the player is told to look for. Deliberately never names the answer. */
export const TYPE_HINT: Record<FlawType, string> = {
  alignment: "one of these has an edge that doesn't line up",
  spacing: "one of these has an uneven gap",
  hierarchy: "one of these has a weak size step between title and label",
  contrast: "one of these has text too faint to read comfortably",
  radius: "one of these has mismatched corner rounding",
  padding: "one of these is padded unevenly",
  placement: "one of these has an icon off the centreline of its text",
  proximity: "one of these groups its parts wrongly",
  consistency: "one of these has an icon drawn at the wrong size",
};

/** The five card kinds. Each is a real product surface, laid out from a spec. */
export type Archetype = "profile" | "product" | "player" | "metric" | "notify";

export const ARCHETYPES: Archetype[] = [
  "profile",
  "product",
  "player",
  "metric",
  "notify",
];

/**
 * What an element is *for*, rather than what it looks like. Flaws attach to
 * roles, so the reveal's marker is derived from the laid-out card instead of a
 * hard-coded table: a layout change can't leave the marker pointing at air.
 */
export type Role =
  | "title" // the ranking line
  | "meta" // the subordinate line under it
  | "drift" // the group that shares a column with the rest of the card
  | "stack" // the two blocks bracketing the last gap in the rhythm
  | "iconRow" // a set of sibling icons, drawn at one size
  | "nudge" // an icon centred on the text or container it belongs to
  | "sibA" // the first of two sibling controls that share a radius
  | "sibB"; // the second: the one the radius flaw moves

/**
 * The card, as numbers. Every archetype lays out from this same spec, so a
 * mutation means the same thing whichever card it lands on.
 */
export interface Spec {
  /** Inner padding. Left and right are equal unless the padding flaw fires. */
  padL: number;
  padR: number;
  padT: number;
  /** The rhythm between sections. */
  gap: number;
  /** Added to the LAST gap only: the spacing flaw. */
  gapDrift: number;
  /** Horizontal offset of the "drift" group: the alignment flaw. */
  driftX: number;
  titleSize: number;
  /** Small type everywhere except the title's own partner line. */
  metaSize: number;
  metaAlpha: number;
  /**
   * The line directly under the title gets its own size and opacity. The
   * hierarchy and contrast flaws move these rather than the card-wide values,
   * so exactly one element changes and the reveal's marker matches it.
   */
  leadSize: number;
  leadAlpha: number;
  /** The gap inside a title/meta pair. Tighter than `gap`, or the pair breaks. */
  groupGap: number;
  /** The system corner value. */
  radius: number;
  /** Added to sibB's radius only: the radius flaw. */
  radiusDrift: number;
  /** The system icon size. */
  iconSize: number;
  /** Added to the last icon in a row only: the consistency flaw. */
  iconDrift: number;
  /** Vertical offset of "nudge" icons: the placement flaw. */
  nudgeY: number;
}

/** A rectangle in design-pixel space. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type IconName =
  | "star"
  | "heart"
  | "users"
  | "grid"
  | "play"
  | "skipBack"
  | "skipForward"
  | "arrowUp"
  | "clock"
  | "bell";

export type MotifName = "arcs" | "grid" | "wave" | "blocks";

interface ElBase extends Rect {
  roles?: Role[];
}

/**
 * A laid-out element. The renderer draws these and nothing else, so a new
 * archetype is a new layout function rather than new markup.
 */
export type El =
  | (ElBase & {
      kind: "box";
      fill?: string;
      border?: string;
      radius?: number;
    })
  | (ElBase & {
      kind: "text";
      text: string;
      size: number;
      weight?: number;
      alpha?: number;
      colour?: string;
      align?: "left" | "center" | "right";
      mono?: boolean;
    })
  | (ElBase & {
      kind: "icon";
      icon: IconName;
      colour: string;
      alpha?: number;
    })
  | (ElBase & {
      kind: "art";
      from: string;
      to: string;
      motif: MotifName;
      radius: number;
    })
  | (ElBase & {
      kind: "spark";
      points: number[];
      colour: string;
    });

/**
 * The card's palette is pinned rather than themed. One of the flaws IS a
 * contrast failure, so the ground has to be a constant or the same round would
 * pose a different question in each theme: the same reasoning that keeps the
 * Colour Forge mat fixed.
 */
export const CARD = {
  ground: "#ffffff",
  ink: "#1c1c1a",
  line: "#e4e4e2",
  fill: "#f4f4f2",
  bar: "#d7d7d5",
  border: "#cfcfcd",
} as const;

export interface Tone {
  base: string;
  soft: string;
  deep: string;
}

/**
 * Accent tones, also pinned. Every `base` clears 4.5:1 on the card ground and
 * carries white text, so no tone can be mistaken for the contrast flaw.
 */
export const TONES: Tone[] = [
  { base: "#3b5bdb", soft: "#e8ecfd", deep: "#1f2f8f" }, // indigo
  { base: "#0b7285", soft: "#e0f1f4", deep: "#064450" }, // teal
  { base: "#a61e4d", soft: "#fbe7ee", deep: "#6b0f30" }, // raspberry
  { base: "#5f3dc4", soft: "#ede8fb", deep: "#3a2380" }, // violet
  { base: "#166534", soft: "#e3f2e7", deep: "#0c3d1f" }, // green
  { base: "#9a4b06", soft: "#fdf0e2", deep: "#5e2d02" }, // amber
];

/** The card's copy. Fields are optional because their meaning is archetypal. */
export interface Copy {
  title: string;
  meta: string;
  /** A second body line: the message snippet, the album, the sub-caption. */
  meta2?: string;
  primary?: string;
  secondary?: string;
  badge?: string;
  initials?: string;
  /** The headline figure: a price, a metric, a reading. */
  value?: string;
  /** Small value/label pairs: stat cells, footnotes. */
  facts?: [string, string][];
  time?: string;
  tone: number;
  motif?: MotifName;
  /** Sparkline samples, 0..1. */
  spark?: number[];
}

export interface Round {
  type: FlawType;
  archetype: Archetype;
  prompt: string;
  /** Which panel is the clean one. */
  cleanIdx: 0 | 1;
  clean: El[];
  flawed: El[];
  /** Plain-language statement of what was wrong, for the reveal. */
  flawLabel: string;
  /** Region of the flawed panel to mark up in the reveal. */
  focus: Rect;
  /** 0 = obvious … 1 = as subtle as this flaw gets. */
  subtlety: number;
}

export interface Evaluation {
  correct: boolean;
  /** 0 when correct, 1 when not: feeds the adaptive weighting. */
  errorPct: number;
  points: number;
  /** Lesson lookup key. */
  tag: "caught" | "missed";
  detail: string;
}

export const PANEL_W = 280;
export const PANEL_H = 212;

export const ROUNDS_PER_SESSION = 10;
export const MAX_ROUND_POINTS = 1000;

/**
 * A correct answer always banks BASE; the rest decays with time taken, so a
 * confident read beats a laboured one without punishing careful looking.
 * A wrong answer scores nothing: there is no partial credit for picking the
 * broken one.
 */
export const BASE_POINTS = 550;
export const SPEED_WINDOW_MS = 11_000;
