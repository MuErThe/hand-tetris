"use client";

// Theme choice — dark ("the cabinet") or light ("the studio"), defaulting to
// whatever the OS asks for. Local-only, same defensive localStorage pattern as
// lib/warmup/streak.ts.
//
// The resolved theme is stamped on <html data-theme> before first paint by the
// inline script below (see app/layout.tsx); everything else in the app just
// reads CSS custom properties, so nothing needs to subscribe to the theme.

const KEY = "arcade/v1/theme";

/** What the player asked for. "system" defers to prefers-color-scheme. */
export type ThemeChoice = "system" | "light" | "dark";
/** What that actually resolves to right now. */
export type ResolvedTheme = "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];

function isChoice(v: unknown): v is ThemeChoice {
  return v === "system" || v === "light" || v === "dark";
}

/** The stored choice, or "system" if nothing has been chosen (or storage is blocked). */
export function readChoice(): ThemeChoice {
  try {
    if (typeof window === "undefined") return "system";
    const raw = window.localStorage.getItem(KEY);
    return isChoice(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export function writeChoice(choice: ThemeChoice): void {
  try {
    if (typeof window === "undefined") return;
    // Storing "system" as an explicit value rather than removing the key keeps
    // "I deliberately chose to follow my OS" distinct from "never visited".
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* ignore — the theme still applies for this session */
  }
  listeners.forEach((cb) => cb());
}

const listeners = new Set<() => void>();

/**
 * Subscribe to changes in the stored choice — from this tab or another one.
 * Paired with readChoice as a useSyncExternalStore source, which is how the
 * control reads storage without a setState-in-effect on mount.
 */
export function subscribeChoice(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Server render has no storage to read; "system" matches the boot script. */
export function serverChoice(): ThemeChoice {
  return "system";
}

/** What the OS is currently asking for. */
export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === "system" ? systemTheme() : choice;
}

/** Stamp the resolved theme where CSS can see it. */
export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

/**
 * Runs blocking in <head> before first paint, so the page never flashes the
 * wrong theme. Deliberately duplicates the small amount of logic above rather
 * than importing it — this string ships as-is into the HTML, ahead of any
 * bundle. Kept to one line of real work; it must not throw on a browser with
 * storage disabled.
 *
 * Note it does not need to guard against an invalid stored value: anything
 * other than "light"/"dark" falls through to the media query.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem(${JSON.stringify(
  KEY,
)});var t=(c==="light"||c==="dark")?c:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;
