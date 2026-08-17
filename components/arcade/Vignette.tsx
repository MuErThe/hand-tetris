// Living previews for the hub cards: one tiny animated scene per game.
// All motion is CSS keyframes (defined in globals.css, frozen under
// prefers-reduced-motion); this component is markup only, so it stays a
// server component and costs nothing at runtime.

export type VignetteKind =
  | "tetris"
  | "eyeball"
  | "kern"
  | "colour"
  | "circles"
  | "boolean"
  | "steady"
  | "doubletake"
  | "warmup";

interface VignetteProps {
  kind: VignetteKind;
  /** CSS colour the scene is keyed to (usually the game's accent var). */
  tint: string;
  /**
   * Full-bleed: the scene crops to cover its box rather than letterboxing,
   * and drops the wash background because the plate underneath supplies the
   * ground. Scene compositions keep their subject clear of the outer edges
   * and the bottom third, which is where the crop and the scrim bite.
   */
  fill?: boolean;
  /** Use the portrait viewBox: for the featured plate's tall cell. */
  tall?: boolean;
  className?: string;
}

export function Vignette({
  kind,
  tint,
  fill = false,
  tall = false,
  className = "",
}: VignetteProps) {
  const portrait = tall && kind in TALL_SCENES;
  const scene = portrait ? TALL_SCENES[kind]! : SCENES[kind];

  return (
    <div
      aria-hidden
      className={`vg-anim relative w-full overflow-hidden ${className}`}
      style={{
        background: fill
          ? `radial-gradient(115% 80% at 50% 26%, color-mix(in srgb, ${tint} 24%, transparent), transparent 70%)`
          : `linear-gradient(180deg, color-mix(in srgb, ${tint} 8%, transparent), var(--recess))`,
      }}
    >
      <svg
        viewBox={portrait ? "0 0 100 120" : "0 0 160 72"}
        preserveAspectRatio={fill ? "xMidYMid slice" : "xMidYMid meet"}
        className="w-full h-full block"
      >
        {scene(tint)}
      </svg>
    </div>
  );
}

const INK = "color-mix(in srgb, var(--ink) 85%, transparent)";
const DIM = "color-mix(in srgb, var(--ink) 42%, transparent)";

const SCENES: Record<VignetteKind, (tint: string) => React.ReactNode> = {
  tetris: (tint) => (
    <>
      {/* settled stack */}
      <g fill={DIM}>
        <rect x="42" y="58" width="10" height="10" />
        <rect x="52" y="58" width="10" height="10" />
        <rect x="62" y="58" width="10" height="10" />
        <rect x="96" y="58" width="10" height="10" />
        <rect x="106" y="58" width="10" height="10" />
        <rect x="106" y="48" width="10" height="10" />
      </g>
      {/* falling T piece */}
      <g style={{ animation: "vg-fall 3.2s ease-in infinite" }} fill={tint}>
        <rect x="66" y="28" width="10" height="10" />
        <rect x="76" y="28" width="10" height="10" />
        <rect x="86" y="28" width="10" height="10" />
        <rect x="76" y="38" width="10" height="10" />
      </g>
      {/* falling I piece, offset cycle */}
      <g
        style={{ animation: "vg-fall 3.2s ease-in 1.6s infinite" }}
        fill={INK}
        opacity="0.5"
      >
        <rect x="118" y="18" width="8" height="8" />
        <rect x="126" y="18" width="8" height="8" />
        <rect x="134" y="18" width="8" height="8" />
      </g>
    </>
  ),

  eyeball: (tint) => (
    <>
      {/* target mark */}
      <rect x="77" y="33" width="6" height="6" fill="none" stroke={tint} strokeWidth="1.2" />
      {/* lock-on ping */}
      <circle
        cx="80"
        cy="36"
        r="12"
        fill="none"
        stroke={tint}
        strokeWidth="1"
        style={{ animation: "vg-ping 3.4s ease-out infinite", transformOrigin: "80px 36px" }}
      />
      {/* wandering crosshair */}
      <g style={{ animation: "vg-seek-x 3.4s ease-in-out infinite" }}>
        <g style={{ animation: "vg-seek-y 3.4s ease-in-out infinite" }}>
          <line x1="80" y1="6" x2="80" y2="66" stroke={INK} strokeWidth="0.8" opacity="0.7" />
          <line x1="20" y1="36" x2="140" y2="36" stroke={INK} strokeWidth="0.8" opacity="0.7" />
        </g>
      </g>
    </>
  ),

  // cutout: two shapes overlap and the shared region keeps being selected
  boolean: (tint) => (
    <>
      <defs>
        <clipPath id="vg-boolean-overlap">
          <circle cx="72" cy="32" r="16" />
        </clipPath>
      </defs>
      <circle cx="72" cy="32" r="16" fill="none" stroke={INK} strokeWidth="1.5" />
      <rect
        x="78"
        y="18"
        width="28"
        height="28"
        rx="6"
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
      />
      <g clipPath="url(#vg-boolean-overlap)">
        <rect
          x="78"
          y="18"
          width="28"
          height="28"
          rx="6"
          fill={tint}
          style={{ animation: "vg-boolean 4s ease-in-out infinite" }}
        />
      </g>
    </>
  ),
  kern: (tint) => (
    <>
      {/* baseline */}
      <line x1="34" y1="44" x2="126" y2="44" stroke={DIM} strokeWidth="1" />
      <g
        fontFamily="var(--font-kern), serif"
        fontWeight="600"
        fontSize="34"
        fill={INK}
      >
        <text x="48" y="43" style={{ animation: "vg-kern-l 4s ease-in-out infinite" }}>
          A
        </text>
        <text x="72" y="43" fill={tint}>
          V
        </text>
        <text x="96" y="43" style={{ animation: "vg-kern-r 4s ease-in-out infinite" }}>
          A
        </text>
      </g>
    </>
  ),

  colour: (tint) => (
    <>
      {/* target chip */}
      <rect x="46" y="8" width="34" height="34" fill={tint} />
      {/* mix chip sweeping hue until the seam disappears */}
      <rect
        x="80"
        y="8"
        width="34"
        height="34"
        fill={tint}
        style={{ animation: "vg-hue 3.6s ease-in-out infinite" }}
      />
      <rect x="46" y="8" width="68" height="34" fill="none" stroke={DIM} strokeWidth="1" />
    </>
  ),

  circles: (tint) => (
    <>
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => (
          <circle
            key={`${c}-${r}`}
            cx={50 + c * 30}
            cy={16 + r * 20}
            r="9"
            fill="none"
            stroke={DIM}
            strokeWidth="1"
          />
        )),
      )}
      {/* one circle becomes a smiley: stroke-drawn doodle */}
      <g stroke={tint} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path
          d="M 76 37 Q 80 41 84 37 M 77 32 L 77 34 M 83 32 L 83 34"
          strokeDasharray="60"
          style={{ animation: "vg-draw 3.8s ease-in-out infinite" }}
        />
      </g>
    </>
  ),

  // steady hand: a curve tracing itself in one stroke from the start marker
  steady: (tint) => (
    <>
      <path
        d="M 30 44 C 60 8, 100 52, 130 16"
        fill="none"
        stroke={DIM}
        strokeWidth="1.5"
      />
      <path
        d="M 30 44 C 60 8, 100 52, 130 16"
        fill="none"
        stroke={tint}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="140"
        style={{ animation: "vg-trace 3.6s ease-in-out infinite" }}
      />
      <circle cx="30" cy="44" r="3" fill="none" stroke={tint} strokeWidth="1.2" />
    </>
  ),

  // double take: twin cards, one detail wrong, and it blinks at you
  doubletake: (tint) => (
    <>
      <rect x="36" y="8" width="40" height="36" rx="3" fill="none" stroke={INK} strokeWidth="1.2" />
      <rect x="84" y="8" width="40" height="36" rx="3" fill="none" stroke={INK} strokeWidth="1.2" />
      <line x1="42" y1="17" x2="70" y2="17" stroke={DIM} strokeWidth="2" />
      <line x1="90" y1="17" x2="118" y2="17" stroke={DIM} strokeWidth="2" />
      <line x1="42" y1="25" x2="64" y2="25" stroke={DIM} strokeWidth="2" />
      <line
        x1="94"
        y1="26.5"
        x2="116"
        y2="26.5"
        stroke={tint}
        strokeWidth="2"
        style={{ animation: "vg-blink 3.2s ease-in-out infinite" }}
      />
      <line x1="42" y1="36" x2="56" y2="36" stroke={DIM} strokeWidth="2" />
      <line x1="90" y1="36" x2="104" y2="36" stroke={DIM} strokeWidth="2" />
    </>
  ),

  warmup: (tint) => (
    <>
      {/* flame */}
      <path
        d="M 80 14 Q 88 24 84 32 Q 92 30 92 40 Q 92 52 80 52 Q 68 52 68 40 Q 68 32 74 26 Q 78 22 80 14 Z"
        fill={tint}
        opacity="0.9"
        style={{ animation: "vg-flicker 1.6s ease-in-out infinite", transformOrigin: "80px 44px" }}
      />
      {/* four step dots filling in sequence */}
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={62 + i * 12}
          cy={64}
          r="2.4"
          fill={INK}
          style={{ animation: `vg-dot 3.2s linear ${i * 0.5}s infinite` }}
        />
      ))}
    </>
  ),
};

/**
 * Portrait scenes for the featured plate, drawn in a 100×120 viewBox. Only
 * the games that can hold the tall cell need one; anything without an entry
 * falls back to its landscape scene, cropped to fill.
 */
const TALL_SCENES: Partial<Record<VignetteKind, (tint: string) => React.ReactNode>> = {
  // An 8-column well on a 7-unit grid: x 22→78, floor at y 77 where the
  // scrim starts. Finer than the landscape scene because the featured cell
  // renders it three times larger.
  tetris: (tint) => (
    <>
      <rect
        x="22"
        y="8"
        width="56"
        height="69"
        fill="none"
        stroke={DIM}
        strokeWidth="0.8"
      />
      {/* settled stack */}
      <g fill={DIM}>
        <rect x="22" y="70" width="7" height="7" />
        <rect x="29" y="70" width="7" height="7" />
        <rect x="36" y="70" width="7" height="7" />
        <rect x="43" y="70" width="7" height="7" />
        <rect x="57" y="70" width="7" height="7" />
        <rect x="64" y="70" width="7" height="7" />
        <rect x="71" y="70" width="7" height="7" />
        <rect x="64" y="63" width="7" height="7" />
        <rect x="71" y="63" width="7" height="7" />
        <rect x="22" y="63" width="7" height="7" />
      </g>
      {/* falling T piece */}
      <g style={{ animation: "vg-fall-tall 3.2s ease-in infinite" }} fill={tint}>
        <rect x="36" y="26" width="7" height="7" />
        <rect x="43" y="26" width="7" height="7" />
        <rect x="50" y="26" width="7" height="7" />
        <rect x="43" y="33" width="7" height="7" />
      </g>
      {/* falling I piece, offset cycle */}
      <g
        style={{ animation: "vg-fall-tall 3.2s ease-in 1.6s infinite" }}
        fill={INK}
        opacity="0.5"
      >
        <rect x="29" y="10" width="7" height="7" />
        <rect x="36" y="10" width="7" height="7" />
        <rect x="43" y="10" width="7" height="7" />
        <rect x="50" y="10" width="7" height="7" />
      </g>
    </>
  ),
};
