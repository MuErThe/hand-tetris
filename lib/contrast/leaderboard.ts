import type { MetaColumn } from "@/lib/leaderboard/api";

/** Board identifier for Contrast Call scores (must match the server whitelist). */
export const CONTRAST_GAME = "contrast-call";

/** Extra board columns derived from a Contrast Call score's `meta` blob. */
export const CONTRAST_COLUMNS: MetaColumn[] = [
  { label: "acc", get: (m) => `${Number(m.acc ?? 0)}%`, width: 44 },
  { label: "best", get: (m) => Number(m.best ?? 0) },
];
