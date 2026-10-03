"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useRef,
  useState,
  useId,
  type ChangeEvent,
  type FieldsetHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "./utils";

export interface RadioOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  select: (itemValue: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "onChange" | "checked" | "defaultChecked" | "value"
  > {
  value: string;
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  label?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  {
    checked,
    children,
    className,
    defaultChecked = false,
    disabled,
    id,
    label,
    name,
    onChange,
    readOnly,
    required,
    value,
    ...props
  },
  forwardedRef,
) {
  const group = useContext(RadioGroupContext);
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const resolvedChecked = group
    ? group.value === value
    : isControlled
      ? Boolean(checked)
      : internalChecked;
  const resolvedDisabled = Boolean(disabled) || (group?.disabled ?? false);
  const resolvedReadOnly = Boolean(readOnly) || (group?.readOnly ?? false);
  const resolvedRequired = Boolean(required) || (group?.required ?? false);
  const resolvedName = group ? group.name : name;
  const inputRef = useRef<HTMLInputElement | null>(null);

  function setInputRef(node: HTMLInputElement | null) {
    inputRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (resolvedReadOnly) {
      event.target.checked = resolvedChecked;
      return;
    }
    if (group) {
      group.select(value);
    } else if (!isControlled) {
      setInternalChecked(true);
    }
    onChange?.(event);
  }

  const labelContent = label !== undefined && label !== null ? label : children;

  return (
    <label
      className={cx("brand-radio", className)}
      data-checked={resolvedChecked ? "" : undefined}
      data-unchecked={resolvedChecked ? undefined : ""}
      data-disabled={resolvedDisabled ? "" : undefined}
      data-readonly={resolvedReadOnly ? "" : undefined}
    >
      <input
        {...props}
        ref={setInputRef}
        type="radio"
        id={id}
        name={resolvedName}
        className="brand-radio__input"
        value={value}
        checked={resolvedChecked}
        disabled={resolvedDisabled || undefined}
        readOnly={resolvedReadOnly || undefined}
        required={resolvedRequired || undefined}
        onChange={handleChange}
      />
      <span className="brand-radio__control" aria-hidden="true" />
      {labelContent !== undefined && labelContent !== null && labelContent !== false ? (
        <span className="brand-radio__label">{labelContent}</span>
      ) : null}
    </label>
  );
});

export interface RadioGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange" | "value" | "defaultValue"> {
  legend?: ReactNode;
  name?: string | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  options?: ReadonlyArray<RadioOption> | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
}

export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  {
    children,
    className,
    defaultValue,
    disabled,
    legend,
    name,
    onKeyDown,
    onValueChange,
    options,
    readOnly,
    required,
    value,
    ...props
  },
  forwardedRef,
) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
  const resolvedValue = isControlled ? value : internalValue;
  const generatedName = useId();
  const resolvedName = name ?? generatedName;
  const groupRef = useRef<HTMLFieldSetElement | null>(null);

  function setFieldSetRef(node: HTMLFieldSetElement | null) {
    groupRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  function select(itemValue: string) {
    if (!isControlled) setInternalValue(itemValue);
    onValueChange?.(itemValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFieldSetElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const key = event.key;
    if (key !== "ArrowDown" && key !== "ArrowRight" && key !== "ArrowUp" && key !== "ArrowLeft") {
      return;
    }
    const container = groupRef.current;
    if (!container) return;
    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>("input[type='radio']"),
    ).filter((input) => !input.disabled);
    const currentIndex = inputs.indexOf(event.target as HTMLInputElement);
    if (currentIndex === -1) return;
    event.preventDefault();
    const delta = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
    const nextInput = inputs[(currentIndex + delta + inputs.length) % inputs.length];
    if (!nextInput) return;
    if (!readOnly) select(nextInput.value);
    nextInput.focus();
  }

  const contextValue: RadioGroupContextValue = {
    name: resolvedName,
    value: resolvedValue,
    disabled: Boolean(disabled),
    readOnly: Boolean(readOnly),
    required: Boolean(required),
    select,
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <fieldset
        {...props}
        ref={setFieldSetRef}
        role="radiogroup"
        className={cx("brand-radio-group", className)}
        disabled={disabled || undefined}
        data-disabled={disabled ? "" : undefined}
        onKeyDown={handleKeyDown}
      >
        {legend !== undefined && legend !== null && legend !== false ? (
          <legend className="brand-radio-group__legend">{legend}</legend>
        ) : null}
        <div className="brand-radio-group__items">
          {options?.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              label={option.label}
              disabled={option.disabled}
            />
          ))}
          {children}
        </div>
      </fieldset>
    </RadioGroupContext.Provider>
  );
});
