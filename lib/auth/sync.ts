"use client";

// Accounts, phase 3: cross-device sync for logged-in (Google) players. One
// account_state row per auth user mirrors the arcade identity, warm-up
// streak and per-game progress. Guests and anonymous sessions stay purely
// local. Merges are conservative, and a pull never destroys local history:
// streaks combine (a later day on another device extends the count),
// progress unions by session timestamp, and this device's identity is
// adopted from the account only when there is none here yet.

import { getSupabase } from "@/lib/leaderboard/supabase";
import { loadStoredPlayer, saveStoredPlayer } from "@/lib/leaderboard/local";
import {
  loadSessions,
  replaceSessions,
  sanitizeSessions,
  type SessionRecord,
} from "@/lib/learning/progress";
import {
  localDayNumber,
  rawStreak,
  replaceStreak,
  type StreakData,
} from "@/lib/warmup/streak";
import { CATALOGUE } from "@/lib/games/registry";

/** The logged-in (non-anonymous) user id, or null. Never creates a session. */
async function accountUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    return u && !u.is_anonymous ? u.id : null;
  } catch {
    return null;
  }
}

function parseStreak(value: unknown): StreakData | null {
  const s = value as { count?: unknown; lastDay?: unknown } | null | undefined;
  return s && typeof s.count === "number" && typeof s.lastDay === "number"
    ? { count: s.count, lastDay: s.lastDay }
    : null;
}

/**
 * Two devices, one streak. When both are alive, a later play-day on one
 * device extends the other's longer run; otherwise the living (or longer)
 * streak wins.
 */
function mergeStreak(
  a: StreakData | null,
  b: StreakData | null,
  today: number,
): StreakData | null {
  if (!a) return b;
  if (!b) return a;
  const alive = (s: StreakData) => today - s.lastDay <= 2;
  if (alive(a) && alive(b)) {
    if (a.lastDay === b.lastDay) return a.count >= b.count ? a : b;
    const early = a.lastDay < b.lastDay ? a : b;
    const late = a.lastDay < b.lastDay ? b : a;
    return { count: Math.max(late.count, early.count + 1), lastDay: late.lastDay };
  }
  if (alive(a)) return a;
  if (alive(b)) return b;
  return a.count >= b.count ? a : b;
}

/** Union by session timestamp, oldest→newest (replaceSessions trims). */
function mergeSessions(
  local: SessionRecord[],
  remote: SessionRecord[],
): SessionRecord[] {
  const byAt = new Map<number, SessionRecord>();
  for (const s of [...remote, ...local]) byAt.set(s.at, s);
  return [...byAt.values()].sort((x, y) => x.at - y.at);
}

/** Mirror the current local state up to the account row. */
export async function pushState(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await accountUserId();
  if (!uid) return;
  const progress: Record<string, SessionRecord[]> = {};
  for (const g of CATALOGUE) {
    const sessions = loadSessions(g.id);
    if (sessions.length > 0) progress[g.id] = sessions;
  }
  try {
    await sb.from("account_state").upsert({
      user_id: uid,
      player: loadStoredPlayer(),
      streak: rawStreak() ?? {},
      progress,
    });
  } catch {
    /* offline: the next dirty nudge retries */
  }
}

/**
 * On login (or returning to a page already logged in): pull the account
 * row, merge it into local state, and push the merged result back.
 */
export async function syncOnLogin(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await accountUserId();
  if (!uid) return;
  try {
    const { data, error } = await sb
      .from("account_state")
      .select("player, streak, progress")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return;

    if (data) {
      // Identity: adopt the account's only when this device has none.
      const p = data.player as { name?: unknown; token?: unknown } | null;
      if (
        p &&
        typeof p.name === "string" &&
        typeof p.token === "string" &&
        !loadStoredPlayer()
      ) {
        saveStoredPlayer({ name: p.name, token: p.token });
      }

      const streak = mergeStreak(
        rawStreak(),
        parseStreak(data.streak),
        localDayNumber(),
      );
      if (streak) replaceStreak(streak);

      const remoteProgress = (data.progress ?? {}) as Record<string, unknown>;
      for (const g of CATALOGUE) {
        const remote = sanitizeSessions(remoteProgress[g.id]);
        if (remote.length === 0) continue;
        replaceSessions(g.id, mergeSessions(loadSessions(g.id), remote));
      }
    }

    await pushState();
  } catch {
    /* ignore: purely additive, local play is unaffected */
  }
}

// Debounced push whenever a game or the warm-up records something. The
// stores dispatch "arcade:state-dirty" instead of importing this module,
// so the dependency only points one way.
let pushTimer: number | undefined;

export function schedulePush(): void {
  if (typeof window === "undefined") return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    void pushState();
  }, 3000);
}

if (typeof window !== "undefined") {
  window.addEventListener("arcade:state-dirty", schedulePush);
}
