"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { RACK, sharpenIn } from "@/components/focal/FocalPlane";
import { MedalIcon, TrophyIcon } from "@/components/icons";
import {
  fetchTop10,
  type LeaderboardRow,
  type MetaColumn,
} from "@/lib/leaderboard/api";

interface LeaderboardModalProps {
  show: boolean;
  onClose: () => void;
  /** Which game's board to load. */
  game: string;
  /** If provided, the row matching this name is highlighted. */
  highlightName?: string | null;
  /** Extra game-specific columns rendered from each row's `meta`. */
  columns?: MetaColumn[];
  /** Heading, e.g. "hall of pilots". */
  eyebrow?: string;
  /** Unit noun for the count line, e.g. "pilots". */
  countNoun?: string;
}

export function LeaderboardModal({
  show,
  onClose,
  game,
  highlightName,
  columns = [],
  eyebrow = "hall of fame",
  countNoun = "players",
}: LeaderboardModalProps) {
  // null = not fetched yet → loading. Reset whenever the modal opens so each
  // open shows fresh data (state-during-render instead of a setState effect).
  const [fetched, setFetched] = useState<LeaderboardRow[] | null>(null);
  const [prevShow, setPrevShow] = useState(show);
  if (prevShow !== show) {
    setPrevShow(show);
    if (show) setFetched(null);
  }
  const rows = fetched ?? [];
  const loading = show && fetched === null;

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    fetchTop10(game).then((data) => {
      if (!cancelled) setFetched(data);
    });
    return () => {
      cancelled = true;
    };
  }, [show, game]);

  // Close on Esc
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  const me = highlightName?.toLowerCase() ?? null;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const gridTemplateColumns = [
    "32px",
    "1fr",
    "84px",
    ...columns.map((c) => `${c.width ? c.width + 8 : 56}px`),
  ].join(" ");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="lb-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center px-4 py-6 overflow-y-auto"
          style={{
            background: "var(--scrim)",
          }}
        >
          <motion.div
            key="lb-card"
            initial={sharpenIn.initial}
            animate={sharpenIn.animate}
            exit={sharpenIn.exit}
            transition={RACK}
            onClick={(e) => e.stopPropagation()}
            className="panel-bg relative rounded-[6px] border max-w-[640px] w-full overflow-hidden my-auto"
            style={{
              borderColor: "var(--panel-border-strong)",
              boxShadow:
                "0 32px 80px var(--shadow-strong), 0 0 0 1px color-mix(in srgb, var(--accent) 5%, transparent)",
            }}
          >

            {/* Header */}
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{
                borderColor: "var(--panel-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 2%, transparent))",
              }}
            >
              <div>
                <div
                  className="font-display text-[10px] tracking-[0.12em] mb-1"
                  style={{ color: "var(--accent)" }}
                > {eyebrow} </div>
                <h2
                  className="font-display tracking-[0.1em] leading-none"
                  style={{
                    color: "var(--ink)",
                    fontSize: 26,
                  }}
                >
                  Leader<span style={{ color: "var(--accent)" }}>board</span>
                </h2>
                <div
                  className="font-mono text-[9px] uppercase tracking-[0.1em] mt-1"
                  style={{ color: "var(--ink-dim)" }}
                >
                  all-time · top 10 ·{" "}
                  {loading ? "syncing…" : `${rows.length} ${countNoun}`}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-[6px] border w-9 h-9 flex items-center justify-center transition-colors"
                style={{
                  borderColor: "var(--panel-border-strong)",
                  color: "var(--ink-dim)",
                  background: "var(--recess)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--ink)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--ink-dim)";
                  e.currentTarget.style.borderColor = "var(--panel-border-strong)";
                }}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              {rows.length === 0 ? (
                <div
                  className="text-center py-10 font-mono text-[11px] tracking-[0.1em]"
                  style={{ color: "var(--ink-dim)" }}
                >
                  {loading ? "loading top scores…" : "no scores yet · be first"}
                </div>
              ) : (
                <>
                  {/* Podium for top 3 */}
                  {podium.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {/* Order: 2nd, 1st, 3rd for staircase feel */}
                      {[1, 0, 2].map((idx) => {
                        const r = podium[idx];
                        if (!r) return <div key={idx} />;
                        const isMe = me && r.name.toLowerCase() === me;
                        return (
                          <PodiumCell
                            key={r.rank}
                            row={r}
                            isMe={!!isMe}
                            featured={idx === 0}
                            columns={columns}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Rest of the list */}
                  {rest.length > 0 && (
                    <div
                      className="rounded-[6px] border overflow-hidden"
                      style={{
                        borderColor: "var(--panel-border)",
                        background: "var(--recess)",
                      }}
                    >
                      <div
                        className="grid px-3 py-1.5 border-b text-[9px] uppercase tracking-[0.1em]"
                        style={{
                          borderColor: "var(--panel-border)",
                          color: "var(--ink-dim)",
                          gridTemplateColumns,
                        }}
                      >
                        <span>#</span>
                        <span>name</span>
                        <span className="text-right">score</span>
                        {columns.map((c) => (
                          <span key={c.label} className="text-right">
                            {c.label}
                          </span>
                        ))}
                      </div>
                      {rest.map((r) => {
                        const isMe = me && r.name.toLowerCase() === me;
                        return (
                          <div
                            key={`${r.rank}-${r.name}`}
                            className="grid items-center px-3 py-1.5"
                            style={{
                              gridTemplateColumns,
                              background: isMe
                                ? "linear-gradient(90deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 4%, transparent))"
                                : "transparent",
                              boxShadow: isMe
                                ? "inset 2px 0 0 var(--accent)"
                                : "inset 2px 0 0 transparent",
                            }}
                          >
                            <span
                              className="font-display text-[12px]"
                              style={{ color: "var(--ink-dim)" }}
                            >
                              {String(r.rank).padStart(2, "0")}
                            </span>
                            <span
                              className="font-display tracking-[0.02em] text-[13px] truncate"
                              style={{
                                color: isMe ? "var(--accent)" : "var(--ink)",
                              }}
                            >
                              {r.name}
                              {isMe && (
                                <span
                                  className="ml-1 font-mono text-[9px] uppercase"
                                  style={{ color: "var(--accent)" }}
                                >
                                  · you
                                </span>
                              )}
                            </span>
                            <span
                              className="text-right font-display text-[13px]"
                              style={{
                                color: isMe ? "var(--accent)" : "var(--ink)",
                              }}
                            >
                              {r.score.toLocaleString("en-US")}
                            </span>
                            {columns.map((c) => (
                              <span
                                key={c.label}
                                className="text-right font-mono text-[11px]"
                                style={{ color: "var(--ink-dim)" }}
                              >
                                {c.get(r.meta)}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              className="px-6 py-2 font-mono text-[9px] uppercase tracking-[0.1em] border-t text-center"
              style={{
                borderColor: "var(--panel-border)",
                color: "var(--ink-dim)",
                background: "var(--recess)",
              }}
            >
              esc · close
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PodiumCell({
  row,
  isMe,
  featured,
  columns,
}: {
  row: LeaderboardRow;
  isMe: boolean;
  featured: boolean;
  columns: MetaColumn[];
}) {
  const subtitle = columns
    .map((c) => `${c.get(row.meta)} ${c.label}`)
    .join(" · ");
  const colors: Record<number, string> = {
    1: "var(--accent)",
    2: "var(--ink)",
    3: "var(--accent-hot)",
  };
  const main = colors[row.rank] ?? "var(--ink)";
  const medalSize = featured ? 28 : 22;
  const medal =
    row.rank === 1 ? (
      <TrophyIcon size={medalSize} />
    ) : row.rank <= 3 ? (
      <MedalIcon size={medalSize} />
    ) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: row.rank * 0.05 }}
      className="relative rounded-[6px] border flex flex-col items-center justify-end px-2 py-3"
      style={{
        borderColor: isMe
          ? "var(--accent)"
          : featured
            ? "var(--panel-border-strong)"
            : "var(--panel-border)",
        background: isMe
          ? "linear-gradient(180deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent) 2%, transparent))"
          : featured
            ? "linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, transparent), var(--recess))"
            : "linear-gradient(180deg, var(--raise), var(--recess))",
        minHeight: featured ? 130 : 110,
        boxShadow: featured
          ? "0 0 24px color-mix(in srgb, var(--accent) 15%, transparent), inset 0 -2px 0 var(--bevel)"
          : "inset 0 -2px 0 var(--bevel)",
      }}
    >
      <div
        className="font-display text-[10px] tracking-[0.1em] mb-1"
        style={{ color: "var(--ink-dim)" }}
      >
        #{String(row.rank).padStart(2, "0")}
      </div>
      <div className="leading-none mb-1" style={{ color: main }}>
        {medal}
      </div>
      <div
        className="font-display tracking-[0.03em] text-center truncate w-full"
        style={{
          color: main,
          fontSize: featured ? 13 : 11,
          textShadow: featured ? "0 0 10px color-mix(in srgb, var(--accent) 40%, transparent)" : "none",
        }}
      >
        {row.name}
        {isMe && (
          <span
            className="ml-1 font-mono text-[8px] uppercase"
            style={{ color: "var(--accent)" }}
          >
            · you
          </span>
        )}
      </div>
      <div
        className="font-display"
        style={{
          color: main,
          fontSize: featured ? 20 : 16,
          letterSpacing: "0.04em",
          textShadow: featured ? "0 0 12px color-mix(in srgb, var(--accent) 50%, transparent)" : "none",
        }}
      >
        {row.score.toLocaleString("en-US")}
      </div>
      {subtitle && (
        <div
          className="font-mono text-[8px] uppercase tracking-[0.09em] mt-0.5"
          style={{ color: "var(--ink-dim)" }}
        >
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}
