import { ReactNode } from "react";

interface PanelFrameProps {
  label: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  rightSlot?: ReactNode;
  /** Subtle subtitle shown below the label (uppercase mono, dim). */
  hint?: string;
}

/**
 * The panel. Surfaces first: a raised tonal step with a hairline, rather than
 * the bordered cabinet it used to be. The corner brackets that used to sit at
 * each corner were the arcade skin and have gone with it — the structure is
 * carried by tone and spacing now.
 */
export function PanelFrame({
  label,
  children,
  className = "",
  contentClassName = "",
  rightSlot,
  hint,
}: PanelFrameProps) {
  return (
    <div
      className={`panel-bg relative border overflow-hidden ${className}`}
      style={{
        borderColor: "var(--panel-border)",
        borderRadius: "var(--r-panel)",
      }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="flex flex-col">
          <span className="label-micro" style={{ color: "var(--ink-dim)" }}>
            {label}
          </span>
          {hint && (
            <span
              className="label-micro -mt-0.5"
              style={{ color: "var(--ink-dim)", opacity: 0.75 }}
            >
              {hint}
            </span>
          )}
        </div>
        <div className="flex-1" />
        {rightSlot}
      </div>

      <div className={`px-4 pb-4 ${contentClassName}`}>{children}</div>
    </div>
  );
}
