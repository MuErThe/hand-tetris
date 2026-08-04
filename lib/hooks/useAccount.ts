"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/leaderboard/supabase";

/** A Google-backed account. Guests and anonymous sessions read as null. */
export interface Account {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

function toAccount(user: User | null | undefined): Account | null {
  if (!user || user.is_anonymous) return null;
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    email: user.email ?? null,
    name:
      typeof m.full_name === "string"
        ? m.full_name
        : typeof m.name === "string"
          ? m.name
          : null,
    avatarUrl: typeof m.avatar_url === "string" ? m.avatar_url : null,
  };
}

/**
 * The logged-in account, live across sign-in/out and the OAuth redirect
 * return. Never creates a session — it only observes.
 */
export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    void sb.auth.getSession().then(({ data }) => {
      if (alive) setAccount(toAccount(data.session?.user));
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (alive) setAccount(toAccount(session?.user));
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return account;
}
