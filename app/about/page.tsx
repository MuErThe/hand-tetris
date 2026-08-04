import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/SiteFooter";
import { CATALOGUE } from "@/lib/games/registry";

export const metadata: Metadata = {
  title: "About — what Squint is and how it trains your eye",
  description:
    "Squint is a free arcade of five-minute games that train a designer's instincts: visual accuracy, kerning, colour perception and divergent thinking. How it works, what each game trains, and answers to common questions.",
  alternates: { canonical: "./" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Squint free?",
    a: "Yes. Squint is completely free, runs in your browser, and needs no account. Enter a player tag if you want your scores on the leaderboards; otherwise everything is saved locally on your device.",
  },
  {
    q: "Does my camera footage leave my device?",
    a: "No. The hand-tracked games (Hand Tetris and Thirty Circles) run MediaPipe hand tracking entirely on-device in your browser via WebAssembly. Video frames are never uploaded anywhere — the only network calls are fetching the model files and, if you opt in, submitting your name and score to the leaderboard.",
  },
  {
    q: "Who is Squint for?",
    a: "Designers, illustrators, typographers, art directors, students — anyone whose work depends on a trained eye. The games train visual judgement skills that transfer directly to design work: spotting a mis-centred element, uneven letter spacing, or an off colour.",
  },
  {
    q: "How long does a session take?",
    a: "About five minutes. Each game is a short session of quick rounds, and the Daily Warm-Up chains one round of four games — a different set sampled each day — into a single five-minute ritual with streak tracking.",
  },
  {
    q: "What is the Thirty Circles exercise?",
    a: "Thirty Circles is a classic divergent-thinking warm-up popularised by Bob McKim at Stanford and by IDEO: turn a page of thirty identical circles into thirty different recognisable things against a three-minute clock. It trains fluency (how many ideas), flexibility (how varied) and originality — the three dimensions of divergent thinking.",
  },
  {
    q: "How does Squint score colour matching?",
    a: "Colour Forge scores your mix against the target using CIEDE2000, the industry-standard perceptual colour-difference formula, computed in CIE Lab space. That means the score reflects how different the colours look to a human eye, not just how far apart the RGB numbers are — and the per-channel breakdown tells you whether you missed on hue, saturation or lightness.",
  },
  {
    q: "How does the kerning game know the correct spacing?",
    a: "Kern Combat measures the typeface's own kerned metrics in your browser and uses them as the target. You are graded against the spacing the type designer actually built into the font, expressed as a percentage accuracy per gap.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};


export default function AboutPage() {
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <div className="min-h-full flex flex-col items-center px-5 py-10 md:py-14">
        <article className="w-full" style={{ maxWidth: 720 }}>
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="font-mono text-[9px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--accent)]"
              style={{ color: "var(--ink-dim)" }}
            >
              ◂ back to the arcade
            </Link>
            <ThemeToggle />
          </div>

          <h1
            className="font-display tracking-[0.07em] leading-tight mt-6 mb-4"
            style={{ color: "var(--ink)", fontSize: "clamp(26px, 5vw, 40px)" }}
          >
            About <span style={{ color: "var(--accent)" }}>SQUINT</span>
          </h1>

          <p className="font-mono text-[13px] leading-relaxed mb-4" style={{ color: "var(--ink)" }}>
            Squint is a free arcade of five-minute games that train a designer&apos;s
            instincts. Great designers rely on a trained eye — for proportion,
            spacing, colour and ideas — and like any skill, that eye improves with
            deliberate practice and honest feedback. Squint turns that practice
            into short, replayable games.
          </p>
          <p className="font-mono text-[13px] leading-relaxed mb-8" style={{ color: "var(--ink-dim)" }}>
            Every round ends with a teach-back: the correct answer overlaid on
            yours, the error measured, and the design principle behind the miss.
            Progress is tracked locally so you can watch your accuracy trend over
            time, rounds adapt toward whatever you&apos;re worst at, and the Daily
            Warm-Up chains a fresh set of four games into a five-minute ritual
            before the real work begins. The interface itself is built in{" "}
            <Link href="/focalism" className="underline decoration-dotted underline-offset-4" style={{ color: "var(--accent)" }}>
              Focalism
            </Link>
            , a design language we invented where hierarchy is focus.
          </p>

          <h2 className="font-display text-[14px] tracking-[0.1em] mb-4" style={{ color: "var(--accent)" }}>
            The games
          </h2>
          <dl className="mb-8 flex flex-col gap-4">
            {CATALOGUE.map((g) => (
              <div key={g.id} className="rounded-[6px] border px-4 py-3" style={{ borderColor: "var(--panel-border)" }}>
                <dt className="font-display text-[13px] tracking-[0.04em] mb-1" style={{ color: "var(--ink)" }}>
                  {g.name}{" "}
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--ink-dim)" }}>
                    · trains {g.trainsLong}
                  </span>
                </dt>
                <dd className="font-mono text-[12px] leading-relaxed" style={{ color: "var(--ink-dim)" }}>
                  {g.how}
                </dd>
              </div>
            ))}
          </dl>

          <h2 className="font-display text-[14px] tracking-[0.1em] mb-4" style={{ color: "var(--accent)" }}>
            Questions
          </h2>
          <div className="flex flex-col gap-5 mb-10">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-mono text-[13px] font-bold mb-1" style={{ color: "var(--ink)" }}>
                  {q}
                </h3>
                <p className="font-mono text-[12px] leading-relaxed" style={{ color: "var(--ink-dim)" }}>
                  {a}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/"
            className="inline-block font-display tracking-[0.06em] text-[13px] px-6 py-3 border transition-all duration-150 hover-wash"
            style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
          >
            ▶ Play Squint
          </Link>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
