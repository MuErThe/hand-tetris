"use client";

import { useEffect, useSyncExternalStore } from "react";
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

const LABELS: Record<ThemeChoice, string> = {
  system: "auto",
  light: "light",
  dark: "dark",
};

// Each description opens with the visible label so the accessible name
// contains it — speech-input users say what they can see (WCAG 2.5.3).
const DESCRIPTIONS: Record<ThemeChoice, string> = {
  system: "Auto — follow my system setting",
  light: "Light theme",
  dark: "Dark theme",
};

/**
 * Three-state theme control: auto (follow the OS), light, dark.
 *
 * Radios rather than a two-state switch because "follow my system" is a real
 * third choice — a plain toggle would strand anyone who tapped it once with no
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
        // and springs back a hair past rest — the same mechanism language
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
          <span className="theme-seg__text" aria-hidden="true">
            {LABELS[c]}
          </span>
          <span className="sr-only">{DESCRIPTIONS[c]}</span>
        </motion.label>
      ))}
    </fieldset>
  );
}
