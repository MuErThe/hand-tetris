"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, type GameResult } from "@/components/arcade/GameShell";
import { GameLayout } from "@/components/arcade/GameLayout";
import { RoundReveal } from "@/components/arcade/RoundReveal";
import { Detent } from "@/components/focal/Detent";
import { evaluate, generate } from "@/lib/contrast/engine";
import {
  type Challenge,
  type ContrastType,
  type Evaluation,
  CONTRAST_TYPES,
  LANDMARKS,
  MAX_ROUND_POINTS,
  ROUNDS_PER_SESSION,
  TYPE_LABEL,
  posToRatio,
  ratioToPos,
} from "@/lib/contrast/types";
import { CONTRAST_COLUMNS, CONTRAST_GAME } from "@/lib/contrast/leaderboard";
import { buildSequence } from "@/lib/learning/adaptive";
import { pickLesson } from "@/lib/learning/lessons";
import {
  recordSession,
  typeAccuracy,
  type RoundRecord,
} from "@/lib/learning/progress";
import { playSfx } from "@/lib/audio/sfx";

export default function ContrastCallPage() {
  return (
    <GameShell
      gameId={CONTRAST_GAME}
      title={
        <>
          Contrast <span style={{ color: "var(--accent)" }}>Call</span>
        </>
      }
      trains="contrast judgement"
      pitch="how much contrast is that, really? ten pairs, and the number matters more than the vibe."
      howTo={[
        "drag the rail — or use the arrow keys — to call the ratio",
        "lock it in to see the true number and whether it passes",
        "the rail is logarithmic: 4.5:1 sits near the middle",
      ]}
      columns={CONTRAST_COLUMNS}
      eyebrow="truest eyes"
      countNoun="callers"
      vignette="colour"
      accent="var(--c-J)"
    >
      {({ onFinish }) => <ContrastGame onFinish={onFinish} />}
    </GameShell>
  );
}

export function ContrastGame({
  onFinish,
  roundCount = ROUNDS_PER_SESSION,
  record = true,
}: {
  onFinish: (r: GameResult) => void;
  roundCount?: number;
  record?: boolean;
}) {
  const seqRef = useRef<ContrastType[]>([]);
  const seenLessonsRef = useRef<Set<string>>(new Set());

  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  // The caret starts at 4.5:1 — the threshold everyone is really asking about,
  // and a neutral anchor that doesn't hint at the answer.
  const [pos, setPos] = useState(() => ratioToPos(4.5));
  const [locked, setLocked] = useState<{
    pos: number;
    ev: Evaluation;
    principle: string;
  } | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    seqRef.current = buildSequence(
      CONTRAST_TYPES,
      typeAccuracy(CONTRAST_GAME),
      roundCount,
    );
    setChallenge(generate(seqRef.current[0]));
  }, [roundCount]);

  const commit = useCallback(() => {
    if (!challenge || locked) return;
    const ev = evaluate(challenge, pos);
    setRounds((rs) => [
      ...rs,
      { type: challenge.type, errorPct: ev.errorPct, points: ev.points },
    ]);
    setScore((s) => s + ev.points);
    const principle = pickLesson(
      CONTRAST_GAME,
      challenge.type,
      ev.tag,
      seenLessonsRef.current,
    );
    playSfx(ev.points >= MAX_ROUND_POINTS * 0.85 ? "clearBig" : "lock");
    setLocked({ pos, ev, principle });
  }, [challenge, locked, pos]);

  const next = useCallback(() => {
    const nextIdx = roundIdx + 1;
    if (nextIdx >= roundCount) {
      const meanError =
        rounds.reduce((a, r) => a + r.errorPct, 0) / (rounds.length || 1);
      const acc = Math.round(100 * (1 - meanError));
      const bestRound = rounds.reduce((m, r) => Math.max(m, r.points), 0);
      if (record) recordSession(CONTRAST_GAME, score, rounds);
      const headline =
        acc >= 85 ? "Calibrated" : acc >= 65 ? "Close enough" : "Trust the checker";
      onFinish({
        score,
        meta: { acc, best: bestRound },
        stats: [
          { label: "accuracy", value: `${acc}%` },
          { label: "best round", value: bestRound },
          { label: "rounds", value: roundCount },
        ],
        headline,
      });
      return;
    }
    setRoundIdx(nextIdx);
    setLocked(null);
    setPos(ratioToPos(4.5));
    setChallenge(generate(seqRef.current[nextIdx]));
  }, [roundIdx, score, onFinish, roundCount, record, rounds]);

  if (!challenge) return null;

  const guessRatio = posToRatio(pos);

  return (
    <GameLayout
      typeLabel={TYPE_LABEL[challenge.type]}
      roundIdx={roundIdx}
      roundCount={roundCount}
      score={score}
      prompt={locked ? "here's how you did →" : challenge.prompt}
      accent="var(--c-J)"
      results={rounds.map((r) => r.points / MAX_ROUND_POINTS)}
      action={
        locked ? null : (
          <Detent
            onClick={commit}
            className="font-display tracking-[0.06em] text-[13px] px-6 py-3 border w-full transition-all duration-150 hover-wash"
            style={{
              borderColor: "var(--accent)",
              color: "var(--accent)",
              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            }}
          >
            ▣ Lock it in
          </Detent>
        )
      }
      reveal={
        locked ? (
          <RoundReveal
            show
            compact
            points={locked.ev.points}
            maxPoints={MAX_ROUND_POINTS}
            detail={`you said ${locked.ev.guessDisplay} · true ${locked.ev.targetDisplay} · ${verdictText(locked.ev)}`}
            principle={locked.principle}
            isLast={roundIdx + 1 >= roundCount}
            onContinue={next}
          />
        ) : null
      }
    >
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {/* The artboard. The rail's ticks and numerals are paper-register ink,
            so the whole play area has to be paper — on the cabinet they'd be
            dark-on-dark. */}
        <div
          className="w-full rounded-[6px] flex flex-col items-center gap-7"
          style={{
            background: "var(--paper-bg)",
            padding: "26px 24px 22px",
            maxWidth: 620,
          }}
        >
        {/* The sample sits on the neutral mat: a coloured surround would bias
            the very judgement being scored (simultaneous contrast). */}
        <div
          className="w-full rounded-[6px] flex items-center justify-center"
          style={{ background: "var(--mat-grey)", padding: 20, maxWidth: 560 }}
        >
          <div
            className="w-full rounded-[6px] flex flex-col items-center justify-center gap-2"
            style={{ background: challenge.bg, padding: "26px 20px" }}
          >
            <span
              style={{
                color: challenge.fg,
                fontSize: 15,
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {challenge.sample}
            </span>
            <span
              style={{
                color: challenge.fg,
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {challenge.sample}
            </span>
          </div>
        </div>

          <Rail
            pos={pos}
            onPos={setPos}
            locked={!!locked}
            truePos={locked ? challenge.target : null}
            guessRatio={guessRatio}
          />
        </div>
      </div>
    </GameLayout>
  );
}

function verdictText(ev: Evaluation): string {
  if (ev.passes.aaaBody) return "passes AAA";
  if (ev.passes.aaBody) return "passes AA";
  if (ev.passes.aaLarge) return "large text only";
  return "fails AA";
}

function Rail({
  pos,
  onPos,
  locked,
  truePos,
  guessRatio,
}: {
  pos: number;
  onPos: (p: number) => void;
  locked: boolean;
  truePos: number | null;
  guessRatio: number;
}) {
  const pct = (p: number) => `${p * 100}%`;

  return (
    <div className="w-full" style={{ maxWidth: 560 }}>
      <div className="relative" style={{ height: 54 }}>
        {/* Track */}
        <div
          className="absolute rounded-full"
          style={{
            left: 0,
            right: 0,
            top: 24,
            height: 4,
            background: "var(--paper-line)",
          }}
        />

        {/* WCAG landmarks — the numbers that actually decide things */}
        {LANDMARKS.map((lm) => {
          const p = ratioToPos(lm.ratio);
          return (
            <div key={lm.ratio} className="absolute" style={{ left: pct(p), top: 12 }}>
              <div
                style={{
                  width: 1,
                  height: 28,
                  background: "var(--paper-tick)",
                  transform: "translateX(-0.5px)",
                }}
              />
              <span
                className="absolute font-mono text-[9px] whitespace-nowrap"
                style={{
                  top: 30,
                  left: 0,
                  transform: "translateX(-50%)",
                  color: "var(--paper-dim)",
                }}
              >
                {lm.label}
              </span>
            </div>
          );
        })}

        {/* The truth, once revealed */}
        {truePos !== null && (
          <div
            className="absolute"
            style={{ left: pct(truePos), top: 8, transform: "translateX(-1px)" }}
          >
            <div style={{ width: 2, height: 36, background: "var(--truth-ink)" }} />
          </div>
        )}

        {/* The player's caret */}
        <div
          className="absolute"
          style={{ left: pct(pos), top: 8, transform: "translateX(-1px)" }}
        >
          <div
            style={{
              width: 2,
              height: 36,
              background: locked ? "var(--guess-ink)" : "var(--aim-ink)",
            }}
          />
        </div>

        {/* The real control. Transparent, laid over the drawn rail, so the
            visuals stay Focalism while keyboard and AT behaviour stay native. */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.002}
          value={pos}
          disabled={locked}
          onChange={(e) => onPos(Number(e.target.value))}
          aria-label="Your contrast ratio estimate"
          aria-valuetext={`${guessRatio.toFixed(1)} to 1`}
          className="contrast-rail absolute"
          style={{ left: 0, right: 0, top: 14, width: "100%", height: 24 }}
        />
      </div>

      <div className="flex items-baseline justify-between mt-5">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.09em]"
          style={{ color: "var(--paper-dim)" }}
        >
          1:1
        </span>
        <span
          className="font-display text-[20px]"
          style={{ color: locked ? "var(--guess-ink)" : "var(--paper-ink)" }}
        >
          {guessRatio.toFixed(1)}:1
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.09em]"
          style={{ color: "var(--paper-dim)" }}
        >
          21:1
        </span>
      </div>
    </div>
  );
}
