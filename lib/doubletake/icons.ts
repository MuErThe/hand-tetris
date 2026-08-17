// Glyphs for the Double Take cards. Drawn rather than imported so the cards
// stay self-contained and every icon is a plain path on a 24-unit grid: the
// consistency flaw scales one of them, and a scaled path stays crisp where a
// bitmap would not.

import type { IconName } from "./types";

export interface Glyph {
  d: string;
  /** Filled glyphs read as solid marks; stroked ones as outlines. */
  filled: boolean;
}

export const GLYPHS: Record<IconName, Glyph> = {
  star: {
    d: "M12 3.4l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9z",
    filled: true,
  },
  heart: {
    d: "M12 20.4l-1.5-1.4C5.3 14.3 2.4 11.7 2.4 8.5 2.4 5.9 4.4 3.9 7 3.9c1.5 0 2.9.7 3.8 1.8.9-1.1 2.3-1.8 3.8-1.8 2.6 0 4.6 2 4.6 4.6 0 3.2-2.9 5.8-8.1 10.5z",
    filled: true,
  },
  users: {
    d: "M15.5 20v-1.6a3.8 3.8 0 00-3.8-3.8H6.8A3.8 3.8 0 003 18.4V20M9.2 4.5a3.4 3.4 0 110 6.8 3.4 3.4 0 010-6.8M16.6 4.9a3.4 3.4 0 010 6.1M21 20v-1.6a3.8 3.8 0 00-2.9-3.7",
    filled: false,
  },
  grid: {
    d: "M4 4h6.2v6.2H4zM13.8 4H20v6.2h-6.2zM4 13.8h6.2V20H4zM13.8 13.8H20V20h-6.2z",
    filled: false,
  },
  play: { d: "M7.5 4.8l12 7.2-12 7.2z", filled: true },
  skipBack: {
    d: "M18.5 4.8v14.4L8 12zM4.5 4.8h2.6v14.4H4.5z",
    filled: true,
  },
  skipForward: {
    d: "M5.5 4.8v14.4L16 12zM16.9 4.8h2.6v14.4h-2.6z",
    filled: true,
  },
  arrowUp: { d: "M12 20V5M5.6 11.4L12 5l6.4 6.4", filled: false },
  clock: {
    d: "M12 21a9 9 0 110-18 9 9 0 010 18zM12 6.8v5.5l3.6 2.1",
    filled: false,
  },
  bell: {
    d: "M18.4 15.6V10a6.4 6.4 0 10-12.8 0v5.6L3.4 18.6h17.2zM9.6 21.2a2.6 2.6 0 004.8 0",
    filled: false,
  },
};
