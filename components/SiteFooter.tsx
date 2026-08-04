"use client";

// Site footer for the document pages (hub, about, focalism) — a navbar-like
// row with the SQUINT logomark at centre (linking home, tagline beneath),
// links and the theme control flanking it, and the arcade's basement
// underneath (see FooterRun). Game routes are full-viewport and footer-free.

import Link from "next/link";
import { LayoutGroup } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { FooterRun } from "./FooterRun";

const linkClass =
  "font-mono text-[10px] uppercase tracking-[0.08em] transition-colors hover:text-[var(--accent)]";

export function SiteFooter() {
  return (
    <footer
      className="w-full border-t mt-12"
      style={{ borderColor: "var(--panel-border)" }}
    >
      <div
        className="grid items-center gap-y-5 px-6 pt-7 pb-2"
        style={{
          maxWidth: 1020,
          marginInline: "auto",
          gridTemplateColumns: "1fr auto 1fr",
        }}
      >
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link href="/about" className={linkClass} style={{ color: "var(--ink-dim)" }}>
            about
          </Link>
          <Link href="/focalism" className={linkClass} style={{ color: "var(--ink-dim)" }}>
            focalism
          </Link>
        </nav>

        {/* The logomark is the centre of the navbar and the way home. */}
        <Link href="/" className="flex flex-col items-center gap-1 px-6">
          <span
            className="font-display tracking-[0.14em] text-[18px] leading-none"
            style={{ color: "var(--ink)" }}
          >
            SQU<span style={{ color: "var(--accent)" }}>I</span>NT
          </span>
          <span
            className="font-mono text-[8px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ink-dim)" }}
          >
            train the eye you trust
          </span>
        </Link>

        <div className="flex items-center justify-end gap-5">
          <Link href="/warm-up" className={linkClass} style={{ color: "var(--ink-dim)" }}>
            daily warm-up
          </Link>
          {/* Namespaced so the pill never tries to travel to the hub
              header's toggle — layoutIds are global otherwise. */}
          <LayoutGroup id="footer-theme">
            <ThemeToggle />
          </LayoutGroup>
        </div>

        <p
          className="font-mono text-[8px] uppercase tracking-[0.1em] text-center"
          style={{ color: "var(--ink-dim)", gridColumn: "1 / -1" }}
        >
          © 2026 Zabeeh · built in{" "}
          <Link
            href="/focalism"
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--accent)]"
          >
            Focalism
          </Link>
        </p>
      </div>

      <FooterRun />
    </footer>
  );
}
