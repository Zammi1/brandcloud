import { type HTMLAttributes, type ReactNode } from "react";

import { cx } from "./utils";

export interface StatusPillActionProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  status: ReactNode;
  /** Decorative by default. Put equivalent status text in the action's accessible name. */
  statusAriaHidden?: boolean;
  /** Shows a restrained activity marker without changing the accessible label. */
  active?: boolean;
  emphasis?: "accent" | "neutral";
}

/** Positions a compact status pill beneath a consumer-owned link or button. */
export function StatusPillAction({
  active = false,
  children,
  className,
  status,
  statusAriaHidden = true,
  emphasis = "accent",
  style,
  ...props
}: StatusPillActionProps) {
  return (
    <span className={cx("brand-status-pill-action", className)} data-emphasis={emphasis} style={style} {...props}>
      <span className="brand-status-pill-action__control">{children}</span>
      <span className="brand-status-pill-action__pill" aria-hidden={statusAriaHidden || undefined}>
        {active ? (
          <span className="brand-status-pill-action__signal" aria-hidden="true">
            <span className="brand-status-pill-action__pulse" />
            <span className="brand-status-pill-action__dot" />
          </span>
        ) : null}
        {status}
      </span>
    </span>
  );
}

export interface HandwrittenActionProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  note: ReactNode;
  /** Decorative by default. Set false when the note adds information absent from the action label. */
  noteAriaHidden?: boolean;
  emphasis?: "accent" | "neutral";
  noteStyle?: "handwritten" | "plain";
  tone?: "light" | "dark";
}

/** Pairs a handwritten-style annotation with a consumer-owned link or button. */
export function HandwrittenAction({
  children,
  className,
  note,
  noteAriaHidden = true,
  emphasis = "accent",
  noteStyle = "handwritten",
  style,
  tone = "light",
  ...props
}: HandwrittenActionProps) {
  return (
    <span className={cx("brand-handwritten-action", className)} data-emphasis={emphasis} data-note-style={noteStyle} data-tone={tone} style={style} {...props}>
      <span className="brand-handwritten-action__note" aria-hidden={noteAriaHidden || undefined}>{note}</span>
      <span className="brand-handwritten-action__control">{children}</span>
    </span>
  );
}
