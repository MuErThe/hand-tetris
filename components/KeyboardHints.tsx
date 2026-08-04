interface KeyboardHintsProps {
  className?: string;
}

const HINTS: { keys: string[]; label: string }[] = [
  { keys: ["←", "→"], label: "move" },
  { keys: ["↑"], label: "rotate" },
  { keys: ["↓"], label: "soft drop" },
  { keys: ["space"], label: "hard drop" },
];

export function KeyboardHints({ className = "" }: KeyboardHintsProps) {
  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      {HINTS.map((h, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {h.keys.map((k, j) => (
              <kbd
                key={j}
                className="font-display text-[10px] tracking-[0.02em] inline-flex items-center justify-center rounded-[6px] border"
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderColor: "var(--panel-border-strong)",
                  color: "var(--ink)",
                  background:
                    "linear-gradient(180deg, var(--raise), rgba(0,0,0,0.18))",
                  boxShadow:
                    "inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 0 color-mix(in srgb, var(--accent) 5%, transparent)",
                }}
              >
                {k}
              </kbd>
            ))}
          </div>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.09em]"
            style={{ color: "var(--ink-dim)" }}
          >
            {h.label}
          </span>
        </div>
      ))}
    </div>
  );
}
