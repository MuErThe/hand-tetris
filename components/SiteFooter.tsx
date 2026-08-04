// Site footer for the document pages (hub, about, focalism) — the SQUINT
// logomark on the left (linking home, tagline beneath), links on the right,
// and the arcade's basement underneath (see FooterRun). Game routes are
// full-viewport and footer-free.

import Link from "next/link";
import { FooterRun } from "./FooterRun";

const linkClass =
  "font-mono text-[10px] uppercase tracking-[0.08em] transition-colors hover:text-[var(--accent)]";

export function SiteFooter() {
  return (
    <footer
      className="w-full border-t mt-12"
      style={{ borderColor: "var(--panel-border)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 px-6 md:px-20 pt-7 pb-2">
        <div className="flex flex-col items-start gap-1.5">
          {/* The logomark is the way home. */}
          <Link href="/">
            <span
              className="font-display tracking-[0.14em] text-[40px] leading-none"
              style={{ color: "var(--ink)" }}
            >
              SQU<span style={{ color: "var(--accent)" }}>I</span>NT
            </span>
          </Link>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.1em]"
            style={{ color: "var(--ink-dim)" }}
          >
            <span style={{ fontSize: "1.4em", lineHeight: 1, verticalAlign: "-0.12em" }}>
              ©
            </span>{" "}
            2026 Zabeeh · built in{" "}
            <Link
              href="/focalism"
              className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--accent)]"
            >
              Focalism
            </Link>
          </span>
        </div>

        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link href="/about" className={linkClass} style={{ color: "var(--ink-dim)" }}>
            about
          </Link>
          <Link href="/warm-up" className={linkClass} style={{ color: "var(--ink-dim)" }}>
            daily warm-up
          </Link>
        </nav>

      </div>

      <FooterRun />
    </footer>
  );
}
