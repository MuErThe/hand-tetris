import Link from "next/link";
import { WarmUpBanner } from "@/components/arcade/WarmUpBanner";
import { CardStats } from "@/components/arcade/CardStats";
import { Vignette } from "@/components/arcade/Vignette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GAMES, type GameDef } from "@/lib/games/registry";

export default function Hub() {
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="min-h-full flex flex-col items-center px-5 py-10 md:py-12">
        {/* Theme lives on the hub, not over a play surface — you set it once
            on the way in and the games stay uncluttered. */}
        <div className="w-full flex justify-end mb-4" style={{ maxWidth: 1020 }}>
          <ThemeToggle />
        </div>

        {/* Wordmark — the I is the eye */}
        <div
          className="font-display text-[10px] tracking-[0.14em] mb-3"
          style={{ color: "var(--accent)" }}
        > train the eye you trust </div>
        <h1
          className="font-display tracking-[0.08em] leading-[0.95] text-center mb-3"
          style={{ color: "var(--ink)", fontSize: "clamp(34px, 8vw, 60px)" }}
        >
          SQU
          <span
            className="focal-breathe"
            style={{
              color: "var(--accent)",
            }}
          >
            I
          </span>
          NT
        </h1>
        <p
          className="font-mono text-[11px] md:text-[12px] tracking-[0.1em] text-center mb-8"
          style={{ color: "var(--ink-dim)", maxWidth: 440 }}
        >
          five-minute games that sharpen a designer's eye, hand and imagination.
        </p>

        {/* Bento */}
        <div className="hub-bento">
          <WarmUpBanner />
          {GAMES.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>

        <p
          className="font-mono text-[9px] uppercase tracking-[0.1em] mt-10 text-center"
          style={{ color: "var(--ink-dim)", opacity: 0.7 }}
        >
          🔒 camera games run entirely on-device · nothing leaves your browser
        </p>
        <div className="flex items-center gap-5 mt-2">
          <Link
            href="/about"
            className="font-mono text-[9px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--ink-dim)" }}
          >
            what is squint? →
          </Link>
          <Link
            href="/focalism"
            className="font-mono text-[9px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--ink-dim)" }}
          >
            our design language →
          </Link>
        </div>
      </div>
    </main>
  );
}

function GameCard({ game }: { game: GameDef }) {
  return (
    <Link
      href={game.path}
      className="bento-card group panel-bg rounded-[6px] overflow-hidden flex flex-col"
      style={{ "--tint": game.tint, gridArea: game.area } as React.CSSProperties}
    >
      {/* Living preview */}
      {/* The vignette SVG is 160:72, so with an auto-height box its height
          tracks the card's width — a full-width card would get a ~460px
          preview. Non-featured cards get a fixed band instead and the scene
          letterboxes within it. */}
      <div
        className={game.featured ? "flex-1" : "shrink-0"}
        style={game.featured ? { minHeight: 150 } : { height: 132 }}
      >
        <Vignette kind={game.vignette} tint={game.tint} className="h-full" />
      </div>

      <div className="flex flex-col gap-2 p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <span
            className="font-mono text-[8px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-[6px] border"
            style={{ color: game.tint, borderColor: "var(--panel-border)" }}
          >
            {game.trains}
          </span>
        </div>

        <h2
          className="font-display tracking-[0.04em] leading-none"
          style={{ color: "var(--ink)", fontSize: game.featured ? 26 : 20 }}
        >
          {game.title}
          {game.titleTight ? "" : " "}
          <span style={{ color: "var(--accent)" }}>{game.titleAccent}</span>
        </h2>

        <p
          className="font-mono text-[10.5px] leading-snug"
          style={{ color: "var(--ink-dim)" }}
        >
          {game.blurb}
        </p>

        {game.tracksProgress && <CardStats gameId={game.id} unit={game.unit} />}
      </div>
    </Link>
  );
}
