"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, type GameResult } from "@/components/arcade/GameShell";
import { GameLayout } from "@/components/arcade/GameLayout";
import { RoundReveal } from "@/components/arcade/RoundReveal";
import { evaluate, generate } from "@/lib/doubletake/engine";
import { GLYPHS } from "@/lib/doubletake/icons";
import {
  type Archetype,
  type El,
  type Evaluation,
  type FlawType,
  type Rect,
  type Round,
  CARD,
  FLAW_TYPES,
  MAX_ROUND_POINTS,
  PANEL_H,
  PANEL_W,
  ROUNDS_PER_SESSION,
  TYPE_LABEL,
} from "@/lib/doubletake/types";
import {
  DOUBLETAKE_COLUMNS,
  DOUBLETAKE_GAME,
} from "@/lib/doubletake/leaderboard";
import { buildSequence } from "@/lib/learning/adaptive";
import { pickLesson } from "@/lib/learning/lessons";
import {
  recordSession,
  typeAccuracy,
  type RoundRecord,
} from "@/lib/learning/progress";
import { playSfx } from "@/lib/audio/sfx";

/** The card sits on a neutral mat, as the Colour Forge swatch does. */
const MAT = "var(--mat-grey)";
const CARD_FONT = "ui-sans-serif, system-ui, sans-serif";
const CARD_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function DoubleTakePage() {
  return (
    <GameShell
      gameId={DOUBLETAKE_GAME}
      title={
        <>
          Double <span style={{ color: "var(--accent)" }}>Take</span>
        </>
      }
      trains="the critical eye"
      pitch="two versions of the same card. one of them is wrong. ten rounds to prove you can still tell."
      howTo={[
        "click the version you think is correct, or press A / B",
        "the flaw is revealed and named, with the principle behind it",
        "answer faster to score higher; rounds get subtler as you go",
      ]}
      columns={DOUBLETAKE_COLUMNS}
      eyebrow="sharpest critics"
      countNoun="critics"
      vignette="eyeball"
      accent="var(--c-O)"
    >
      {({ onFinish }) => <DoubleTakeGame onFinish={onFinish} />}
    </GameShell>
  );
}

export function DoubleTakeGame({
  onFinish,
  roundCount = ROUNDS_PER_SESSION,
  record = true,
}: {
  onFinish: (r: GameResult) => void;
  roundCount?: number;
  record?: boolean;
}) {
  const seqRef = useRef<FlawType[]>([]);
  const seenLessonsRef = useRef<Set<string>>(new Set());
  const roundStartRef = useRef(0);
  const streakRef = useRef({ current: 0, best: 0 });
  // So the same card kind doesn't come round twice running.
  const lastCardRef = useRef<Archetype | undefined>(undefined);

  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [locked, setLocked] = useState<{
    choice: 0 | 1;
    ev: Evaluation;
    principle: string;
  } | null>(null);
  const [score, setScore] = useState(0);

  // Later rounds ask a finer question: the flaw magnitude shrinks across the
  // session, so the last few are genuinely hard to call.
  const subtletyFor = useCallback(
    (idx: number) => (roundCount <= 1 ? 0.5 : idx / (roundCount - 1)),
    [roundCount],
  );

  useEffect(() => {
    seqRef.current = buildSequence(
      FLAW_TYPES,
      typeAccuracy(DOUBLETAKE_GAME),
      roundCount,
    );
    roundStartRef.current = performance.now();
    const first = generate(seqRef.current[0], subtletyFor(0));
    lastCardRef.current = first.archetype;
    setRound(first);
  }, [roundCount, subtletyFor]);

  const choose = useCallback(
    (choice: 0 | 1) => {
      if (!round || locked) return;
      // Ignore a click landing in the first moments of a round: stops the
      // click that dismissed an overlay from committing an answer instantly.
      const elapsed = performance.now() - roundStartRef.current;
      if (elapsed < 200) return;

      const ev = evaluate(round, choice, elapsed);
      setRounds((rs) => [
        ...rs,
        { type: round.type, errorPct: ev.errorPct, points: ev.points },
      ]);
      const s = streakRef.current;
      s.current = ev.correct ? s.current + 1 : 0;
      s.best = Math.max(s.best, s.current);
      setScore((v) => v + ev.points);
      const principle = pickLesson(
        DOUBLETAKE_GAME,
        round.type,
        ev.tag,
        seenLessonsRef.current,
      );
      playSfx(ev.correct ? "clearBig" : "lock");
      setLocked({ choice, ev, principle });
    },
    [round, locked],
  );

  const next = useCallback(() => {
    const nextIdx = roundIdx + 1;
    if (nextIdx >= roundCount) {
      const caught = rounds.filter((r) => r.errorPct === 0).length;
      const acc = Math.round((100 * caught) / (rounds.length || 1));
      if (record) recordSession(DOUBLETAKE_GAME, score, rounds);
      const headline =
        acc >= 90 ? "Nothing gets past" : acc >= 60 ? "Sharp" : "Look again";
      onFinish({
        score,
        meta: { acc, streak: streakRef.current.best },
        stats: [
          { label: "caught", value: `${caught}/${rounds.length}` },
          { label: "best streak", value: streakRef.current.best },
          { label: "accuracy", value: `${acc}%` },
        ],
        headline,
      });
      return;
    }
    setRoundIdx(nextIdx);
    setLocked(null);
    roundStartRef.current = performance.now();
    const r = generate(
      seqRef.current[nextIdx],
      subtletyFor(nextIdx),
      lastCardRef.current,
    );
    lastCardRef.current = r.archetype;
    setRound(r);
  }, [roundIdx, score, onFinish, roundCount, record, subtletyFor, rounds]);

  // A / B as a speed aid. Deliberately not arrow keys: those belong to the
  // browser's own focus movement between the two option buttons.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "1") choose(0);
      else if (k === "b" || k === "2") choose(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, locked]);

  if (!round) return null;

  const panels: (0 | 1)[] = [0, 1];

  return (
    <GameLayout
      typeLabel={TYPE_LABEL[round.type]}
      roundIdx={roundIdx}
      roundCount={roundCount}
      score={score}
      prompt={locked ? "here's what was wrong →" : round.prompt}
      accent="var(--c-O)"
      results={rounds.map((r) => r.points / MAX_ROUND_POINTS)}
      reveal={
        locked ? (
          <RoundReveal
            show
            compact
            points={locked.ev.points}
            maxPoints={MAX_ROUND_POINTS}
            detail={`${locked.ev.correct ? "caught it" : "missed it"} · ${locked.ev.detail}`}
            principle={locked.principle}
            isLast={roundIdx + 1 >= roundCount}
            onContinue={next}
          />
        ) : null
      }
    >
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className="flex flex-wrap items-center justify-center gap-5 rounded-[6px]"
          style={{ background: MAT, padding: 22 }}
        >
          {panels.map((idx) => {
            const isClean = idx === round.cleanIdx;
            const label = idx === 0 ? "A" : "B";
            return (
              <OptionPanel
                key={label}
                label={label}
                els={isClean ? round.clean : round.flawed}
                locked={!!locked}
                chosen={locked?.choice === idx}
                isClean={isClean}
                mark={locked && !isClean ? round.focus : null}
                onChoose={() => choose(idx)}
              />
            );
          })}
        </div>
      </div>
    </GameLayout>
  );
}

function OptionPanel({
  label,
  els,
  locked,
  chosen,
  isClean,
  mark,
  onChoose,
}: {
  label: string;
  els: El[];
  locked: boolean;
  chosen: boolean;
  isClean: boolean;
  mark: Rect | null;
  onChoose: () => void;
}) {
  // Once locked, the verdict is carried by the word AND the icon AND the
  // border; never by colour alone.
  const verdict = !locked ? null : isClean ? "✓ correct" : "✕ flawed";
  const verdictInk = isClean ? "var(--truth-ink)" : "var(--guess-ink)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onChoose}
        disabled={locked}
        aria-label={`Option ${label}${locked ? (isClean ? ": correct" : ": flawed") : ""}`}
        className="relative block overflow-hidden rounded-[6px] transition-transform"
        style={{
          width: PANEL_W,
          height: PANEL_H,
          background: CARD.ground,
          cursor: locked ? "default" : "pointer",
          outline: locked
            ? `2px solid ${verdictInk}`
            : chosen
              ? "2px solid var(--accent)"
              : "1px solid rgba(0,0,0,0.18)",
          outlineOffset: 0,
        }}
      >
        <CardSurface els={els} uid={label} />
        {mark && (
          <span
            aria-hidden="true"
            className="absolute pointer-events-none rounded-[3px]"
            style={{
              left: mark.x,
              top: mark.y,
              width: mark.w,
              height: mark.h,
              border: `1.5px dashed var(--guess-ink)`,
            }}
          />
        )}
      </button>
      <span
        className="font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-[6px]"
        style={{
          color: locked ? verdictInk : CARD.ink,
          background: CARD.ground,
        }}
      >
        {verdict ?? label}
        {chosen && locked ? " · your pick" : ""}
      </span>
    </div>
  );
}

/**
 * The card itself. Every visual property arrives already computed by the
 * layout, so this draws elements and makes no design decisions of its own,
 * which is what keeps the two panels differing by exactly one number.
 */
function CardSurface({ els, uid }: { els: El[]; uid: string }) {
  return (
    <span aria-hidden="true">
      {els.map((el, i) => (
        <Element key={i} el={el} uid={`${uid}-${i}`} />
      ))}
    </span>
  );
}

function Element({ el, uid }: { el: El; uid: string }) {
  const base = {
    position: "absolute" as const,
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
  };

  switch (el.kind) {
    case "box":
      return (
        <span
          style={{
            ...base,
            display: "block",
            background: el.fill,
            border: el.border ? `1px solid ${el.border}` : undefined,
            borderRadius: el.radius,
          }}
        />
      );

    case "text":
      return (
        <span
          style={{
            ...base,
            display: "flex",
            alignItems: "center",
            justifyContent:
              el.align === "right"
                ? "flex-end"
                : el.align === "center"
                  ? "center"
                  : "flex-start",
            fontFamily: el.mono ? CARD_MONO : CARD_FONT,
            fontSize: el.size,
            fontWeight: el.weight ?? 400,
            letterSpacing: el.mono ? "0.04em" : "-0.005em",
            lineHeight: 1.1,
            color: el.colour ?? CARD.ink,
            opacity: el.alpha ?? 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {el.text}
        </span>
      );

    case "icon": {
      const g = GLYPHS[el.icon];
      return (
        <svg
          viewBox="0 0 24 24"
          style={{ ...base, display: "block", color: el.colour, opacity: el.alpha ?? 1 }}
        >
          <path
            d={g.d}
            fill={g.filled ? "currentColor" : "none"}
            stroke={g.filled ? "none" : "currentColor"}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    case "art": {
      const gid = `dt-grad-${uid}`;
      return (
        <svg
          viewBox={`0 0 ${el.w} ${el.h}`}
          style={{ ...base, display: "block", borderRadius: el.radius }}
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={el.from} />
              <stop offset="1" stopColor={el.to} />
            </linearGradient>
          </defs>
          <rect width={el.w} height={el.h} fill={`url(#${gid})`} />
          <Motif motif={el.motif} w={el.w} h={el.h} />
        </svg>
      );
    }

    case "spark":
      return (
        <svg
          viewBox={`0 0 ${el.w} ${el.h}`}
          style={{ ...base, display: "block" }}
          preserveAspectRatio="none"
        >
          <path
            d={sparkPath(el.points, el.w, el.h, true)}
            fill={el.colour}
            opacity={0.12}
          />
          <path
            d={sparkPath(el.points, el.w, el.h, false)}
            fill="none"
            stroke={el.colour}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={el.h - 0.5}
            x2={el.w}
            y2={el.h - 0.5}
            stroke={CARD.line}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
  }
}

/** Generated cover art: a gradient plus one repeating figure. */
function Motif({ motif, w, h }: { motif: string; w: number; h: number }) {
  const light = "rgba(255,255,255,0.26)";
  switch (motif) {
    case "arcs":
      return (
        <g fill="none" stroke={light} strokeWidth={2}>
          <circle cx={w * 0.8} cy={h * 1.05} r={h * 0.42} />
          <circle cx={w * 0.8} cy={h * 1.05} r={h * 0.72} />
          <circle cx={w * 0.8} cy={h * 1.05} r={h * 1.02} />
        </g>
      );
    case "grid": {
      const dots = [];
      for (let x = w * 0.06; x < w; x += 16) {
        for (let y = h * 0.16; y < h; y += 16) {
          dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />);
        }
      }
      return <g fill={light}>{dots}</g>;
    }
    case "wave":
      return (
        <g fill="none" stroke={light} strokeWidth={2}>
          <path
            d={`M0 ${h * 0.72} Q ${w * 0.25} ${h * 0.42} ${w * 0.5} ${h * 0.62} T ${w} ${h * 0.5}`}
          />
          <path
            d={`M0 ${h * 0.9} Q ${w * 0.25} ${h * 0.6} ${w * 0.5} ${h * 0.8} T ${w} ${h * 0.68}`}
          />
        </g>
      );
    default:
      return (
        <g fill={light}>
          <rect x={w * 0.58} y={h * 0.18} width={w * 0.3} height={h * 0.5} rx={6} />
          <rect
            x={w * 0.42}
            y={h * 0.42}
            width={w * 0.3}
            height={h * 0.5}
            rx={6}
            opacity={0.7}
          />
        </g>
      );
  }
}

/** Polyline through the samples; `close` returns the filled area beneath it. */
function sparkPath(points: number[], w: number, h: number, close: boolean): string {
  if (points.length < 2) return "";
  const step = w / (points.length - 1);
  const y = (v: number) => h - 3 - v * (h - 8);
  const line = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)} ${y(v).toFixed(2)}`)
    .join(" ");
  return close ? `${line} L${w} ${h} L0 ${h} Z` : line;
}
