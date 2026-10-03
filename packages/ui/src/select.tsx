"use client";

import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { useFormFieldProps } from "./form-field";
import { cx } from "./utils";

export interface SelectOption {
  value: string;
  label?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  label?: ReactNode;
  options?: Array<SelectOption | string>;
  placeholder?: string;
  invalid?: boolean;
  value?: string | number;
  onValueChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    children,
    className,
    disabled,
    id: providedId,
    invalid,
    label,
    onValueChange,
    options,
    placeholder,
    required,
    value,
    "aria-describedby": ariaDescribedby,
    ...props
  },
  ref,
) {
  const field = useFormFieldProps();
  const generatedId = useId();
  const selectId =
    field.id ?? providedId ?? (label !== undefined ? `brand-select-${generatedId}` : undefined);
  const isInvalid = invalid ?? field["aria-invalid"] === true;
  const isRequired = required ?? field.required;
  const isDisabled = disabled ?? field.disabled;
  const isControlled = value !== undefined;
  const [hasSelection, setHasSelection] = useState(
    () => !isControlled && props.defaultValue !== undefined && props.defaultValue !== "",
  );
  const empty = isControlled ? String(value) === "" : !hasSelection;
  const showPlaceholder = placeholder !== undefined && empty;
  const selectDefaultValue = isControlled
    ? undefined
    : showPlaceholder
      ? (props.defaultValue ?? "")
      : props.defaultValue;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!isControlled) {
      setHasSelection(event.target.value !== "");
    }
    onValueChange?.(event.target.value);
  };

  const select = (
    <select
      {...props}
      ref={ref}
      id={selectId}
      className={cx("brand-select", className)}
      defaultValue={selectDefaultValue}
      value={isControlled ? String(value) : undefined}
      onChange={handleChange}
      required={isRequired}
      disabled={isDisabled}
      aria-required={isRequired || undefined}
      aria-invalid={isInvalid || undefined}
      aria-describedby={cx(ariaDescribedby, field["aria-describedby"]) || undefined}
      data-invalid={isInvalid || undefined}
      data-disabled={isDisabled || undefined}
      data-required={isRequired || undefined}
      data-empty={showPlaceholder || undefined}
    >
      {showPlaceholder && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {options
        ? options.map((option) => {
            const item: SelectOption =
              typeof option === "string" ? { value: option, label: option } : option;
            return (
              <option key={item.value} value={item.value} disabled={item.disabled}>
                {item.label ?? item.value}
              </option>
            );
          })
        : children}
    </select>
  );

  if (label === undefined) {
    return <span className="brand-select-wrap">{select}</span>;
  }

  return (
    <div className="brand-select-field">
      <label className="brand-field__label" htmlFor={selectId}>
        {label}
      </label>
      <span className="brand-select-wrap">{select}</span>
    </div>
  );
});
