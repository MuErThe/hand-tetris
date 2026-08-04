"use client";

// Navbar account control: a profile-picture button that opens a small
// dropdown with the account's name, email and a log-out action. Logged-out
// visitors get a quiet "log in with Google" link instead. Like AccountRow,
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
  const rootRef = useRef<HTMLDivElement>(null);

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
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className={`font-display text-[11px] tracking-[0.08em] px-3.5 py-2 rounded-[6px] border transition-all duration-150 hover-wash ${className}`}
        style={{
          borderColor: "var(--accent)",
          color: "var(--accent)",
          background: "color-mix(in srgb, var(--accent) 8%, transparent)",
        }}
      >
        Log in with Google
      </button>
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
