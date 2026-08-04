// Cutout — read a boolean operation off its result.
//
// Two overlapping shapes and one target silhouette; the player names the
// operation that produced it. This is the mental model every vector tool
// depends on (Figma's union/subtract/intersect/exclude, Illustrator's
// Pathfinder), and the part people actually get wrong is order: A minus B is
// a different shape from B minus A, so both are separate answers here.

export type BoolOp =
  | "union"
  | "intersect"
  | "subtract-ab" // A with B removed
  | "subtract-ba" // B with A removed
  | "exclude"; // everything except the overlap

export const BOOL_OPS: BoolOp[] = [
  "union",
  "intersect",
  "subtract-ab",
  "subtract-ba",
  "exclude",
];

export const OP_LABEL: Record<BoolOp, string> = {
  union: "UNION",
  intersect: "INTERSECT",
  "subtract-ab": "A − B",
  "subtract-ba": "B − A",
  exclude: "EXCLUDE",
};

/** What each operation does, in the words a tool's tooltip would use. */
export const OP_HINT: Record<BoolOp, string> = {
  union: "everything both shapes cover",
  intersect: "only where they overlap",
  "subtract-ab": "A, with B cut out of it",
  "subtract-ba": "B, with A cut out of it",
  exclude: "everything except the overlap",
};

export type ShapeKind = "circle" | "rect" | "roundrect" | "triangle";

/** Geometry normalised to a 0..1 box, like the other games. */
export interface Shape {
  kind: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Corner radius for roundrect, as a fraction of the smaller side. */
  r?: number;
}

export interface Round {
  /** The operation that produced the target — i.e. the answer. */
  type: BoolOp;
  prompt: string;
  a: Shape;
  b: Shape;
}

export interface Evaluation {
  correct: boolean;
  /** 0 when correct, 1 when not — feeds the adaptive weighting. */
  errorPct: number;
  points: number;
  tag: "caught" | "missed";
  /** What the player picked, for the side-by-side in the reveal. */
  picked: BoolOp;
}

export const ROUNDS_PER_SESSION = 10;
export const MAX_ROUND_POINTS = 1000;

/** Same shape as Double Take: a correct answer banks BASE, speed adds the rest. */
export const BASE_POINTS = 550;
export const SPEED_WINDOW_MS = 11_000;
