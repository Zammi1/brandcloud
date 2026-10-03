import { forwardRef, type HTMLAttributes } from "react";
import { cx } from "./utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = /* @__PURE__ */ forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, elevated = false, ...props },
  ref,
) {
  return <div ref={ref} className={cx("brand-card", className)} data-elevated={elevated || undefined} {...props} />;
});

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx("brand-badge", className)} {...props} />;
}
