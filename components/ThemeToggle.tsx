"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { playSfx } from "@/lib/audio/sfx";
import {
  applyTheme,
  readChoice,
  resolveTheme,
  serverChoice,
  subscribeChoice,
  writeChoice,
  THEME_CHOICES,
  type ThemeChoice,
} from "@/lib/theme";

// Icons carry the options; the sr-only descriptions below carry the words.
// Stroke follows currentColor, so the existing segment states colour them.
const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const ICONS: Record<ThemeChoice, ReactNode> = {
  system: (
    <svg {...ICON_PROPS}>
      <rect x="2" y="3" width="12" height="8" rx="1.2" />
      <path d="M5.5 13.5h5" />
    </svg>
  ),
  light: (
    <svg {...ICON_PROPS}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.2v1.8M8 13v1.8M1.2 8H3M13 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3" />
    </svg>
  ),
  dark: (
    <svg {...ICON_PROPS}>
      <path d="M13.2 9.2A5.6 5.6 0 1 1 6.8 2.8a4.4 4.4 0 0 0 6.4 6.4Z" />
    </svg>
  ),
};

// The accessible name for each option: speech-input users can still say
// "auto", "light" or "dark" (WCAG 2.5.3 keeps working without visible text
// because these are the whole name).
const DESCRIPTIONS: Record<ThemeChoice, string> = {
  system: "Auto: follow my system setting",
  light: "Light theme",
  dark: "Dark theme",
};

/**
 * Three-state theme control: auto (follow the OS), light, dark.
 *
 * Radios rather than a two-state switch because "follow my system" is a real
 * third choice: a plain toggle would strand anyone who tapped it once with no
 * way back to automatic.
 *
 * The theme itself is already on <html> before this mounts (see
 * THEME_BOOT_SCRIPT); this only renders which option is selected, so it starts
 * on "auto" to match the server render and corrects after hydration.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeChoice, readChoice, serverChoice);
  const reduced = useReducedMotion();

  // Apply whatever the current choice resolves to. Driven by the store rather
  // than by the click handler, so a change made in another tab lands here too.
  useEffect(() => {
    applyTheme(resolveTheme(choice));
  }, [choice]);

  // While on "auto", follow the OS if it changes mid-session (a scheduled
  // sunset switch, say) without needing a reload.
  useEffect(() => {
    if (choice !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme(resolveTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  return (
    <fieldset className={`theme-seg ${className}`}>
      <legend className="sr-only">Theme</legend>
      {THEME_CHOICES.map((c) => (
        // Presses like a detent: the segment dips under the finger, ticks,
        // and springs back a hair past rest: the same mechanism language
        // as the Detent button.
        <motion.label
          key={c}
          className="theme-seg__opt"
          whileTap={reduced ? undefined : { scale: 0.94 }}
          transition={{ type: "spring", stiffness: 520, damping: 13, mass: 0.5 }}
        >
          <input
            type="radio"
            name="squint-theme"
            value={c}
            checked={choice === c}
            onChange={() => {
              playSfx("step");
              writeChoice(c);
            }}
            className="sr-only"
          />
          {/* The selection is one element that slides between segments rather
              than three that blink on and off. layoutId does the travelling;
              the fill and weight still come from CSS, so the control degrades
              to the plain segmented look without motion. */}
          {choice === c && !reduced && (
            <motion.span
              layoutId="theme-seg-active"
              className="theme-seg__marker"
              // Under-damped to match the detent press: the pill overshoots
              // its landing and settles, rather than easing politely in.
              transition={{ type: "spring", stiffness: 520, damping: 13, mass: 0.5 }}
            />
          )}
          <span className="theme-seg__text" title={DESCRIPTIONS[c]}>
            {ICONS[c]}
          </span>
          <span className="sr-only">{DESCRIPTIONS[c]}</span>
        </motion.label>
      ))}
    </fieldset>
  );
}
