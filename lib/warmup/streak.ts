"use client";

// Daily warm-up streak. Calendar-day based in the player's local timezone, with
// one grace day so a single missed day doesn't reset the count. Local-only.

const KEY = "arcade/v1/warmup-streak";

export interface StreakData {
  count: number;
  lastDay: number; // local day number (days since epoch, local midnight)
  /** Local day numbers actually played, most recent last. Capped. */
  days?: number[];
}

// History kept for the flame week and any future calendar; older days fall
// off. Optional so data saved before it existed still parses.
const DAYS_KEPT = 30;

/** Days since the Unix epoch at the given date's LOCAL midnight. */
export function localDayNumber(d = new Date()): number {
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(midnight.getTime() / 86_400_000);
}

function load(): StreakData | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.count === "number" && typeof p?.lastDay === "number") {
      const days = Array.isArray(p.days)
        ? p.days.filter((d: unknown): d is number => typeof d === "number")
        : undefined;
      return { count: p.count, lastDay: p.lastDay, ...(days ? { days } : {}) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function save(d: StreakData): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

/**
 * The streak as it stands today: the stored count if it's still alive (played
 * today, yesterday, or within the one grace day), otherwise 0.
 */
export function currentStreak(): number {
  const s = load();
  if (!s) return 0;
  const gap = localDayNumber() - s.lastDay;
  return gap <= 2 ? s.count : 0;
}

/** True if today's warm-up is already done. */
export function doneToday(): boolean {
  const s = load();
  return !!s && s.lastDay === localDayNumber();
}

/**
 * Record that today's warm-up is complete and return the new streak count.
 * Idempotent within a day.
 */
export function recordToday(): number {
  const today = localDayNumber();
  const s = load();
  if (!s) {
    save({ count: 1, lastDay: today, days: [today] });
    markDirty();
    return 1;
  }
  if (s.lastDay === today) return s.count;
  const gap = today - s.lastDay;
  // gap 1 = yesterday, gap 2 = one missed day (forgiven). Otherwise reset.
  const count = gap === 1 || gap === 2 ? s.count + 1 : 1;
  save({ count, lastDay: today, days: withDay(s.days, today) });
  markDirty();
  return count;
}

/** `days` plus one more, deduplicated, sorted, trimmed to DAYS_KEPT. */
export function withDay(days: number[] | undefined, day: number): number[] {
  return Array.from(new Set([...(days ?? []), day]))
    .sort((a, b) => a - b)
    .slice(-DAYS_KEPT);
}

/**
 * The played days as a stable string ("20510,20511"), for
 * useSyncExternalStore, which needs snapshots that compare equal when
 * nothing changed. The legacy lastDay counts as played even without history.
 */
export function playedDaysKey(): string {
  const s = load();
  if (!s) return "";
  return withDay(s.days, s.lastDay).join(",");
}

// Nudges the account syncer (lib/auth/sync listens; an event rather than an
// import so this store stays dependency-free).
function markDirty(): void {
  try {
    window.dispatchEvent(new Event("arcade:state-dirty"));
  } catch {
    /* ignore */
  }
}

/** The stored streak as-is, alive or not (account sync). */
export function rawStreak(): StreakData | null {
  return load();
}

/**
 * Overwrite the stored streak with a merged one (account sync). Deliberately
 * does NOT nudge the syncer: sync-driven writes must not re-trigger a push.
 */
export function replaceStreak(d: StreakData): void {
  save(d);
}
