"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

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
    // is the OAuth flow that works on a static export — the Google redirect
    // lands back on any page and the client exchanges the code from the URL.
    auth: { persistSession: true, autoRefreshToken: true, flowType: "pkce" },
  });
  return cached;
}

export function leaderboardConfigured(): boolean {
  return getSupabase() !== null;
}
