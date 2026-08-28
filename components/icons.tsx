// Small inline icons in place of emoji, so they take the current colour,
// render the same on every platform and sit on the text baseline. All are
// decorative: the text beside them carries the meaning, so they are hidden
// from assistive tech. Stroke icons on a 24px grid, drawn with the same
// 1.75 stroke so they read as one family.

import type { SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Rendered size in px; defaults to 1em so it follows the text. */
  size?: number | string;
}

function base({ size = "1em", style, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    style: { display: "inline-block", verticalAlign: "-0.15em", flexShrink: 0, ...style },
    ...rest,
  };
}

/** The leaderboard cup. */
export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3" />
      <path d="M16 6h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3" />
      <path d="M12 14v4" />
      <path d="M8 20h8" />
      <path d="M10 18h4v2h-4z" />
    </svg>
  );
}

/** A podium medal: the ribbon and the disc. */
export function MedalIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3l2 6" />
      <path d="M16 3l-2 6" />
      <path d="M8 3h3l1 3 1-3h3" />
      <circle cx="12" cy="14" r="5" />
      <path d="M12 12v4" />
    </svg>
  );
}

/**
 * The streak flame. `lit` fills it with the current colour; unlit is the
 * outline only, so the difference never rests on colour alone.
 */
export function FlameIcon({ lit = true, ...props }: IconProps & { lit?: boolean }) {
  return (
    <svg {...base(props)} fill={lit ? "currentColor" : "none"}>
      <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5.2 1.2.8 2 1.5 2.5C11.5 8.5 11 5.5 12 3z" />
    </svg>
  );
}

/** Privacy lock for the on-device notes. */
export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </svg>
  );
}
