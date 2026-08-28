"use client";

// Accounts: a silent anonymous auth session underneath the existing
// name+token identity, replaced by "Continue with Google", which inherits
// the name+token history through claim_legacy_player. The
// session is created lazily on first real play; never on page load, which
// would mint an auth user for every visitor, and the player row is linked
// to it so the log-in inherits the history. Everything here fails soft: no
// session means no linking, and the guest flow carries on untouched.

import { getSupabase } from "@/lib/leaderboard/supabase";
import type { StoredPlayer } from "@/lib/leaderboard/local";

// `${uid}:${name}` of the last successful claim. Scoped to the auth uid so
// a sign-out, account switch, or new device self-heals: a different uid
// doesn't match the stamp and the claim is simply retried.
const CLAIMED_KEY = "arcade/v1/auth-claimed";

/**
 * The current auth user id, creating an anonymous session if none exists.
 * Null when Supabase is unconfigured, unreachable, or anonymous sign-ins
 * are disabled in the dashboard: callers carry on with the legacy flow.
 */
export async function ensureSession(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: anon, error } = await sb.auth.signInAnonymously();
    if (error || !anon.session) return null;
    return anon.session.user.id;
  } catch {
    return null;
  }
}

/**
 * Link a name+token identity to the auth user so history survives a Google
 * log-in. Fire-and-forget: never throws, safe to re-run, remembers success
 * locally so the RPC isn't repeated every game.
 */
export async function linkPlayerToSession(player: StoredPlayer): Promise<void> {
  if (player.token === "local") return;
  const uid = await ensureSession();
  if (!uid) return;
  const stamp = `${uid}:${player.name}`;
  try {
    if (window.localStorage.getItem(CLAIMED_KEY) === stamp) return;
  } catch {
    /* ignore */
  }
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { error } = await sb.rpc("claim_legacy_player", {
      p_name: player.name,
      p_token: player.token,
    });
    if (!error) {
      try {
        window.localStorage.setItem(CLAIMED_KEY, stamp);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Send the player to Google and return here via redirect; the supabase
 * client picks the session out of the URL on return. Always a plain
 * sign-in, never linkIdentity: an anonymous session owns nothing the
 * name+token claim (claim_legacy_player) doesn't carry across, and the
 * link can only fail on the way back, costing a second trip through Google.
 */
export async function signInWithGoogle(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
  } catch {
    /* provider not configured: the row stays as it was */
  }
}

/** Sign out on this device. Guest play (name + token) continues unaffected. */
export async function signOutAccount(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch {
    /* ignore */
  }
}
