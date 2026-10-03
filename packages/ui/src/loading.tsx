import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { cx } from "./utils";

export type SpinnerSize = "sm" | "md" | "lg";

function toCustomPropertyLength(value: string | number): string {
  return typeof value === "number" ? `${value}px` : value;
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  shimmer?: boolean;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(
    {
      "aria-hidden": ariaHidden = true,
      borderRadius,
      className,
      height,
      shimmer = false,
      width,
      ...props
    },
    ref,
  ) {
    const style: CSSProperties = {
      ...props.style,
      ...(width === undefined ? null : { "--brand-skeleton-width": toCustomPropertyLength(width) }),
      ...(height === undefined ? null : { "--brand-skeleton-height": toCustomPropertyLength(height) }),
      ...(borderRadius === undefined
        ? null
        : { "--brand-skeleton-radius": toCustomPropertyLength(borderRadius) }),
    } as CSSProperties;

    return (
      <div
        {...props}
        ref={ref}
        style={style}
        className={cx("brand-skeleton", className)}
        aria-hidden={ariaHidden}
        data-shimmer={shimmer || undefined}
      />
    );
  },
);

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  size?: SpinnerSize;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(function Spinner(
  { className, label, size = "md", ...props },
  ref,
) {
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new TypeError("Spinner label must contain meaningful text.");
  }

  return (
    <div
      {...props}
      ref={ref}
      role="status"
      className={cx("brand-spinner", className)}
      data-size={size}
    >
      <span className="brand-spinner__ring" aria-hidden="true" />
      <span className="brand-spinner__label">{label}</span>
    </div>
  );
});

export interface ProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "aria-valuenow" | "aria-valuetext"> {
  value?: number;
  min?: number;
  max?: number;
  ariaValueText?: string;
}

function validateProgressRange(value: number, min: number, max: number): void {
  if (![value, min, max].every(Number.isFinite)) {
    throw new RangeError("Progress value, min, and max must be finite numbers.");
  }
  if (max <= min) {
    throw new RangeError("Progress max must be greater than min.");
  }
  if (value < min || value > max) {
    throw new RangeError("Progress value must be within the min and max range.");
  }
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ariaValueText, className, max = 100, min = 0, value, ...props },
  ref,
) {
  const hasAriaLabel = typeof ariaLabel === "string" && ariaLabel.trim().length > 0;
  const hasAriaLabelledBy =
    typeof ariaLabelledBy === "string" && ariaLabelledBy.trim().length > 0;

  if (!hasAriaLabel && !hasAriaLabelledBy) {
    throw new TypeError("Progress requires an accessible name via aria-label or aria-labelledby.");
  }

  if (value !== undefined) {
    validateProgressRange(value, min, max);
  }

  const state = value === undefined ? "indeterminate" : value >= max ? "complete" : "progressing";
  const style: CSSProperties = {
    ...props.style,
    ...(value === undefined
      ? null
      : { "--brand-progress-value": `${((value - min) / (max - min)) * 100}%` }),
  } as CSSProperties;

  return (
    <div
      {...props}
      ref={ref}
      style={style}
      role="progressbar"
      className={cx("brand-progress", className)}
      data-state={state}
      aria-label={hasAriaLabel ? ariaLabel : undefined}
      aria-labelledby={hasAriaLabelledBy ? ariaLabelledBy : undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value === undefined ? undefined : value}
      aria-valuetext={ariaValueText}
    >
      <div className="brand-progress__track" aria-hidden="true">
        <span className="brand-progress__indicator" />
      </div>
    </div>
  );
});
