import type { MetaColumn } from "@/lib/leaderboard/api";

/** Board identifier for Steady Hand scores (must match the server whitelist). */
export const STEADYHAND_GAME = "steady-hand";

/** Extra board columns derived from a Steady Hand score's `meta` blob. */
export const STEADYHAND_COLUMNS: MetaColumn[] = [
  { label: "acc", get: (m) => `${Number(m.acc ?? 0)}%`, width: 44 },
  { label: "best", get: (m) => Number(m.best ?? 0) },
];
