import type { MetaColumn } from "@/lib/leaderboard/api";
import type { VignetteKind } from "@/components/arcade/Vignette";
import { EYEBALL_COLUMNS, EYEBALL_GAME } from "@/lib/eyeball/leaderboard";
import { KERN_COLUMNS, KERN_GAME } from "@/lib/kern/leaderboard";
import { COLOUR_COLUMNS, COLOUR_GAME } from "@/lib/colour/leaderboard";
import { TETRIS_COLUMNS, TETRIS_GAME } from "@/lib/tetris/leaderboard";
import {
  DOUBLETAKE_COLUMNS,
  DOUBLETAKE_GAME,
} from "@/lib/doubletake/leaderboard";
import {
  CONTRAST_COLUMNS,
  CONTRAST_GAME,
} from "@/lib/contrast/leaderboard";
import {
  STEADYHAND_COLUMNS,
  STEADYHAND_GAME,
} from "@/lib/steadyhand/leaderboard";
import { CUTOUT_COLUMNS, CUTOUT_GAME } from "@/lib/cutout/leaderboard";

/**
 * The one description of what games exist.
 *
 * Everything that needs to enumerate games reads this: the hub bento, the
 * daily warm-up rotation, the /about catalogue, the root JSON-LD feature
 * list, each route's SEO metadata, and app/sitemap.ts.
 *
 * ADDING A GAME — the checklist:
 *   1. Add an entry below (in hub order — see the note on ordering).
 *   2. Create app/<path>/page.tsx and app/<path>/layout.tsx (the layout just
 *      re-exports metadataFor(id); see any existing game layout).
 *   3. If it is scored, add the game id to the whitelist in the
 *      `submit_game_score` function in supabase/schema.sql AND apply that
 *      change to the live database — the server rejects unknown ids.
 *   4. Add it to the "## Games" list in public/llms.txt.
 * Steps 3 and 4 are the two that cannot be derived from here: one lives in
 * the database, the other is prose.
 */

export type GameId =
  | "tetris"
  | "eyeball-it"
  | "kern-combat"
  | "colour-forge"
  | "thirty-circles"
  | "double-take"
  | "contrast-call"
  | "steady-hand"
  | "cutout";

export interface GameDef {
  id: GameId;
  /** Route path, no trailing slash. Trailing slashes are added where needed. */
  path: string;
  /** Prose name, e.g. "Eyeball It" — for metadata, /about and structured data. */
  name: string;
  /** Hub wordmark, split so the trailing word can take the accent colour. */
  title: string;
  titleAccent: string;
  /** Join the two halves with no space — for one-word names like CUTOUT. */
  titleTight?: boolean;
  /** `grid-area` name in .hub-bento (see app/globals.css). */
  area: string;
  /** Skill trained, short form — hub cards and warm-up steps. */
  trains: string;
  /** Skill trained, long form — the /about catalogue. */
  trainsLong: string;
  /** One-line pitch on the hub card. */
  blurb: string;
  /** Paragraph explaining how it works — /about. */
  how: string;
  /** CSS var for the card's accent tint. */
  tint: string;
  vignette: VignetteKind;
  /** Gets the large hub cell. */
  featured: boolean;
  /** Keeps local practice history, which enables the card's trend footer. */
  tracksProgress: boolean;
  /** Suffix for the best-score readout on the hub card, e.g. "/30". */
  unit?: string;
  /** Part of the daily warm-up rotation; `unit` is the per-round readout. */
  warmUp: { unit: string } | null;
  /** Scored to a server leaderboard. The board id is always the game id. */
  leaderboard: { columns: MetaColumn[] } | null;
  meta: { title: string; description: string };
  sitemapPriority: number;
}

/**
 * Hub/DOM order. This is also the keyboard tab order through the bento, so it
 * deliberately tracks the visual reading order rather than the catalogue
 * order — the grid places cards by `area`, not by position in this array.
 */
export const GAMES: GameDef[] = [
  {
    id: TETRIS_GAME,
    path: "/tetris",
    name: "Hand Tetris",
    title: "Hand",
    titleAccent: "Tetris",
    area: "tetris",
    trains: "spatial planning · hand–eye",
    trainsLong: "spatial planning and hand–eye coordination",
    blurb:
      "Stack falling blocks with your bare hands — your webcam is the controller.",
    how: "Tetris steered entirely by hand gestures through your webcam — slide to steer, pinch to rotate, dip to drop. All tracking runs on-device.",
    tint: "var(--c-I)",
    vignette: "tetris",
    featured: true,
    tracksProgress: false,
    warmUp: null,
    leaderboard: { columns: TETRIS_COLUMNS },
    meta: {
      title: "Hand Tetris — play Tetris with your hands",
      description:
        "Gesture-controlled Tetris in the browser: steer with your hand, pinch to rotate, dip to drop. Webcam hand tracking runs entirely on-device — video never leaves your browser.",
    },
    sitemapPriority: 0.7,
  },
  {
    id: EYEBALL_GAME,
    path: "/eyeball-it",
    name: "Eyeball It",
    title: "Eyeball",
    titleAccent: "It",
    area: "eyeball",
    trains: "the trained eye",
    trainsLong: "visual accuracy — the trained eye",
    blurb:
      "Bisect, centre and align by feel, then see your error measured in pixels.",
    how: "Bisect lines, centre dots, judge angles, find thirds and the golden section purely by eye. Every round reveals the truth with a design-spec redline showing your error, plus the principle behind the miss (like why optical centre sits above geometric centre).",
    tint: "var(--c-S)",
    vignette: "eyeball",
    featured: false,
    tracksProgress: true,
    warmUp: { unit: "%" },
    leaderboard: { columns: EYEBALL_COLUMNS },
    meta: {
      title: "Eyeball It — train visual accuracy",
      description:
        "Bisect lines, centre shapes, judge angles and find the golden ratio by eye — scored on pixel error with design-spec redlines showing exactly how close you were. Free, in the browser.",
    },
    sitemapPriority: 0.9,
  },
  {
    id: KERN_GAME,
    path: "/kern-combat",
    name: "Kern Combat",
    title: "Kern",
    titleAccent: "Combat",
    area: "kern",
    trains: "typographic craft",
    trainsLong: "typographic craft — letter spacing",
    blurb:
      "Space letters until they look right — graded against a typographer's eye.",
    how: "Drag letters until every gap feels even, then see the font's true kerning ghosted under your attempt with per-gap deviation marks. Teaches the optical rules: open pairs nest, rounds tuck in, straight stems need air.",
    tint: "var(--c-T)",
    vignette: "kern",
    featured: false,
    tracksProgress: true,
    warmUp: { unit: "%" },
    leaderboard: { columns: KERN_COLUMNS },
    meta: {
      title: "Kern Combat — a kerning game for typographers",
      description:
        "Drag letters until the spacing feels even, then grade your eye against the typeface's own kerning metrics. Learn the optical rules of letter spacing — open pairs, rounds and straights.",
    },
    sitemapPriority: 0.9,
  },
  {
    id: COLOUR_GAME,
    path: "/colour-forge",
    name: "Colour Forge",
    title: "Colour",
    titleAccent: "Forge",
    area: "colour",
    trains: "colour perception",
    trainsLong: "colour perception",
    blurb:
      "Mix to match a target colour and learn which way your own eye tends to lie.",
    how: "Mix hue, saturation and lightness to match a target — sometimes from memory, sometimes finding the complement. Scored perceptually (CIEDE2000) with a signed per-channel breakdown of which way your eye lies.",
    tint: "var(--c-Z)",
    vignette: "colour",
    featured: false,
    tracksProgress: true,
    warmUp: { unit: "%" },
    leaderboard: { columns: COLOUR_COLUMNS },
    meta: {
      title: "Colour Forge — train colour perception",
      description:
        "Mix HSL colours to match a target, from memory or by complement — scored with the perceptual CIEDE2000 formula and a per-channel breakdown of which way your eye lies.",
    },
    sitemapPriority: 0.9,
  },
  {
    id: "thirty-circles",
    path: "/thirty-circles",
    name: "Thirty Circles",
    title: "Thirty",
    titleAccent: "Circles",
    area: "circles",
    trains: "divergent thinking",
    trainsLong: "divergent thinking",
    blurb:
      "Thirty circles, thirty different things, one ticking clock. Beat the blank page.",
    how: "The classic creativity sprint: thirty circles, three minutes, a different thing in each. Draw with your webcam-tracked hand or a mouse; end with a reflection on fluency, flexibility and originality, and go again with a self-imposed constraint.",
    tint: "var(--c-J)",
    vignette: "circles",
    featured: false,
    tracksProgress: true,
    unit: "/30",
    warmUp: { unit: "/6" },
    // Not scored to a server board — the sprint is judged by the player.
    leaderboard: null,
    meta: {
      title: "Thirty Circles — the divergent thinking exercise",
      description:
        "The classic IDEO creativity warm-up: turn thirty circles into thirty different things in three minutes. Draw with your webcam-tracked hand or a mouse, then reflect on fluency, flexibility and originality.",
    },
    sitemapPriority: 0.9,
  },
  {
    id: DOUBLETAKE_GAME,
    path: "/double-take",
    name: "Double Take",
    title: "Double",
    titleAccent: "Take",
    area: "double",
    trains: "the critical eye",
    trainsLong: "the critical eye — spotting what's off",
    blurb:
      "Two versions of the same card. One is wrong. Prove you can still tell.",
    how: "Two renderings of one interface sit side by side and exactly one carries a single deliberate flaw — a broken alignment, an uneven gap, a weak size step, text under 4.5:1, a stray corner radius, lopsided padding. Pick the clean one; the flaw is then named and measured, with the principle behind it. The flaws get subtler as the session goes on.",
    tint: "var(--c-O)",
    vignette: "eyeball",
    featured: false,
    tracksProgress: true,
    warmUp: { unit: "%" },
    leaderboard: { columns: DOUBLETAKE_COLUMNS },
    meta: {
      title: "Double Take — spot the flawed interface",
      description:
        "Two versions of the same UI card, one with a single deliberate flaw: misalignment, uneven spacing, weak hierarchy, text under 4.5:1 contrast, a mismatched radius or lopsided padding. Spot the clean one, then see the flaw named and measured.",
    },
    sitemapPriority: 0.9,
  },
  {
    id: CONTRAST_GAME,
    path: "/contrast-call",
    name: "Contrast Call",
    title: "Contrast",
    titleAccent: "Call",
    area: "contrast",
    trains: "contrast judgement",
    trainsLong: "contrast judgement — reading legibility by eye",
    blurb:
      "How much contrast is that, really? Call the ratio before the checker does.",
    how: "A colour pair is shown as real text; you place your call on a logarithmic rail running 1:1 to 21:1, with the WCAG thresholds marked. The true ratio is then revealed along with whether it passes AA or AAA. Rounds rotate through greyscale, warm and cool hues, clashing opposites, pairs straddling 4.5:1, and the compressed ends of the scale — each targeting a specific way the eye misreads contrast.",
    tint: "var(--c-J)",
    vignette: "colour",
    featured: false,
    tracksProgress: true,
    warmUp: { unit: "%" },
    leaderboard: { columns: CONTRAST_COLUMNS },
    meta: {
      title: "Contrast Call — guess the WCAG contrast ratio",
      description:
        "Train your eye for accessible contrast: read a colour pair and call its WCAG ratio on a logarithmic rail, then see the true number and whether it clears AA or AAA. Covers warm and cool bias, clashing hues and the 4.5:1 threshold.",
    },
    sitemapPriority: 0.9,
  },
  {
    id: STEADYHAND_GAME,
    path: "/steady-hand",
    name: "Steady Hand",
    title: "Steady",
    titleAccent: "Hand",
    area: "steady",
    trains: "hand control",
    trainsLong: "hand control — tracing a line you can see",
    blurb:
      "Eight curves, one stroke each. No undo, no easing — just how steady you are.",
    how: "A Bézier curve is drawn on the artboard and you trace it in a single stroke, starting at the marker. Deviation and coverage are scored separately, so a confident inch doesn't pass as a finished curve, and the reveal distinguishes drifting off a consistent line from an unsteady one. The curve types — arc, S-curve, tight radius, long sweep, hook and wave — each break a different part of hand control.",
    tint: "var(--c-L)",
    vignette: "eyeball",
    featured: false,
    tracksProgress: true,
    warmUp: { unit: "%" },
    leaderboard: { columns: STEADYHAND_COLUMNS },
    meta: {
      title: "Steady Hand — trace the Bézier curve",
      description:
        "Trace a Bézier curve in a single stroke and find out how steady your hand really is. Scored on deviation and coverage, with corner-cutting and drift measured separately across arcs, S-curves, tight radii, sweeps, hooks and waves.",
    },
    sitemapPriority: 0.9,
  },
  {
    id: CUTOUT_GAME,
    path: "/cutout",
    name: "Cutout",
    title: "Cut",
    titleAccent: "out",
    titleTight: true,
    area: "cutout",
    trains: "boolean thinking",
    trainsLong: "boolean thinking — how shapes combine",
    blurb:
      "Two shapes in, one shape out. Name the operation that got you there.",
    how: "Two overlapping shapes are shown alongside the silhouette one boolean operation produced; you name the operation. Union, intersect and exclude are there, and so are both subtractions — A minus B is a different shape from B minus A, and telling them apart is the part people actually get wrong. A wrong answer shows what your operation would have made, next to what was asked for.",
    tint: "var(--c-T)",
    vignette: "boolean",
    featured: false,
    tracksProgress: true,
    warmUp: { unit: "%" },
    leaderboard: { columns: CUTOUT_COLUMNS },
    meta: {
      title: "Cutout — learn boolean shape operations",
      description:
        "Train the mental model behind Figma's union, subtract, intersect and exclude: see two overlapping shapes and the silhouette one operation produced, then name it. Both subtraction orders included, because that is the one people get wrong.",
    },
    sitemapPriority: 0.9,
  },
];

const BY_ID = new Map(GAMES.map((g) => [g.id, g]));

export function game(id: GameId): GameDef {
  const g = BY_ID.get(id);
  if (!g) throw new Error(`Unknown game id: ${id}`);
  return g;
}

/** Route metadata for a game — spread into a route layout's `metadata`. */
export function metadataFor(id: GameId) {
  const { meta } = game(id);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: "./" },
  };
}

/** The hub wordmark as one string, e.g. "EYEBALL IT". */
export function wordmark(g: GameDef): string {
  return `${g.title} ${g.titleAccent}`;
}

/**
 * Prose order — skill games first, Tetris last, because Tetris is the
 * heritage game rather than a training exercise. Used by /about.
 */
export const CATALOGUE: GameDef[] = [
  "eyeball-it",
  "kern-combat",
  "colour-forge",
  "contrast-call",
  "double-take",
  "steady-hand",
  "cutout",
  "thirty-circles",
  "tetris",
].map((id) => game(id as GameId));

/** The full warm-up pool, in the order the steps are played. */
export const WARM_UP_GAMES: (GameDef & { warmUp: { unit: string } })[] =
  GAMES.filter(
    (g): g is GameDef & { warmUp: { unit: string } } => g.warmUp !== null,
  );

/**
 * The day's warm-up: `count` games drawn deterministically from the pool,
 * seeded by a local day number (see lib/warmup/streak) so everyone gets the
 * same set on a given day. Pool order is preserved within the set, keeping
 * the ritual's five-minute claim honest while every game still cycles in.
 */
export function dailyWarmUpGames(
  dayNumber: number,
  count = 4,
): (GameDef & { warmUp: { unit: string } })[] {
  // mulberry32, seeded by the day number
  let s = dayNumber | 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pool = [...WARM_UP_GAMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = new Set(pool.slice(0, count).map((g) => g.id));
  return WARM_UP_GAMES.filter((g) => chosen.has(g.id));
}
