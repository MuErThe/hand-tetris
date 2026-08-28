"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

const REQUEST_TIMEOUT_MS = 15_000;
const LOCK_WAIT_MS = 8_000;

/**
 * Thrown when the auth lock stays held by another tab past LOCK_WAIT_MS.
 * `isAcquireTimeout` is the flag supabase-js itself sets on its lock-wait
 * errors, so the library's own handling of them applies to ours.
 */
class LockWaitError extends Error {
  readonly isAcquireTimeout = true;
  constructor(name: string) {
    super(`Waited ${LOCK_WAIT_MS}ms for the auth lock "${name}"`);
    this.name = "LockWaitError";
  }
}

/**
 * The auth lock with a ceiling on the wait. supabase-js takes a Web Lock
 * shared by every tab of the origin around each auth call, and for several
 * internal paths (the OAuth hand-off among them) it asks to wait forever.
 * With a request hung in one tab, that froze sign-in everywhere until the
 * tab closed. Same contract as the library's navigatorLock: 0 means "only
 * if free", a positive number is the wait, anything else was "forever" and
 * is capped here.
 */
async function boundedLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  if (typeof navigator === "undefined" || !navigator.locks) return fn();
  if (acquireTimeout === 0) {
    return navigator.locks.request(name, { mode: "exclusive", ifAvailable: true }, (lock) => {
      if (!lock) throw new LockWaitError(name);
      return fn();
    });
  }
  const signal = AbortSignal.timeout(acquireTimeout > 0 ? acquireTimeout : LOCK_WAIT_MS);
  try {
    return await navigator.locks.request(name, { mode: "exclusive", signal }, () => fn());
  } catch (e) {
    if (signal.aborted) throw new LockWaitError(name);
    throw e;
  }
}

/**
 * Returns the Supabase client, or `null` if the env vars are missing.
 * Callers should treat null as "leaderboard offline" and fall back to a
 * local-only experience.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    // Sessions persist so the anonymous auth user (see lib/auth/session)
    // survives reloads; auto-refresh keeps its JWT alive mid-session. PKCE
    // is the OAuth flow that works on a static export: the Google redirect
    // lands back on any page and the client exchanges the code from the URL.
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce",
      lock: boundedLock,
    },
    // The other half of the same failure: supabase-js gives a request no
    // deadline, so a hung one held the lock above until its tab closed. A
    // 15 s deadline fails the request and releases the lock.
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
    },
  });
  return cached;
}

export function leaderboardConfigured(): boolean {
  return getSupabase() !== null;
}
