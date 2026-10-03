import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cx } from "./utils";

export interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Semantic emphasis for the revealed action surface. */
  emphasis?: "accent" | "neutral";
}

/** A semantic inline action that reveals its button surface during interaction. */
export const TextButton = forwardRef<HTMLButtonElement, TextButtonProps>(function TextButton(
  {
    children,
    className,
    emphasis = "accent",
    style,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx("brand-text-button", className)} data-emphasis={emphasis} style={style} {...props}>
      <span className="brand-text-button__highlight" aria-hidden="true" />
      <span className="brand-text-button__label">{children}</span>
    </button>
  );
});
