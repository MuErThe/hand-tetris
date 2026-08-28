"use client";

// The rules, the way Hand Tetris does them: a "? Rules" trigger pinned to
// the top-right of the start overlay, opening a right-hand drawer with the
// numbered lines. Shared by the GameShell games and Thirty Circles; Tetris
// keeps its own illustrated panel.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface RulesDrawerProps {
  /** Wordmark, already styled. */
  title: ReactNode;
  /** The skill it trains: the eyebrow line. */
  trains: string;
  /** The rules, short lines in play order. */
  lines: string[];
  /** What it trains, long form (registry `trainsLong`). */
  trainsLong?: string;
  /** How it does that, one paragraph (registry `how`). */
  how?: string;
  accent?: string;
}

export function RulesDrawer({
  title,
  trains,
  lines,
  trainsLong,
  how,
  accent = "var(--accent)",
}: RulesDrawerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  // Escape closes; focus moves into the drawer on open and back to the
  // trigger on close, so keyboard users never lose their place. The trigger
  // remounts on close, so its focus waits for the next commit.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  if (lines.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="rules-trigger"
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-4 right-4 z-[55] font-display text-[11px] tracking-[0.06em] px-3.5 py-2 rounded-[6px] border transition-all duration-150 hover:-translate-y-px flex items-center gap-1.5 hover-wash"
            style={{ borderColor: accent, color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)` }}
          >
            <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1 }}>
              ?
            </span>
            Rules
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              key="rules-backdrop"
              type="button"
              aria-label="close rules"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 cursor-default"
              style={{ background: "var(--scrim-soft)" }}
            />
            <motion.aside
              key="rules-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.33, 0, 0.15, 1] }}
              className="panel-bg fixed top-0 right-0 z-50 h-full w-full max-w-[380px] border-l overflow-y-auto"
              style={{ borderColor: "var(--panel-border-strong)", boxShadow: "-16px 0 40px var(--shadow-strong)" }}
            >
              <div
                className="sticky top-0 flex items-center justify-between px-6 py-4 border-b panel-bg"
                style={{ borderColor: "var(--panel-border)" }}
              >
                <div>
                  <div className="font-display text-[9px] tracking-[0.12em] mb-0.5" style={{ color: accent }}>
                    {trains}
                  </div>
                  <h2 id={headingId} className="font-display tracking-[0.1em] text-lg" style={{ color: "var(--ink)" }}>
                    {title}
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="close rules"
                  className="w-8 h-8 flex items-center justify-center rounded-[6px] border transition-colors hover-wash"
                  style={{ borderColor: "var(--panel-border-strong)", color: "var(--ink-dim)" }}
                >
                  ✕
                </button>
              </div>
              {(trainsLong || how) && (
                <div className="px-6 py-5 border-b" style={{ borderColor: "var(--panel-border)" }}>
                  <h3 className="font-mono text-[8px] uppercase tracking-[0.12em] mb-2" style={{ color: "var(--ink-dim)" }}>
                    what it trains
                  </h3>
                  {trainsLong && (
                    <p className="font-display text-[13px] tracking-[0.03em] leading-snug mb-2" style={{ color: "var(--ink)" }}>
                      {trainsLong.charAt(0).toUpperCase() + trainsLong.slice(1)}
                    </p>
                  )}
                  {how && (
                    <p className="font-mono text-[11px] tracking-[0.02em] leading-relaxed" style={{ color: "var(--ink-dim)" }}>
                      {how}
                    </p>
                  )}
                </div>
              )}
              <div className="px-6 py-5">
                <h3 className="font-mono text-[8px] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--ink-dim)" }}>
                  how to play
                </h3>
                <ol className="flex flex-col gap-3 list-none m-0 p-0">
                  {lines.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 font-mono text-[12px] tracking-[0.02em] leading-relaxed"
                    >
                      <span className="shrink-0 tabular-nums font-display text-[13px]" style={{ color: accent }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ color: "var(--ink)" }}>{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
