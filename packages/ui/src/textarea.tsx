import { forwardRef, type TextareaHTMLAttributes } from "react";
import { useFormFieldProps } from "./form-field";
import { cx } from "./utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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
    <textarea
      ref={ref}
      id={field.id ?? id}
      className={cx("brand-textarea", className)}
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
