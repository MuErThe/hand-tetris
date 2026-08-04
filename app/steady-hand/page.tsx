"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, type GameResult } from "@/components/arcade/GameShell";
import { GameLayout } from "@/components/arcade/GameLayout";
import { RoundReveal } from "@/components/arcade/RoundReveal";
import { evaluate, generate, samplePath } from "@/lib/steadyhand/engine";
import {
  type Challenge,
  type Evaluation,
  type CurveType,
  type Pt,
  CURVE_TYPES,
  MAX_ROUND_POINTS,
  ROUNDS_PER_SESSION,
  TYPE_LABEL,
} from "@/lib/steadyhand/types";
import {
  STEADYHAND_COLUMNS,
  STEADYHAND_GAME,
} from "@/lib/steadyhand/leaderboard";
import { buildSequence } from "@/lib/learning/adaptive";
import { pickLesson } from "@/lib/learning/lessons";
import {
  recordSession,
  typeAccuracy,
  type RoundRecord,
} from "@/lib/learning/progress";
import { playSfx } from "@/lib/audio/sfx";

/** How near the start marker a stroke must begin, as a fraction of the box. */
const START_RADIUS = 0.09;

/**
 * Canvas cannot resolve `var(--…)`, so the tokens have to be read off the
 * document and handed over as concrete colours. Resolved once per frame rather
 * than per stroke call — one getComputedStyle, not six.
 */
function inkPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    band: v("--paper-line"),
    line: v("--paper-tick"),
    aim: v("--aim-ink"),
    truth: v("--truth-ink"),
    guess: v("--guess-ink"),
  };
}

export default function SteadyHandPage() {
  return (
    <GameShell
      gameId={STEADYHAND_GAME}
      title={
        <>
          Steady <span style={{ color: "var(--accent)" }}>Hand</span>
        </>
      }
      trains="hand control"
      pitch="eight curves, one stroke each. no undo, no easing — just how steady you actually are."
      howTo={[
        "press on the marker and trace the curve in a single stroke",
        "you're scored on how close you stayed and how much you covered",
        "cutting corners and drifting wide are measured separately",
      ]}
      columns={STEADYHAND_COLUMNS}
      eyebrow="steadiest hands"
      countNoun="hands"
      vignette="eyeball"
      accent="var(--c-L)"
    >
      {({ onFinish }) => <SteadyHandGame onFinish={onFinish} />}
    </GameShell>
  );
}

export function SteadyHandGame({
  onFinish,
  roundCount = ROUNDS_PER_SESSION,
  record = true,
}: {
  onFinish: (r: GameResult) => void;
  roundCount?: number;
  record?: boolean;
}) {
  const seqRef = useRef<CurveType[]>([]);
  const seenLessonsRef = useRef<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef({ w: 0, h: 0 });
  const traceRef = useRef<Pt[]>([]);
  const drawingRef = useRef(false);

  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [locked, setLocked] = useState<{
    ev: Evaluation;
    principle: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    seqRef.current = buildSequence(
      CURVE_TYPES,
      typeAccuracy(STEADYHAND_GAME),
      roundCount,
    );
    setChallenge(generate(seqRef.current[0]));
  }, [roundCount]);

  // Rendering
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || !challenge) return;
    const { w, h } = boxRef.current;
    if (!w || !h) return;
    const P = (p: Pt) => ({ x: p.x * w, y: p.y * h });
    const ink = inkPalette();

    ctx.clearRect(0, 0, w, h);

    const poly = samplePath(challenge.segments).map(P);

    // The path as a road to follow: a wide soft band with a hairline centre.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.strokeStyle = ink.band;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = ink.line;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // Start marker (filled) and end marker (hollow) — direction is part of
    // the task, so the two ends must never be confusable.
    const a = poly[0];
    const z = poly[poly.length - 1];
    ctx.fillStyle = ink.aim;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink.aim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ink.line;
    ctx.beginPath();
    ctx.arc(z.x, z.y, 7, 0, Math.PI * 2);
    ctx.stroke();

    // The stroke so far.
    const trace = traceRef.current.map(P);
    if (trace.length > 1) {
      ctx.beginPath();
      trace.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = locked ? ink.guess : ink.aim;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // On reveal, redraw the true path over the top so the gap is visible.
    if (locked) {
      ctx.beginPath();
      poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = ink.truth;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [challenge, locked]);

  const sizeCanvas = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    const ctx = cv.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    boxRef.current = { w: rect.width, h: rect.height };
    draw();
  }, [draw]);

  useEffect(() => {
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    return () => window.removeEventListener("resize", sizeCanvas);
  }, [sizeCanvas]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Interaction
  const toNorm = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const commit = useCallback(() => {
    if (!challenge || locked) return;
    const trace = traceRef.current;
    // Too short to be a stroke: treat as a slip, not an attempt.
    if (trace.length < 4) {
      traceRef.current = [];
      draw();
      return;
    }
    const ev = evaluate(challenge, trace);
    setRounds((rs) => [
      ...rs,
      { type: challenge.type, errorPct: ev.errorPct, points: ev.points },
    ]);
    setScore((s) => s + ev.points);
    const principle = pickLesson(
      STEADYHAND_GAME,
      challenge.type,
      ev.tag,
      seenLessonsRef.current,
    );
    playSfx(ev.points >= MAX_ROUND_POINTS * 0.85 ? "clearBig" : "lock");
    setLocked({ ev, principle });
  }, [challenge, locked, draw]);

  const next = useCallback(() => {
    const nextIdx = roundIdx + 1;
    if (nextIdx >= roundCount) {
      const meanError =
        rounds.reduce((a, r) => a + r.errorPct, 0) / (rounds.length || 1);
      const acc = Math.round(100 * (1 - meanError));
      const bestRound = rounds.reduce((m, r) => Math.max(m, r.points), 0);
      if (record) recordSession(STEADYHAND_GAME, score, rounds);
      const headline =
        acc >= 85 ? "Surgical" : acc >= 65 ? "Steady enough" : "Shaky";
      onFinish({
        score,
        meta: { acc, best: bestRound },
        stats: [
          { label: "accuracy", value: `${acc}%` },
          { label: "best round", value: bestRound },
          { label: "curves", value: roundCount },
        ],
        headline,
      });
      return;
    }
    traceRef.current = [];
    setRoundIdx(nextIdx);
    setLocked(null);
    setNudge(false);
    setChallenge(generate(seqRef.current[nextIdx]));
  }, [roundIdx, score, onFinish, roundCount, record, rounds]);

  if (!challenge) return null;

  const start = challenge.segments[0].p0;

  return (
    <GameLayout
      typeLabel={TYPE_LABEL[challenge.type]}
      roundIdx={roundIdx}
      roundCount={roundCount}
      score={score}
      prompt={
        locked
          ? "here's how you did →"
          : nudge
            ? "Start on the filled marker — the stroke has to begin there."
            : challenge.prompt
      }
      accent="var(--c-L)"
      results={rounds.map((r) => r.points / MAX_ROUND_POINTS)}
      reveal={
        locked ? (
          <RoundReveal
            show
            compact
            points={locked.ev.points}
            maxPoints={MAX_ROUND_POINTS}
            detail={`${locked.ev.guessDisplay} · ${locked.ev.targetDisplay} · ${locked.ev.errorDisplay}`}
            principle={locked.principle}
            isLast={roundIdx + 1 >= roundCount}
            onContinue={next}
          />
        ) : null
      }
    >
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className="relative w-full"
          style={{ maxWidth: 620, aspectRatio: "3 / 2", maxHeight: "100%" }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full rounded-[6px] border"
            style={{
              borderColor: "var(--panel-border-strong)",
              background: "var(--paper-bg)",
              cursor: locked ? "default" : "crosshair",
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              if (locked) return;
              const p = toNorm(e);
              // The stroke must begin at the marker, or direction and coverage
              // stop meaning anything.
              if (Math.hypot(p.x - start.x, p.y - start.y) > START_RADIUS) {
                setNudge(true);
                return;
              }
              e.currentTarget.setPointerCapture(e.pointerId);
              drawingRef.current = true;
              setNudge(false);
              traceRef.current = [p];
              draw();
            }}
            onPointerMove={(e) => {
              if (!drawingRef.current || locked) return;
              traceRef.current.push(toNorm(e));
              draw();
            }}
            onPointerUp={() => {
              if (!drawingRef.current) return;
              drawingRef.current = false;
              commit();
            }}
            onPointerCancel={() => {
              drawingRef.current = false;
              traceRef.current = [];
              draw();
            }}
          />
        </div>
      </div>
    </GameLayout>
  );
}
