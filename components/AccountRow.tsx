"use client";

// "Continue with Google" / signed-in state for the start screens. Quiet by
// design: logging in is optional and guest play is the default. After the
// redirect back from Google, the stored identity is re-linked to the (now
// permanent) auth user in the background.

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/hooks/useAccount";
import {
  linkPlayerToSession,
  signInWithGoogle,
  signOutAccount,
} from "@/lib/auth/session";
import { syncOnLogin } from "@/lib/auth/sync";
import { loadStoredPlayer } from "@/lib/leaderboard/local";
import { leaderboardConfigured } from "@/lib/leaderboard/supabase";

export function AccountRow({ className = "" }: { className?: string }) {
  const account = useAccount();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logIn = async () => {
    setError(null);
    setPending(true);
    const problem = await signInWithGoogle();
    // On success the browser is leaving; only a failure ever lands here.
    if (problem) {
      setError(problem);
      setPending(false);
    }
  };

  useEffect(() => {
    if (!account) return;
    const stored = loadStoredPlayer();
    if (stored) void linkPlayerToSession(stored);
    void syncOnLogin();
  }, [account]);

  if (!leaderboardConfigured()) return null;

  return (
    <div
      className={`font-mono text-[10px] tracking-[0.07em] text-center ${className}`}
      style={{ color: "var(--ink-dim)" }}
    >
      {account ? (
        <>
          <span aria-hidden="true">✓ </span>synced to{" "}
          <span style={{ color: "var(--ink)" }}>
            {account.email ?? "your Google account"}
          </span>
          {" · "}
          <button
            type="button"
            onClick={() => void signOutAccount()}
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--accent)]"
          >
            log out
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void logIn()}
            disabled={pending}
            aria-describedby={error ? "account-row-error" : undefined}
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--accent)] disabled:no-underline disabled:cursor-wait"
          >
            {pending ? "opening Google…" : "continue with Google to keep your streak on every device"}
          </button>
          {error && (
            <p id="account-row-error" role="alert" className="mt-1.5" style={{ color: "var(--accent-hot)" }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
