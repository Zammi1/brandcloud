"use client";

import {
  forwardRef,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "./utils";

export interface SwitchProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "onChange" | "checked" | "defaultChecked"
  > {
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  label?: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    checked,
    children,
    className,
    defaultChecked = false,
    disabled,
    id,
    label,
    onChange,
    onCheckedChange,
    readOnly,
    required,
    ...props
  },
  forwardedRef,
) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const resolvedChecked = isControlled ? Boolean(checked) : internalChecked;
  const visibleLabel = label !== undefined && label !== null ? label : children;
  const ariaLabel = props["aria-label"];
  const ariaLabelledBy = props["aria-labelledby"];
  const hasAccessibleName =
    (typeof ariaLabel === "string" && ariaLabel.trim().length > 0) ||
    (typeof ariaLabelledBy === "string" && ariaLabelledBy.trim().length > 0);
  if (
    (visibleLabel === undefined || visibleLabel === null || visibleLabel === false) &&
    !hasAccessibleName
  ) {
    throw new TypeError("@brandcloud/ui: switch requires a visible label or an aria-label.");
  }
  const inputRef = useRef<HTMLInputElement | null>(null);

  function setInputRef(node: HTMLInputElement | null) {
    inputRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextChecked = event.target.checked;
    if (readOnly) {
      event.target.checked = resolvedChecked;
      return;
    }
    if (!isControlled) setInternalChecked(nextChecked);
    onChange?.(event);
    onCheckedChange?.(nextChecked);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (disabled || readOnly) return;
    inputRef.current?.click();
  }

  return (
    <label
      className={cx("brand-switch", className)}
      data-checked={resolvedChecked ? "" : undefined}
      data-unchecked={resolvedChecked ? undefined : ""}
      data-disabled={disabled ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
    >
      <input
        {...props}
        ref={setInputRef}
        type="checkbox"
        role="switch"
        id={id}
        className="brand-switch__input"
        checked={resolvedChecked}
        disabled={disabled || undefined}
        readOnly={readOnly || undefined}
        required={required || undefined}
        aria-checked={resolvedChecked}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <span className="brand-switch__track" aria-hidden="true">
        <span className="brand-switch__thumb" />
      </span>
      {visibleLabel !== undefined && visibleLabel !== null && visibleLabel !== false ? (
        <span className="brand-switch__label">{visibleLabel}</span>
      ) : null}
    </label>
  );
});
