import type { MetaColumn } from "@/lib/leaderboard/api";

/** Board identifier for Double Take scores (must match the server whitelist). */
export const DOUBLETAKE_GAME = "double-take";

/** Extra board columns derived from a Double Take score's `meta` blob. */
export const DOUBLETAKE_COLUMNS: MetaColumn[] = [
  { label: "acc", get: (m) => `${Number(m.acc ?? 0)}%`, width: 44 },
  { label: "streak", get: (m) => Number(m.streak ?? 0), width: 48 },
];
