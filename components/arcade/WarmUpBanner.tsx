"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { currentStreak, doneToday, localDayNumber, playedDaysKey } from "@/lib/warmup/streak";
import { dailyWarmUpGames, wordmark } from "@/lib/games/registry";
import { Vignette } from "./Vignette";

// The streak lives in localStorage and only changes on other pages, so the
// store never notifies; the server snapshots keep hydration honest.
const subscribeNever = () => () => {};
const noStreak = () => 0;
const notDone = () => false;
const noDays = () => "";
const noDay = () => 0;

// The reset clock re-reads once a minute; a snapshot is minutes to local
// midnight, so it only changes (and only re-renders) when the label would.
const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
};
function minutesToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / 60_000));
}
const unknownMinutes = () => -1;

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Local day numbers for Monday to Sunday of the week containing `today`. */
function weekOf(today: number): number[] {
  // Day 0 (1970-01-01) was a Thursday: Monday-based index is (day + 3) mod 7.
  const monday = today - ((today + 3) % 7);
  return Array.from({ length: 7 }, (_, i) => monday + i);
}

function resetLabel(mins: number): string {
  if (mins < 0) return "";
  if (mins < 60) return `resets in ${mins} min`;
  const h = Math.floor(mins / 60);
  return `resets in ${h} h ${mins % 60} min`;
}

/**
 * Rail card: the daily-warm-up call to action, the current streak, the flame
 * week (one flame per day, lit when played), today's four-game draw, and the
 * reset clock. A fixture beside the game plates, so it changes every day.
 */
export function WarmUpBanner() {
  const streak = useSyncExternalStore(subscribeNever, currentStreak, noStreak);
  const done = useSyncExternalStore(subscribeNever, doneToday, notDone);
  const daysKey = useSyncExternalStore(subscribeNever, playedDaysKey, noDays);
  const today = useSyncExternalStore(subscribeNever, localDayNumber, noDay);
  const mins = useSyncExternalStore(subscribeMinute, minutesToMidnight, unknownMinutes);

  const played = new Set(daysKey ? daysKey.split(",").map(Number) : []);
  const week = today ? weekOf(today) : [];
  const draw = today ? dailyWarmUpGames(today) : [];

  return (
    <Link
      href="/warm-up"
      className="hub-warmup bento-card group panel-bg rounded-[6px] overflow-hidden flex flex-col"
      style={{ "--tint": "var(--accent)", gridArea: "warmup" } as React.CSSProperties}
    >
      <div className="shrink-0" style={{ height: 160 }}>
        <Vignette kind="warmup" tint="var(--accent)" className="h-full" />
      </div>
      <div className="flex-1 flex flex-col gap-5 px-5 py-4 min-h-0">
        <div className="flex flex-col gap-1">
          <span className="font-display text-[13px] tracking-[0.1em]" style={{ color: "var(--ink)" }}>
            Daily <span style={{ color: "var(--accent)" }}>warm-up</span>
          </span>
          <span className="font-mono text-[10px] tracking-[0.06em]" style={{ color: "var(--ink-dim)" }}>
            five-minute games that sharpen a designer&apos;s eye, hand and imagination.
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-dim)" }}>
            four games, drawn daily · five minutes · before the real work
          </span>
        </div>

        {/* Flame week: Monday to Sunday, lit when that day's warm-up was
            done. The weekday letter and the aria-label carry the state too,
            so it never rests on the flame's colour alone. */}
        {week.length > 0 && (
          <div className="flex flex-col gap-3 pt-4 border-t" style={{ borderColor: "var(--panel-border)" }}>
            <span className="font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: "var(--ink-dim)" }}>
              this week
            </span>
            <ul className="flex items-start justify-between gap-1 list-none m-0 p-0">
              {week.map((d, i) => {
                const lit = played.has(d);
                const future = d > today;
                return (
                  <li
                    key={d}
                    className="flex flex-col items-center gap-1"
                    aria-label={`${WEEKDAY_NAMES[i]}${d === today ? " (today)" : ""}: ${lit ? "done" : future ? "to come" : "missed"}`}
                  >
                    <span
                      aria-hidden="true"
                      className="text-[16px] leading-none transition-[filter,opacity]"
                      style={{
                        filter: lit ? "none" : "grayscale(1)",
                        opacity: lit ? 1 : future ? 0.25 : 0.4,
                      }}
                    >
                      🔥
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-[8px] tracking-[0.06em]"
                      style={{
                        color: d === today ? "var(--accent)" : "var(--ink-dim)",
                        textDecoration: d === today ? "underline" : "none",
                        textUnderlineOffset: 3,
                      }}
                    >
                      {WEEKDAYS[i]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Today's draw: the four games, ticked once the run is done. The
            warm-up is one sitting, so the ticks land together. */}
        {draw.length > 0 && (
          <div className="flex flex-col gap-3 pt-4 border-t" style={{ borderColor: "var(--panel-border)" }}>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: "var(--ink-dim)" }}>
                today&apos;s draw
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: done ? "var(--accent)" : "var(--ink-dim)" }}>
                {done ? "4 of 4 done" : "0 of 4"}
              </span>
            </div>
            <ol className="flex flex-col list-none m-0 p-0">
              {draw.map((g, i) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 py-2"
                  style={{ borderTop: i === 0 ? "none" : "1px dashed var(--panel-border)" }}
                >
                  <span
                    className="font-mono text-[9px] tabular-nums shrink-0 w-4"
                    style={{ color: "var(--ink-dim)" }}
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex flex-col leading-tight min-w-0 flex-1 gap-0.5">
                    <span className="font-display text-[12px] tracking-[0.06em] truncate" style={{ color: "var(--ink)" }}>
                      {wordmark(g)}
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.1em] truncate" style={{ color: "var(--ink-dim)" }}>
                      {g.trains}
                    </span>
                  </span>
                  <span
                    className="font-mono text-[10px] shrink-0"
                    style={{ color: done ? "var(--accent)" : "var(--ink-dim)" }}
                    aria-label={done ? "done" : "not yet"}
                  >
                    {done ? "✓" : "·"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-auto pt-4 border-t flex items-end justify-between gap-4" style={{ borderColor: "var(--panel-border)" }}>
          <div className="flex flex-col leading-tight gap-0.5">
            {streak > 0 && (
              <span className="font-display text-[16px]" style={{ color: "var(--accent)" }}>
                🔥 {streak}
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] ml-1.5" style={{ color: "var(--ink-dim)" }}>
                  day streak
                </span>
              </span>
            )}
            <span className="font-mono text-[8px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-dim)" }}>
              {done ? `done for today · ${resetLabel(mins)}` : resetLabel(mins)}
            </span>
          </div>
          <span
            className="font-display text-[11px] tracking-[0.1em] px-3.5 py-2 rounded-[6px] border transition-colors group-hover-wash shrink-0"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            {done ? "Again ▸" : "Start ▸"}
          </span>
        </div>
      </div>
    </Link>
  );
}
