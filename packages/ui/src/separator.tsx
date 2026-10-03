import { forwardRef, type HTMLAttributes } from "react";
import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { cx } from "./utils";

export type SeparatorOrientation = "horizontal" | "vertical";

export interface SeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "dir"> {
  orientation?: SeparatorOrientation;
  /** Purely visual rule: hidden from assistive technology. Defaults to false (a real separator). */
  decorative?: boolean;
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  { className, decorative = false, orientation = "horizontal", ...props },
  ref,
) {
  const classes = cx("brand-separator", className);
  if (decorative) {
    return <div ref={ref} className={classes} data-orientation={orientation} aria-hidden="true" {...props} />;
  }
  return <BaseSeparator ref={ref} className={classes} orientation={orientation} {...props} />;
});
