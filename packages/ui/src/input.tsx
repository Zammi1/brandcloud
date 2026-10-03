import { forwardRef, type InputHTMLAttributes } from "react";
import { useFormFieldProps } from "./form-field";
import { cx } from "./utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    id,
    required,
    disabled,
    invalid,
    "aria-describedby": ariaDescribedby,
    ...props
  },
  ref,
) {
  const field = useFormFieldProps();
  const isInvalid = invalid ?? field["aria-invalid"] === true;
  const isRequired = required ?? field.required;
  return (
    <input
      ref={ref}
      id={field.id ?? id}
      className={cx("brand-input", className)}
      required={isRequired}
      disabled={disabled ?? field.disabled}
      aria-required={isRequired || undefined}
      aria-invalid={isInvalid || undefined}
      aria-describedby={cx(ariaDescribedby, field["aria-describedby"]) || undefined}
      data-invalid={isInvalid || undefined}
      {...props}
    />
  );
});
