import Link from "next/link";
import { WarmUpBanner } from "@/components/arcade/WarmUpBanner";
import { CardStats } from "@/components/arcade/CardStats";
import { Vignette } from "@/components/arcade/Vignette";
import { AccountMenu } from "@/components/AccountMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/SiteFooter";
import { GAMES, type GameDef } from "@/lib/games/registry";

export default function Hub() {
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="min-h-full flex flex-col items-center px-5 md:px-20 py-10 md:py-12">
        {/* Top navbar: the wordmark sits left (the I is the eye);
            theme and account live on the right, not over a play surface. */}
        <header className="w-full flex items-center justify-between mb-8">
          <h1 className="flex flex-col items-start gap-1.5 text-left">
            <span
              className="font-display tracking-[0.1em] leading-none text-[30px]"
              style={{ color: "var(--ink)" }}
            >
              SQU
              <span className="focal-breathe" style={{ color: "var(--accent)" }}>
                I
              </span>
              NT
            </span>
            <span
              className="font-display text-[9px] tracking-[0.16em] uppercase"
              style={{ color: "var(--accent)" }}
            >
              train the eye you trust
            </span>
          </h1>
          <div className="flex items-center justify-end gap-4">
            <ThemeToggle />
            <span
              aria-hidden
              className="self-center h-5 w-px"
              style={{ background: "var(--panel-border)" }}
            />
            <AccountMenu />
          </div>
        </header>

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
      </div>
      <SiteFooter />
    </main>
  );
}

function GameCard({ game }: { game: GameDef }) {
  return (
    <Link
      href={game.path}
      className="bento-card plate-card group rounded-[10px] overflow-hidden flex flex-col justify-end"
      style={{ "--tint": game.tint, gridArea: game.area } as React.CSSProperties}
    >
      {/* The living preview runs edge to edge behind everything; the scrim
          over it puts the copy back on a known colour, so contrast holds
          whatever frame the animation is on.

          The featured cell is only tall once the bento goes multi-column, so
          its portrait scene is swapped in at the same 900px breakpoint the
          grid uses: below that the cell is an ordinary wide tile. */}
      <div
        className={`absolute inset-0 ${game.wide ? "mx-auto max-w-[720px]" : ""}`}
      >
        {game.featured && (
          <Vignette
            kind={game.vignette}
            tint={game.tint}
            fill
            tall
            className="h-full hidden min-[900px]:block"
          />
        )}
        <Vignette
          kind={game.vignette}
          tint={game.tint}
          fill
          className={`h-full ${game.featured ? "min-[900px]:hidden" : ""}`}
        />
      </div>
      <div aria-hidden className="plate-scrim absolute inset-0" />

      <span
        className="plate-chip absolute top-3 left-3 font-mono text-[8px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-[6px] border"
        style={{ color: game.tint, borderColor: "var(--panel-border)" }}
      >
        {game.trains}
      </span>

      <div className="relative flex flex-col gap-2 p-4">
        <h2
          className="font-display tracking-[0.04em] leading-none"
          style={{ color: "var(--ink)", fontSize: game.featured ? 40 : 30 }}
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
