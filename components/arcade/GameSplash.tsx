"use client";

// The game's front door — a calm landing in the Wordle tradition: glyph,
// name, one line, Play. Shown on every visit. Players with a stored tag go
// straight into the game from here; the tag/how-to card is first-visit only.
// Renders client-side only (parents gate on mounted), so reading the date
// and local progress during setup is hydration-safe.

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { RACK, sharpenIn } from "@/components/focal/FocalPlane";
import { Detent } from "@/components/focal/Detent";
import { AccountRow } from "@/components/AccountRow";
import { Vignette, type VignetteKind } from "./Vignette";
import { bestScore, loadSessions } from "@/lib/learning/progress";

interface GameSplashProps {
  gameId: string;
  /** Wordmark, already styled (accent span etc.). */
  title: ReactNode;
  /** The skill it trains — the eyebrow line. */
  trains: string;
  /** One-line what/why pitch. */
  pitch: string;
  vignette?: VignetteKind;
  accent?: string;
  busy?: boolean;
  onPlay: () => void;
  /** Omit to hide the leaderboard button (offline). */
  onBoard?: () => void;
}

export function GameSplash({
  gameId,
  title,
  trains,
  pitch,
  vignette,
  accent = "var(--accent)",
  busy = false,
  onPlay,
  onBoard,
}: GameSplashProps) {
  // Read once when the splash appears; it remounts on each visit.
  const [meta] = useState(() => ({
    date: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    best: bestScore(gameId),
    plays: loadSessions(gameId).length,
  }));

  return (
    <motion.div
      initial={sharpenIn.initial}
      animate={sharpenIn.animate}
      exit={sharpenIn.exit}
      transition={RACK}
      className="w-full flex flex-col items-center text-center px-6 my-auto"
      style={{ maxWidth: 480 }}
    >
      {vignette && (
        <div
          className="rounded-[6px] border overflow-hidden mb-6"
          style={{ width: 220, borderColor: "var(--panel-border-strong)" }}
        >
          <Vignette kind={vignette} tint={accent} />
        </div>
      )}

      <div className="font-display text-[10px] tracking-[0.12em] mb-3" style={{ color: accent }}>
        {trains}
      </div>
      <h2
        className="font-display tracking-[0.06em] leading-[0.95] mb-4"
        style={{ color: "var(--ink)", fontSize: "clamp(38px, 8vw, 58px)" }}
      >
        {title}
      </h2>
      <p
        className="font-mono text-[12px] tracking-[0.05em] leading-relaxed mb-7"
        style={{ color: "var(--ink-dim)", maxWidth: 380 }}
      >
        {pitch}
      </p>

      <div className="flex items-center justify-center gap-3 mb-6 w-full">
        {onBoard && (
          <button
            type="button"
            onClick={onBoard}
            className="font-display tracking-[0.06em] text-[13px] px-6 py-3.5 border rounded-[6px] transition-colors hover-wash-soft"
            style={{ borderColor: "var(--panel-border-strong)", color: "var(--ink)" }}
          >
            🏆 Leaderboard
          </button>
        )}
        <Detent
          disabled={busy}
          onClick={onPlay}
          className="font-display tracking-[0.06em] text-sm px-12 py-3.5 border rounded-[6px] transition-all duration-150 disabled:opacity-50 hover-wash"
          style={{
            borderColor: accent,
            color: accent,
            background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            boxShadow: `0 0 24px color-mix(in srgb, ${accent} 18%, transparent)`,
          }}
        >
          {busy ? "Working…" : "▶ Play"}
        </Detent>
      </div>

      <div className="font-mono text-[10px] tracking-[0.08em]" style={{ color: "var(--ink-dim)" }}>
        {meta.date}
        {meta.best > 0 && <> · best {meta.best.toLocaleString("en-US")}</>}
        {meta.plays > 0 && (
          <>
            {" "}
            · {meta.plays} {meta.plays === 1 ? "play" : "plays"}
          </>
        )}
      </div>

      <AccountRow className="mt-4" />
    </motion.div>
  );
}
