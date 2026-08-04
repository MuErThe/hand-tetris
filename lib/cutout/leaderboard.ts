import type { MetaColumn } from "@/lib/leaderboard/api";

/** Board identifier for Cutout scores (must match the server whitelist). */
export const CUTOUT_GAME = "cutout";

/** Extra board columns derived from a Cutout score's `meta` blob. */
export const CUTOUT_COLUMNS: MetaColumn[] = [
  { label: "acc", get: (m) => `${Number(m.acc ?? 0)}%`, width: 44 },
  { label: "right", get: (m) => Number(m.caught ?? 0), width: 46 },
];
