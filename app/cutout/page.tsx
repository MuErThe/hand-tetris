"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, type GameResult } from "@/components/arcade/GameShell";
import { GameLayout } from "@/components/arcade/GameLayout";
import { RoundReveal } from "@/components/arcade/RoundReveal";
import { describe, evaluate, generate } from "@/lib/cutout/engine";
import {
  type BoolOp,
  type Evaluation,
  type Round,
  type Shape,
  BOOL_OPS,
  MAX_ROUND_POINTS,
  OP_LABEL,
  ROUNDS_PER_SESSION,
} from "@/lib/cutout/types";
import { CUTOUT_COLUMNS, CUTOUT_GAME } from "@/lib/cutout/leaderboard";
import { buildSequence } from "@/lib/learning/adaptive";
import { pickLesson } from "@/lib/learning/lessons";
import {
  recordSession,
  typeAccuracy,
  type RoundRecord,
} from "@/lib/learning/progress";
import { playSfx } from "@/lib/audio/sfx";

/** Canvas cannot resolve `var(--…)`; read the tokens off the document. */
function inkPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    solid: v("--paper-ink"),
    line: v("--paper-tick"),
    faint: v("--paper-line"),
    truth: v("--truth-ink"),
    guess: v("--guess-ink"),
  };
}

function pathShape(
  ctx: CanvasRenderingContext2D,
  s: Shape,
  w: number,
  h: number,
) {
  const x = s.x * w;
  const y = s.y * h;
  const sw = s.w * w;
  const sh = s.h * h;
  ctx.beginPath();
  switch (s.kind) {
    case "rect":
      ctx.rect(x, y, sw, sh);
      break;
    case "circle":
      ctx.ellipse(x + sw / 2, y + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      break;
    case "roundrect":
      ctx.roundRect(x, y, sw, sh, (s.r ?? 0.22) * Math.min(sw, sh));
      break;
    case "triangle":
      ctx.moveTo(x + sw / 2, y);
      ctx.lineTo(x + sw, y + sh);
      ctx.lineTo(x, y + sh);
      ctx.closePath();
      break;
  }
}

/**
 * Boolean results come from the canvas compositor rather than any path maths:
 * `source-in`, `destination-out` and `xor` give exact set operations, which is
 * both simpler and more accurate than clipping polygons by hand.
 */
function renderBoolean(
  ctx: CanvasRenderingContext2D,
  round: Round,
  op: BoolOp,
  w: number,
  h: number,
  fill: string,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = fill;
  const fillA = () => {
    pathShape(ctx, round.a, w, h);
    ctx.fill();
  };
  const fillB = () => {
    pathShape(ctx, round.b, w, h);
    ctx.fill();
  };

  switch (op) {
    case "union":
      fillA();
      fillB();
      break;
    case "intersect":
      fillA();
      ctx.globalCompositeOperation = "source-in";
      fillB();
      break;
    case "subtract-ab":
      fillA();
      ctx.globalCompositeOperation = "destination-out";
      fillB();
      break;
    case "subtract-ba":
      fillB();
      ctx.globalCompositeOperation = "destination-out";
      fillA();
      break;
    case "exclude":
      fillA();
      ctx.globalCompositeOperation = "xor";
      fillB();
      break;
  }
  ctx.globalCompositeOperation = "source-over";
}

export default function CutoutPage() {
  return (
    <GameShell
      gameId={CUTOUT_GAME}
      title={
        <>
          Cut<span style={{ color: "var(--accent)" }}>out</span>
        </>
      }
      trains="boolean thinking"
      pitch="two shapes in, one shape out. name the operation that got you there."
      howTo={[
        "compare the A/B pair with the result, then pick the operation",
        "order matters — A minus B is not B minus A",
        "get it wrong and you'll see what your answer would have made",
      ]}
      columns={CUTOUT_COLUMNS}
      eyebrow="cleanest cuts"
      countNoun="cutters"
      vignette="kern"
      accent="var(--c-T)"
    >
      {({ onFinish }) => <CutoutGame onFinish={onFinish} />}
    </GameShell>
  );
}

export function CutoutGame({
  onFinish,
  roundCount = ROUNDS_PER_SESSION,
  record = true,
}: {
  onFinish: (r: GameResult) => void;
  roundCount?: number;
  record?: boolean;
}) {
  const seqRef = useRef<BoolOp[]>([]);
  const seenLessonsRef = useRef<Set<string>>(new Set());
  const roundStartRef = useRef(0);

  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [locked, setLocked] = useState<{
    ev: Evaluation;
    principle: string;
  } | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    seqRef.current = buildSequence(
      BOOL_OPS,
      typeAccuracy(CUTOUT_GAME),
      roundCount,
    );
    roundStartRef.current = performance.now();
    setRound(generate(seqRef.current[0]));
  }, [roundCount]);

  const choose = useCallback(
    (op: BoolOp) => {
      if (!round || locked) return;
      const elapsed = performance.now() - roundStartRef.current;
      if (elapsed < 200) return;
      const ev = evaluate(round, op, elapsed);
      setRounds((rs) => [
        ...rs,
        { type: round.type, errorPct: ev.errorPct, points: ev.points },
      ]);
      setScore((s) => s + ev.points);
      const principle = pickLesson(
        CUTOUT_GAME,
        round.type,
        ev.tag,
        seenLessonsRef.current,
      );
      playSfx(ev.correct ? "clearBig" : "lock");
      setLocked({ ev, principle });
    },
    [round, locked],
  );

  const next = useCallback(() => {
    const nextIdx = roundIdx + 1;
    if (nextIdx >= roundCount) {
      const caught = rounds.filter((r) => r.errorPct === 0).length;
      const acc = Math.round((100 * caught) / (rounds.length || 1));
      if (record) recordSession(CUTOUT_GAME, score, rounds);
      const headline =
        acc >= 90 ? "Clean cuts" : acc >= 60 ? "Mostly clean" : "Check the order";
      onFinish({
        score,
        meta: { acc, caught },
        stats: [
          { label: "correct", value: `${caught}/${rounds.length}` },
          { label: "accuracy", value: `${acc}%` },
          { label: "rounds", value: roundCount },
        ],
        headline,
      });
      return;
    }
    setRoundIdx(nextIdx);
    setLocked(null);
    roundStartRef.current = performance.now();
    setRound(generate(seqRef.current[nextIdx]));
  }, [roundIdx, score, onFinish, roundCount, record, rounds]);

  // Number keys as a speed aid; the buttons stay the accessible path.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return;
      const n = Number(e.key);
      if (n >= 1 && n <= BOOL_OPS.length) choose(BOOL_OPS[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, locked]);

  if (!round) return null;

  return (
    <GameLayout
      typeLabel="BOOLEAN"
      roundIdx={roundIdx}
      roundCount={roundCount}
      score={score}
      prompt={locked ? "here's what it was →" : round.prompt}
      accent="var(--c-T)"
      results={rounds.map((r) => r.points / MAX_ROUND_POINTS)}
      reveal={
        locked ? (
          <RoundReveal
            show
            compact
            points={locked.ev.points}
            maxPoints={MAX_ROUND_POINTS}
            detail={
              locked.ev.correct
                ? `${OP_LABEL[round.type]} — ${describe(round.type)}`
                : `it was ${OP_LABEL[round.type]} (${describe(round.type)}), not ${OP_LABEL[locked.ev.picked]}`
            }
            principle={locked.principle}
            isLast={roundIdx + 1 >= roundCount}
            onContinue={next}
          />
        ) : null
      }
    >
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5">
        <div
          className="w-full rounded-[6px] flex flex-wrap items-center justify-center gap-4"
          style={{ background: "var(--paper-bg)", padding: 18, maxWidth: 640 }}
        >
          <Panel label="the pair" round={round} mode="sources" />
          <span
            className="font-display text-[18px]"
            style={{ color: "var(--paper-dim)" }}
            aria-hidden="true"
          >
            →
          </span>
          <Panel label="the result" round={round} mode={round.type} />
          {locked && !locked.ev.correct && (
            <Panel
              label={`your answer · ${OP_LABEL[locked.ev.picked]}`}
              round={round}
              mode={locked.ev.picked}
              tone="guess"
            />
          )}
        </div>

        <fieldset
          className="flex flex-wrap items-center justify-center gap-2"
          disabled={!!locked}
        >
          <legend className="sr-only">Which boolean operation?</legend>
          {BOOL_OPS.map((op, i) => {
            const isAnswer = locked && op === round.type;
            const isPick = locked && op === locked.ev.picked;
            return (
              <button
                key={op}
                type="button"
                onClick={() => choose(op)}
                className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 rounded-[6px] border transition-colors hover-wash"
                style={{
                  borderColor: isAnswer
                    ? "var(--truth-ink)"
                    : isPick
                      ? "var(--guess-ink)"
                      : "var(--panel-border-strong)",
                  color: isAnswer
                    ? "var(--truth-ink)"
                    : isPick
                      ? "var(--guess-ink)"
                      : "var(--ink)",
                  fontWeight: isAnswer || isPick ? 700 : 400,
                }}
              >
                <span aria-hidden="true">{i + 1} · </span>
                {OP_LABEL[op]}
                {isAnswer ? " ✓" : isPick ? " ✕" : ""}
              </button>
            );
          })}
        </fieldset>
      </div>
    </GameLayout>
  );
}

function Panel({
  label,
  round,
  mode,
  tone,
}: {
  label: string;
  round: Round;
  /** "sources" draws A and B outlined; a BoolOp draws that operation's result. */
  mode: "sources" | BoolOp;
  tone?: "guess";
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    const ink = inkPalette();

    if (mode === "sources") {
      ctx.clearRect(0, 0, w, h);
      for (const [s, name] of [
        [round.a, "A"],
        [round.b, "B"],
      ] as const) {
        pathShape(ctx, s, w, h);
        ctx.fillStyle = ink.faint;
        ctx.fill();
        ctx.strokeStyle = ink.line;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = ink.solid;
        ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Label just outside the shape's top-left, so it never sits on the
        // overlap where it would be ambiguous which shape it names.
        ctx.fillText(name, (s.x + 0.06) * w, (s.y + 0.06) * h);
      }
    } else {
      renderBoolean(ctx, round, mode, w, h, tone === "guess" ? ink.guess : ink.solid);
    }
  }, [round, mode, tone]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <canvas
        ref={ref}
        className="rounded-[6px]"
        style={{ width: 150, height: 150, background: "var(--paper-bg)" }}
      />
      <span
        className="font-mono text-[9px] uppercase tracking-[0.09em]"
        style={{ color: tone === "guess" ? "var(--guess-ink)" : "var(--paper-dim)" }}
      >
        {label}
      </span>
    </div>
  );
}
