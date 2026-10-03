import {
  Fragment,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

export type MeterTone = "neutral" | "success" | "warning" | "danger";

export interface MeterProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "aria-label" | "aria-labelledby" | "children" | "role"
  > {
  label: ReactNode;
  /** Required when the visible label is rich content rather than a string or number. */
  ariaLabel?: string;
  value: number;
  min?: number;
  max?: number;
  /** Human-readable accessible value, such as “3 of 5 seats used”. */
  ariaValueText: string;
  /** Visible value. Defaults to a deterministic percentage. */
  formattedValue?: ReactNode;
  tone?: MeterTone;
}

function resolveAccessibleLabel(
  ariaLabel: string | undefined,
  label: ReactNode,
): string | undefined {
  const labelIsPrimitive = typeof label === "string" || typeof label === "number";

  if (typeof label === "string" && label.trim().length === 0) {
    throw new TypeError("Meter label must contain meaningful visible content.");
  }
  if (typeof label === "number" && !Number.isFinite(label)) {
    throw new TypeError("Meter label numbers must be finite.");
  }
  if (!labelIsPrimitive && !hasVisibleLabelContent(label)) {
    throw new TypeError("Meter label must contain meaningful visible content.");
  }

  if (ariaLabel !== undefined) {
    const normalized = ariaLabel.trim();
    if (normalized.length === 0) {
      throw new TypeError("Meter ariaLabel must not be empty.");
    }
    return normalized;
  }

  if (!labelIsPrimitive) {
    throw new TypeError(
      "Meter ariaLabel is required when label is rich content.",
    );
  }

  return undefined;
}

function hasVisibleLabelContent(node: ReactNode): boolean {
  if (typeof node === "string") return node.trim().length > 0;
  if (typeof node === "number") return Number.isFinite(node);
  if (Array.isArray(node)) return node.some(hasVisibleLabelContent);
  if (!isValidElement(node)) return false;
  const element = node as ReactElement<{ children?: ReactNode }>;

  if (element.type === Fragment) {
    return hasVisibleLabelContent(element.props.children);
  }
  if (typeof element.type !== "string") return true;
  if (["canvas", "img", "svg", "video"].includes(element.type)) return true;
  return hasVisibleLabelContent(element.props.children);
}

function requireValueText(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("Meter ariaValueText must not be empty.");
  }
  return value.trim();
}

function validateRange(value: number, min: number, max: number): void {
  if (![value, min, max].every(Number.isFinite)) {
    throw new RangeError("Meter value, min, and max must be finite numbers.");
  }
  if (max <= min) {
    throw new RangeError("Meter max must be greater than min.");
  }
  if (value < min || value > max) {
    throw new RangeError("Meter value must be within the min and max range.");
  }
}

function valueToPercentage(value: number, min: number, max: number): number {
  let percentage: number;

  if (min < 0 && max > 0) {
    const scale = Math.max(Math.abs(min), Math.abs(max));
    const scaledMin = min / scale;
    percentage = ((value / scale - scaledMin) / (max / scale - scaledMin)) * 100;
  } else {
    percentage = ((value - min) / (max - min)) * 100;
  }

  if (!Number.isFinite(percentage)) {
    throw new RangeError("Meter range cannot be normalized safely.");
  }

  return Math.min(100, Math.max(0, percentage));
}

export function Meter({
  ariaLabel,
  ariaValueText,
  className,
  formattedValue,
  label,
  max = 100,
  min = 0,
  tone = "neutral",
  value,
  ...props
}: MeterProps) {
  validateRange(value, min, max);
  const resolvedAriaLabel = resolveAccessibleLabel(ariaLabel, label);
  const resolvedAriaValueText = requireValueText(ariaValueText);
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const percentage = valueToPercentage(value, min, max);
  const defaultFormattedValue = `${Number(percentage.toFixed(2))}%`;
  const rootClassName = ["brand-meter", className].filter(Boolean).join(" ");

  return (
    <div
      {...props}
      role="meter"
      className={rootClassName}
      data-tone={tone}
      aria-label={resolvedAriaLabel}
      aria-labelledby={resolvedAriaLabel === undefined ? labelId : undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={resolvedAriaValueText}
    >
      <div className="brand-meter__header">
        <div id={resolvedAriaLabel === undefined ? labelId : undefined} className="brand-meter__label">
          {label}
        </div>
        <span className="brand-meter__value">
          {formattedValue === undefined ? defaultFormattedValue : formattedValue}
        </span>
      </div>
      <div className="brand-meter__track" aria-hidden="true">
        <span
          className="brand-meter__indicator"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
