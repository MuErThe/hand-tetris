"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, type GameResult } from "@/components/arcade/GameShell";
import { GameLayout } from "@/components/arcade/GameLayout";
import { RoundReveal } from "@/components/arcade/RoundReveal";
import { contentWidth, evaluate, generate } from "@/lib/doubletake/engine";
import {
  type Copy,
  type Evaluation,
  type FlawType,
  type Mock,
  type Rect,
  type Round,
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

/**
 * The mock's colours are pinned rather than themed. One of the six flaws IS a
 * contrast failure, so the ground has to be a constant or the same round would
 * pose a different question in each theme — the same reasoning that keeps the
 * Colour Forge mat fixed.
 */
const CARD_GROUND = "#ffffff";
const CARD_INK = "#1c1c1a";
const CARD_BAR = "#d9d9d7";
const CARD_AVATAR = "#e4e4e2";
const MAT = "var(--mat-grey)";

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
        "click the version you think is correct — or press A / B",
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

  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [locked, setLocked] = useState<{
    choice: 0 | 1;
    ev: Evaluation;
    principle: string;
  } | null>(null);
  const [score, setScore] = useState(0);

  // Later rounds ask a finer question — the flaw magnitude shrinks across the
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
    setRound(generate(seqRef.current[0], subtletyFor(0)));
  }, [roundCount, subtletyFor]);

  const choose = useCallback(
    (choice: 0 | 1) => {
      if (!round || locked) return;
      // Ignore a click landing in the first moments of a round — stops the
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
    setRound(generate(seqRef.current[nextIdx], subtletyFor(nextIdx)));
  }, [roundIdx, score, onFinish, roundCount, record, subtletyFor, rounds]);

  // A / B as a speed aid. Deliberately not arrow keys — those belong to the
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
            const mock = isClean ? round.clean : round.flawed;
            return (
              <OptionPanel
                key={idx}
                label={idx === 0 ? "A" : "B"}
                mock={mock}
                copy={round.copy}
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
  mock,
  copy,
  locked,
  chosen,
  isClean,
  mark,
  onChoose,
}: {
  label: string;
  mock: Mock;
  copy: Copy;
  locked: boolean;
  chosen: boolean;
  isClean: boolean;
  mark: Rect | null;
  onChoose: () => void;
}) {
  // Once locked, the verdict is carried by the word AND the icon AND the
  // border — never by colour alone.
  const verdict = !locked ? null : isClean ? "✓ correct" : "✕ flawed";
  const verdictInk = isClean ? "var(--truth-ink)" : "var(--guess-ink)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onChoose}
        disabled={locked}
        aria-label={`Option ${label}${locked ? (isClean ? " — correct" : " — flawed") : ""}`}
        className="relative block rounded-[4px] transition-transform"
        style={{
          width: PANEL_W,
          height: PANEL_H,
          background: CARD_GROUND,
          cursor: locked ? "default" : "pointer",
          outline: locked
            ? `2px solid ${verdictInk}`
            : chosen
              ? "2px solid var(--accent)"
              : "1px solid rgba(0,0,0,0.18)",
          outlineOffset: 0,
        }}
      >
        <MockCard mock={mock} copy={copy} />
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
          color: locked ? verdictInk : CARD_INK,
          background: CARD_GROUND,
        }}
      >
        {verdict ?? label}
        {chosen && locked ? " · your pick" : ""}
      </span>
    </div>
  );
}

/** The card itself — every visual property comes from the mock spec. */
function MockCard({ mock: m, copy }: { mock: Mock; copy: Copy }) {
  const cw = contentWidth(m);
  const lineTop = 96;
  const lineY = [0, m.gaps[0], m.gaps[0] + m.gaps[1]].map((d) => lineTop + d);

  const btnH = 26;
  const btnTop = 150;
  const primaryW = 66;
  const secondaryW = 60;
  const right = PANEL_W - m.padR;

  return (
    <span aria-hidden="true">
      {/* Header: avatar, title, label */}
      <span
        className="absolute block rounded-full"
        style={{ left: m.padL, top: 22, width: 26, height: 26, background: CARD_AVATAR }}
      />
      <span
        className="absolute block whitespace-nowrap"
        style={{
          left: m.padL + 36,
          top: 22,
          fontSize: m.titleSize,
          lineHeight: 1.15,
          fontWeight: 600,
          color: CARD_INK,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {copy.title}
      </span>
      <span
        className="absolute block whitespace-nowrap"
        style={{
          left: m.padL + 36,
          top: 22 + m.titleSize + 8,
          fontSize: m.subSize,
          lineHeight: 1.15,
          color: CARD_INK,
          opacity: m.subAlpha,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {copy.subtitle}
      </span>

      {/* Body: three rules carrying the vertical rhythm and the left column */}
      {lineY.map((y, i) => (
        <span
          key={i}
          className="absolute block rounded-[6px]"
          style={{
            left: m.padL + m.bodyIndent,
            top: y,
            width: cw * m.lineW[i],
            height: 7,
            background: CARD_BAR,
          }}
        />
      ))}

      {/* Actions, right-aligned to the card's right padding */}
      <span
        className="absolute flex items-center justify-center"
        style={{
          left: right - primaryW - 10 - secondaryW,
          top: btnTop,
          width: secondaryW,
          height: btnH,
          borderRadius: m.btnRadius[0],
          border: "1px solid #cfcfcd",
          fontSize: 11,
          color: CARD_INK,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {copy.secondary}
      </span>
      <span
        className="absolute flex items-center justify-center"
        style={{
          left: right - primaryW,
          top: btnTop,
          width: primaryW,
          height: btnH,
          borderRadius: m.btnRadius[1],
          background: CARD_INK,
          color: CARD_GROUND,
          fontSize: 11,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {copy.primary}
      </span>
    </span>
  );
}
