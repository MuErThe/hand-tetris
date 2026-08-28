"use client";

// Navbar account control: a profile-picture button that opens a small
// dropdown with the account's name, email and a log-out action. Logged-out
// visitors get a Google mark that starts the log-in instead. Like AccountRow,
// it re-links the stored identity and pulls sync after the OAuth return.

import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/hooks/useAccount";
import {
  linkPlayerToSession,
  signInWithGoogle,
  signOutAccount,
} from "@/lib/auth/session";
import { syncOnLogin } from "@/lib/auth/sync";
import { loadStoredPlayer } from "@/lib/leaderboard/local";
import { leaderboardConfigured } from "@/lib/leaderboard/supabase";

export function AccountMenu({ className = "" }: { className?: string }) {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!leaderboardConfigured()) return null;

  if (!account) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => void logIn()}
          disabled={pending}
          aria-label={pending ? "Opening Google" : "Log in with Google"}
          title={pending ? "Opening Google" : "Log in with Google"}
          aria-describedby={error ? "account-login-error" : undefined}
          className="flex items-center justify-center rounded-[6px] border transition-transform hover:-translate-y-px hover-wash disabled:opacity-60 disabled:cursor-wait"
          style={{
            width: 28,
            height: 28,
            borderColor: "var(--panel-border-strong)",
            background: "var(--field-2)",
          }}
        >
          <GoogleMark />
        </button>
        {error && (
          <p
            id="account-login-error"
            role="alert"
            className="absolute right-0 mt-2 w-[220px] text-right font-mono text-[10px] leading-snug tracking-[0.02em]"
            style={{ color: "var(--accent-hot)" }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  const initial = (account.name ?? account.email ?? "?").charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${account.email ?? "signed in"}`}
        className="block rounded-[6px] border overflow-hidden transition-transform hover:-translate-y-px"
        style={{ width: 28, height: 28, borderColor: "var(--panel-border-strong)" }}
      >
        {account.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export; tiny remote avatar
          <img
            src={account.avatarUrl}
            alt=""
            width={28}
            height={28}
            className="block w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="flex items-center justify-center w-full h-full font-display text-[13px]"
            style={{ background: "var(--field-2)", color: "var(--ink)" }}
          >
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 rounded-[6px] border panel-bg z-50 min-w-[220px] overflow-hidden text-left"
          style={{
            borderColor: "var(--panel-border-strong)",
            boxShadow: "0 16px 40px var(--shadow-strong)",
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--panel-border)" }}>
            {account.name && (
              <div className="font-display text-[13px] mb-0.5" style={{ color: "var(--ink)" }}>
                {account.name}
              </div>
            )}
            <div className="font-mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ink-dim)" }}>
              {account.email ?? "signed in with Google"}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOutAccount();
            }}
            className="w-full text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors hover:text-[var(--accent)] hover-wash-soft"
            style={{ color: "var(--ink-dim)" }}
          >
            log out
          </button>
        </div>
      )}
    </div>
  );
}

/** The Google "G", drawn inline so the static export needs no asset. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" width={16} height={16} viewBox="0 0 48 48">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10.1 10.1 0 0 1-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.9-12.3-9H4.4v5.7A22 22 0 0 0 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.7 28.2A13.2 13.2 0 0 1 11 24c0-1.5.3-2.9.7-4.2v-5.7H4.4A22 22 0 0 0 2 24c0 3.6.9 6.9 2.4 9.9l7.3-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2A22 22 0 0 0 4.4 14.1l7.3 5.7c1.8-5.1 6.6-9 12.3-9z"
      />
    </svg>
  );
}
