// Double Take — spot the flawed interface. Two renderings of the same card sit
// side by side; exactly one carries a single deliberate defect. The player
// picks the CLEAN one.
//
// Every flaw is one parameterised mutation of the mock spec, which is what
// makes the teach-back honest: there is precisely one thing wrong, we know
// which number we moved, and the lesson names that principle. Nothing is
// hand-drawn, so difficulty is a magnitude rather than a new asset.

/** The design principle each round tests. One flaw type per round. */
export type FlawType =
  | "alignment" // shared edges must actually share
  | "spacing" // even vertical rhythm
  | "hierarchy" // a decisive size step between ranks
  | "contrast" // body text must clear 4.5:1
  | "radius" // sibling corners share one value
  | "padding"; // equal padding on opposite sides

export const FLAW_TYPES: FlawType[] = [
  "alignment",
  "spacing",
  "hierarchy",
  "contrast",
  "radius",
  "padding",
];

export const TYPE_LABEL: Record<FlawType, string> = {
  alignment: "ALIGNMENT",
  spacing: "SPACING",
  hierarchy: "HIERARCHY",
  contrast: "CONTRAST",
  radius: "RADIUS",
  padding: "PADDING",
};

/** What the player is told to look for. Deliberately never names the answer. */
export const TYPE_HINT: Record<FlawType, string> = {
  alignment: "one of these has an edge that doesn't line up",
  spacing: "one of these has an uneven gap",
  hierarchy: "one of these has a weak size step between title and label",
  contrast: "one of these has text too faint to read comfortably",
  radius: "one of these has mismatched corner rounding",
  padding: "one of these is padded unevenly",
};

/**
 * The card, as numbers. Rendered at PANEL_W × PANEL_H design pixels, so these
 * are plain px — no scaling, so text stays crisp.
 */
export interface Mock {
  /** Inner padding. Equal left/right unless the padding flaw fires. */
  padL: number;
  padR: number;
  /** The two gaps in the body-line stack. Equal unless spacing fires. */
  gaps: [number, number];
  /** Body lines' left offset from the content column. 0 unless alignment fires. */
  bodyIndent: number;
  /** Type sizes. The step between them is the hierarchy. */
  titleSize: number;
  subSize: number;
  /** Subtitle ink opacity — the contrast axis. */
  subAlpha: number;
  /** The two buttons' corner radii. Equal unless radius fires. */
  btnRadius: [number, number];
  /** Body line widths as fractions of the content column. */
  lineW: [number, number, number];
}

/** The card's copy — fixed strings, so the judgement is never about reading. */
export interface Copy {
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
}

/** A rectangle in design-pixel space, used to mark the flaw in the reveal. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Round {
  type: FlawType;
  prompt: string;
  copy: Copy;
  /** Which panel is the clean one. */
  cleanIdx: 0 | 1;
  clean: Mock;
  flawed: Mock;
  /** Plain-language statement of what was wrong, for the reveal. */
  flawLabel: string;
  /** Region of the flawed panel to mark up in the reveal. */
  focus: Rect;
  /** 0 = obvious … 1 = as subtle as this flaw gets. */
  subtlety: number;
}

export interface Evaluation {
  correct: boolean;
  /** 0 when correct, 1 when not — feeds the adaptive weighting. */
  errorPct: number;
  points: number;
  /** Lesson lookup key. */
  tag: "caught" | "missed";
  detail: string;
}

export const PANEL_W = 280;
export const PANEL_H = 200;

export const ROUNDS_PER_SESSION = 10;
export const MAX_ROUND_POINTS = 1000;

/**
 * A correct answer always banks BASE; the rest decays with time taken, so a
 * confident read beats a laboured one without punishing careful looking.
 * A wrong answer scores nothing — there is no partial credit for picking the
 * broken one.
 */
export const BASE_POINTS = 550;
export const SPEED_WINDOW_MS = 11_000;
