"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RACK, sharpenIn } from "@/components/focal/FocalPlane";
import { Detent } from "@/components/focal/Detent";
import { Leaderboard } from "./Leaderboard";
import type {
  LeaderboardRow,
  MetaColumn,
  SubmitError,
} from "@/lib/leaderboard/api";
import type { StoredBest } from "@/lib/leaderboard/local";

export type SubmissionStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "ok" }
  | { state: "skipped" } // no backend configured
  | { state: "error"; error: SubmitError; message?: string };

interface GameOverOverlayProps {
  show: boolean;
  score: number;
  lines: number;
  level: number;
  playerName: string | null;
  newBest: boolean;
  personalBest: StoredBest | null;
  submission: SubmissionStatus;
  leaderboard: LeaderboardRow[];
  loadingLeaderboard: boolean;
  /** Game-specific board columns rendered from each row's `meta`. */
  leaderboardColumns?: MetaColumn[];
  onRestart: () => void;
  /** Optional: when given, renders a secondary "BACK TO MENU" action. */
  onBackToMenu?: () => void;
  /** When true, the modal header reads "Run ended" instead of "Game over". */
  endedManually?: boolean;
}

export function GameOverOverlay({
  show,
  score,
  lines,
  level,
  playerName,
  newBest,
  personalBest,
  submission,
  leaderboard,
  loadingLeaderboard,
  leaderboardColumns,
  onRestart,
  onBackToMenu,
  endedManually = false,
}: GameOverOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 flex items-center justify-center px-6 py-6 overflow-y-auto"
          style={{
            background: "var(--scrim)",
          }}
        >
          <motion.div
            initial={sharpenIn.initial}
            animate={sharpenIn.animate}
            exit={sharpenIn.exit}
            transition={RACK}
            className="panel-bg relative rounded-[6px] border max-w-[560px] w-full overflow-hidden"
            style={{
              borderColor: "color-mix(in srgb, var(--accent-hot) 45%, transparent)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div
              className="px-6 py-3 border-b font-display text-[10px] tracking-[0.12em] flex items-center justify-between"
              style={{
                borderColor: "color-mix(in srgb, var(--accent-hot) 25%, transparent)",
                color: "var(--accent-hot)",
                background: "color-mix(in srgb, var(--accent-hot) 8%, transparent)",
              }}
            >
              <span>
                {endedManually
                  ? " ejected · run ended "
                  : " stack overflow "}
              </span>
              <span style={{ color: "var(--ink-dim)" }}>
                {endedManually ? "stopped" : "terminated"}
              </span>
            </div>

            <div className="px-6 py-6 text-center">
              <motion.h2
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="font-display tracking-[0.09em] leading-none mb-1"
                style={{
                  color: "var(--accent-hot)",
                  fontSize: 36,
                }}
              >
                {endedManually ? "Run ended" : "Game over"}
              </motion.h2>
              <div
                className="font-mono text-[10px] uppercase tracking-[0.1em] mb-1"
                style={{ color: "var(--ink-dim)" }}
              >
                {playerName ? `pilot · ${playerName}` : "the well is full"}
              </div>
              {newBest && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-[12px] tracking-[0.1em] mb-3"
                  style={{
                    color: "var(--accent)",
                  }}
                >
                  ★ new personal best ★
                </motion.div>
              )}
              {!newBest && personalBest && (
                <div
                  className="font-mono text-[10px] uppercase tracking-[0.1em] mb-3"
                  style={{ color: "var(--ink-dim)" }}
                >
                  personal best · {personalBest.score.toLocaleString("en-US")}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatBlock label="SCORE" value={score} hero />
                <StatBlock label="LINES" value={lines} />
                <StatBlock label="LEVEL" value={level} />
              </div>

              <SubmissionLine status={submission} />

              <div className="text-left mb-5 mt-3">
                <Leaderboard
                  rows={leaderboard}
                  loading={loadingLeaderboard}
                  highlightName={playerName}
                  columns={leaderboardColumns}
                  emptyMessage={
                    submission.state === "skipped"
                      ? "leaderboard offline · configure supabase to enable"
                      : "no scores yet · you could be first"
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Detent
                  onClick={onRestart}
                  className="font-display tracking-[0.06em] text-sm px-6 py-3.5 border w-full transition-all duration-150 hover-wash"
                  style={{
                    borderColor: "var(--accent)",
                    color: "var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    boxShadow: "0 0 20px color-mix(in srgb, var(--accent) 15%, transparent)",
                  }}
                >
                  ↻ Insert coin
                </Detent>
                {onBackToMenu && (
                  <button
                    onClick={onBackToMenu}
                    className="font-mono tracking-[0.1em] text-[11px] px-6 py-2 w-full transition-colors hover:text-[var(--ink)]"
                    style={{ color: "var(--ink-dim)" }}
                  >
                    ← back to menu
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatBlock({
  label,
  value,
  hero = false,
}: {
  label: string;
  value: number;
  hero?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[6px] border py-3"
      style={{
        borderColor: hero
          ? "var(--panel-border-strong)"
          : "var(--panel-border)",
        background: hero
          ? "linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, transparent), color-mix(in srgb, var(--accent) 2%, transparent))"
          : "var(--raise)",
      }}
    >
      <span
        className="font-mono text-[9px] uppercase tracking-[0.1em]"
        style={{ color: "var(--ink-dim)" }}
      >
        {label}
      </span>
      <span
        className="font-display"
        style={{
          color: hero ? "var(--accent)" : "var(--ink)",
          fontSize: hero ? 26 : 20,
          letterSpacing: "0.04em",
          textShadow: hero ? "0 0 10px color-mix(in srgb, var(--accent) 30%, transparent)" : "none",
        }}
      >
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}

function SubmissionLine({ status }: { status: SubmissionStatus }) {
  let text: string;
  let color = "var(--ink-dim)";
  switch (status.state) {
    case "idle":
      return null;
    case "submitting":
      text = "submitting score…";
      break;
    case "ok":
      text = "✓ score submitted";
      color = "var(--c-S)";
      break;
    case "skipped":
      text = "leaderboard offline · saved locally";
      break;
    case "error":
      text =
        status.error === "rate_limited"
          ? "submission rate-limited · try again in a moment"
          : status.error === "implausible_score" ||
              status.error === "implausible_time"
            ? "submission rejected by server (sanity check)"
            : status.error === "bad_token" || status.error === "unknown_name"
              ? "submission auth failed · clear name and try again"
              : `submission failed (${status.error})`;
      color = "var(--accent-hot)";
      break;
  }
  return (
    <div
      className="font-mono text-[10px] uppercase tracking-[0.1em]"
      style={{ color }}
    >
      {text}
    </div>
  );
}
