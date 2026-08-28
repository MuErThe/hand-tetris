"use client";

// Accounts: a silent anonymous auth session underneath the existing
// name+token identity, upgraded in place by "Continue with Google". The
// session is created lazily on first real play; never on page load, which
// would mint an auth user for every visitor, and the player row is linked
// to it so the log-in inherits the history. Everything here fails soft: no
// session means no linking, and the guest flow carries on untouched.

import { getSupabase } from "@/lib/leaderboard/supabase";
import { loadStoredPlayer, type StoredPlayer } from "@/lib/leaderboard/local";

// `${uid}:${name}` of the last successful claim. Scoped to the auth uid so
// a sign-out, account switch, or new device self-heals: a different uid
// doesn't match the stamp and the claim is simply retried.
const CLAIMED_KEY = "arcade/v1/auth-claimed";

// Set once a linkIdentity attempt on this device came back with
// identity_already_exists: the Google account is known, so later log-ins
// skip the link attempt and its second trip through Google.
const KNOWN_KEY = "arcade/v1/auth-known";

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

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

/** The current page without query or hash: where Google sends us back. */
function returnUrl(): string {
  return window.location.origin + window.location.pathname;
}

/**
 * Send the player to Google. An anonymous session upgrades IN PLACE via
 * linkIdentity: same user id, history intact. If that Google identity
 * already belongs to an existing account, Supabase can only tell us on the
 * way back (see resumeGoogleSignIn), so the fallback to a plain sign-in
 * happens there. The link is only attempted when it can save something: a
 * reserved name on this device and no earlier proof that the Google account
 * already exists. Both paths leave for Google and return here via redirect;
 * the supabase client picks the session out of the URL on return.
 */
export async function signInWithGoogle(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const options = { redirectTo: returnUrl() };
  try {
    const { data } = await sb.auth.getSession();
    const worthLinking =
      data.session?.user.is_anonymous &&
      !readFlag(KNOWN_KEY) &&
      (loadStoredPlayer()?.token ?? "local") !== "local";
    if (worthLinking) {
      const { error } = await sb.auth.linkIdentity({ provider: "google", options });
      if (!error) return; // navigating away
    }
    await sb.auth.signInWithOAuth({ provider: "google", options });
  } catch {
    /* provider not configured: the row stays as it was */
  }
}

/**
 * Finish a Google log-in that linkIdentity couldn't. When the Google
 * identity already belongs to an existing account, the redirect lands back
 * here with `error_code=identity_already_exists` and no session change.
 * Retry as a plain sign-in to that account; the anonymous session is
 * replaced. Call once on mount; a no-op unless that error is in the URL.
 */
let resumed = false;
export async function resumeGoogleSignIn(): Promise<void> {
  if (resumed) return; // useAccount mounts more than once per page
  resumed = true;
  const sb = getSupabase();
  if (!sb) return;
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = params.get("error_code") ?? hash.get("error_code");
  if (code !== "identity_already_exists") return;
  writeFlag(KNOWN_KEY);
  window.history.replaceState(null, "", returnUrl());
  try {
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: returnUrl() },
    });
  } catch {
    /* ignore: the log-in button remains */
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
