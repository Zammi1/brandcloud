"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type ChangeEvent,
  type FieldsetHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cx } from "./utils";

export interface CheckboxOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface CheckboxGroupContextValue {
  name: string;
  value: ReadonlyArray<string>;
  disabled: boolean;
  readOnly: boolean;
  disabledValues: ReadonlySet<string>;
  toggle: (itemValue: string, itemChecked: boolean) => void;
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "onChange" | "checked" | "defaultChecked" | "value"
  > {
  value?: string | undefined;
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  label?: ReactNode;
  indeterminate?: boolean | undefined;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    checked,
    children,
    className,
    defaultChecked = false,
    disabled,
    id,
    indeterminate = false,
    label,
    name,
    onChange,
    onCheckedChange,
    readOnly,
    required,
    value,
    ...props
  },
  forwardedRef,
) {
  const group = useContext(CheckboxGroupContext);
  const groupItem = group !== null && value !== undefined ? group : null;
  const itemValue = value ?? "";
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const resolvedChecked = groupItem
    ? groupItem.value.includes(itemValue)
    : isControlled
      ? Boolean(checked)
      : internalChecked;
  const resolvedDisabled =
    Boolean(disabled) ||
    (group?.disabled ?? false) ||
    (groupItem !== null && groupItem.disabledValues.has(itemValue));
  const resolvedReadOnly = Boolean(readOnly) || (group?.readOnly ?? false);
  const resolvedRequired = Boolean(required);
  const resolvedName = groupItem ? groupItem.name : name;
  const inputRef = useRef<HTMLInputElement | null>(null);

  function setInputRef(node: HTMLInputElement | null) {
    inputRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextChecked = event.target.checked;
    if (resolvedReadOnly) {
      event.target.checked = resolvedChecked;
      return;
    }
    if (groupItem) {
      groupItem.toggle(itemValue, nextChecked);
    } else if (!isControlled) {
      setInternalChecked(nextChecked);
    }
    onChange?.(event);
    onCheckedChange?.(nextChecked);
  }

  const labelContent = label !== undefined && label !== null ? label : children;

  return (
    <label
      className={cx("brand-checkbox", className)}
      data-checked={resolvedChecked ? "" : undefined}
      data-unchecked={resolvedChecked ? undefined : ""}
      data-indeterminate={indeterminate ? "" : undefined}
      data-disabled={resolvedDisabled ? "" : undefined}
      data-readonly={resolvedReadOnly ? "" : undefined}
    >
      <input
        {...props}
        ref={setInputRef}
        type="checkbox"
        id={id}
        name={resolvedName}
        className="brand-checkbox__input"
        value={value}
        checked={resolvedChecked}
        disabled={resolvedDisabled || undefined}
        readOnly={resolvedReadOnly || undefined}
        required={resolvedRequired || undefined}
        aria-required={resolvedRequired || undefined}
        aria-checked={indeterminate ? "mixed" : undefined}
        onChange={handleChange}
      />
      <span className="brand-checkbox__control" aria-hidden="true" />
      {labelContent !== undefined && labelContent !== null && labelContent !== false ? (
        <span className="brand-checkbox__label">{labelContent}</span>
      ) : null}
    </label>
  );
});

export interface CheckboxGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange" | "value" | "defaultValue"> {
  legend?: ReactNode;
  name?: string | undefined;
  value?: ReadonlyArray<string> | undefined;
  defaultValue?: ReadonlyArray<string> | undefined;
  onValueChange?: ((value: string[]) => void) | undefined;
  options?: ReadonlyArray<CheckboxOption> | undefined;
  disabledValues?: Iterable<string> | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
}

export function CheckboxGroup({
  children,
  className,
  defaultValue,
  disabled,
  disabledValues,
  legend,
  name,
  onValueChange,
  options,
  readOnly,
  required,
  value,
  ...props
}: CheckboxGroupProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ? [...defaultValue] : []);
  const resolvedValue = isControlled ? value : internalValue;
  const generatedName = useId();
  const resolvedName = name ?? generatedName;
  const resolvedDisabledValues = useMemo(
    () => new Set<string>(disabledValues ?? []),
    [disabledValues],
  );

  function toggle(itemValue: string, itemChecked: boolean) {
    const next = itemChecked
      ? resolvedValue.includes(itemValue)
        ? [...resolvedValue]
        : [...resolvedValue, itemValue]
      : resolvedValue.filter((item) => item !== itemValue);
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  }

  const contextValue: CheckboxGroupContextValue = {
    name: resolvedName,
    value: resolvedValue,
    disabled: Boolean(disabled),
    readOnly: Boolean(readOnly),
    disabledValues: resolvedDisabledValues,
    toggle,
  };

  return (
    <CheckboxGroupContext.Provider value={contextValue}>
      <fieldset
        {...props}
        className={cx("brand-checkbox-group", className)}
        disabled={disabled || undefined}
        aria-required={required || undefined}
        data-disabled={disabled ? "" : undefined}
      >
        {legend !== undefined && legend !== null && legend !== false ? (
          <legend className="brand-checkbox-group__legend">{legend}</legend>
        ) : null}
        <div className="brand-checkbox-group__items">
          {options?.map((option) => (
            <Checkbox
              key={option.value}
              value={option.value}
              label={option.label}
              disabled={option.disabled}
            />
          ))}
          {children}
        </div>
      </fieldset>
    </CheckboxGroupContext.Provider>
  );
}
