import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";
import { cx } from "./utils";

export interface FormFieldContextValue {
  id: string;
  descriptionId: string | undefined;
  errorId: string | undefined;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export interface FormFieldPropsResult {
  id?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: true | undefined;
  "aria-required"?: true | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
}

export function useFormFieldProps(): FormFieldPropsResult {
  const field = useContext(FormFieldContext);
  if (!field) return {};
  const describedby = [field.descriptionId, field.errorId].filter(Boolean).join(" ") || undefined;
  return {
    id: field.id,
    "aria-describedby": describedby,
    "aria-invalid": field.invalid ? true : undefined,
    "aria-required": field.required ? true : undefined,
    required: field.required,
    disabled: field.disabled,
  };
}

function stableId(prefix: string): string {
  const raw = useId();
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  id?: string;
  required?: boolean;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  { label, id, required = false, description, error, disabled = false, className, children, ...props },
  ref,
) {
  const autoId = stableId("brand-field");
  const controlId = id ?? autoId;
  const hasDescription = Boolean(description);
  const hasError = Boolean(error);
  const invalid = hasError;
  const value: FormFieldContextValue = {
    id: controlId,
    descriptionId: hasDescription ? `${controlId}-description` : undefined,
    errorId: hasError ? `${controlId}-error` : undefined,
    invalid,
    required,
    disabled,
  };
  return (
    <div
      ref={ref}
      className={cx("brand-field", className)}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      {...props}
    >
      <FormFieldContext.Provider value={value}>
        <FormLabel htmlFor={controlId} required={required}>
          {label}
        </FormLabel>
        {children}
        {hasDescription && <FormDescription id={value.descriptionId}>{description}</FormDescription>}
        {hasError && <FormError id={value.errorId}>{error}</FormError>}
      </FormFieldContext.Provider>
    </div>
  );
});

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(function FormLabel(
  { required, className, children, ...props },
  ref,
) {
  return (
    <label ref={ref} className={cx("brand-field__label", className)} {...props}>
      {children}
      {required && (
        <span className="brand-field__required" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );
});

export interface FormDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const FormDescription = forwardRef<HTMLParagraphElement, FormDescriptionProps>(function FormDescription(
  { id, className, ...props },
  ref,
) {
  const autoId = stableId("brand-form-description");
  return <p ref={ref} id={id ?? autoId} className={cx("brand-field__description", className)} {...props} />;
});

export interface FormErrorProps extends HTMLAttributes<HTMLParagraphElement> {}

export const FormError = forwardRef<HTMLParagraphElement, FormErrorProps>(function FormError(
  { id, className, ...props },
  ref,
) {
  const autoId = stableId("brand-form-error");
  return (
    <p
      ref={ref}
      id={id ?? autoId}
      className={cx("brand-field__error", className)}
      data-error="true"
      {...props}
    />
  );
});
