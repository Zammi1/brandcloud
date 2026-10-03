import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  version as reactVersion,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "./utils";

/** Colour role. `quiet` is kept for backward compatibility (neutral tone, ghost appearance). */
export type ButtonTone = "brand" | "ink" | "neutral" | "danger" | "whatsapp" | "level" | "quiet";
/** Treatment. When omitted, the active brand decides (solid by default, depth inside any `data-button-appearance="depth"` ancestor). */
export type ButtonAppearance = "depth" | "solid" | "outline" | "ghost";
/** Offer level colour, used when `tone="level"`. */
export type ButtonLevel = "sky" | "blue" | "navy" | "pearl" | "obsidian";
export type ButtonSize = "sm" | "md" | "lg";
/** shadcn-compatible alias, mapped onto `tone` and `appearance`. Prefer `tone` + `appearance`. */
export type ButtonVariant =
  | "default"
  | "depth"
  | "solid"
  | "ink"
  | "outline"
  | "ghost"
  | "level"
  | "whatsapp"
  | "destructive"
  | "secondary";

export interface ButtonRenderState {
  tone: ButtonTone;
  appearance: ButtonAppearance | undefined;
  level: ButtonLevel | undefined;
  size: ButtonSize;
  loading: boolean;
  disabled: boolean;
  pressed: boolean | undefined;
}

export type ButtonRenderProps = Record<string, unknown> & { className: string; children: ReactNode; ref: Ref<HTMLElement> };

/** Base UI style render prop: an element to render instead of `<button>`, or a function returning one. */
export type ButtonRender = ReactElement | ((props: ButtonRenderProps, state: ButtonRenderState) => ReactElement);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  appearance?: ButtonAppearance;
  level?: ButtonLevel;
  size?: ButtonSize;
  loading?: boolean;
  /** Toggle state. Sets `aria-pressed`; leave undefined for ordinary actions. */
  pressed?: boolean;
  /** shadcn-compatible alias. Explicit `tone` and `appearance` win over it. */
  variant?: ButtonVariant;
  /** Render as another element (for example a router link) while keeping Button styling and state. */
  render?: ButtonRender;
  /** Radix-style alternative to `render`: style the single child element as the button. */
  asChild?: boolean;
}

const VARIANTS: Record<ButtonVariant, { tone: ButtonTone; appearance?: ButtonAppearance }> = {
  default: { tone: "brand" },
  depth: { tone: "brand", appearance: "depth" },
  solid: { tone: "brand", appearance: "solid" },
  ink: { tone: "ink" },
  outline: { tone: "neutral", appearance: "outline" },
  ghost: { tone: "neutral", appearance: "ghost" },
  level: { tone: "level" },
  whatsapp: { tone: "whatsapp" },
  destructive: { tone: "danger", appearance: "solid" },
  secondary: { tone: "neutral", appearance: "solid" },
};

/** Resolves the shadcn-style `variant` alias. Explicit `tone` and `appearance` always win. */
export function resolveButtonVariant(options: {
  tone?: ButtonTone | undefined;
  appearance?: ButtonAppearance | undefined;
  variant?: ButtonVariant | undefined;
}): { tone: ButtonTone; appearance: ButtonAppearance | undefined } {
  const mapped = options.variant ? VARIANTS[options.variant] : undefined;
  return {
    tone: options.tone ?? mapped?.tone ?? "brand",
    appearance: options.appearance ?? mapped?.appearance,
  };
}

const reactMajor = Number.parseInt(reactVersion, 10);

function elementRef(element: ReactElement): Ref<HTMLElement> | undefined {
  const props = element.props as { ref?: Ref<HTMLElement> };
  return reactMajor >= 19 ? props.ref : (element as unknown as { ref?: Ref<HTMLElement> }).ref;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): Ref<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(value);
      else if (ref) (ref as { current: T | null }).current = value;
    }
  };
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    appearance: appearanceProp,
    asChild = false,
    children,
    className,
    disabled = false,
    level: levelProp,
    loading = false,
    onClick,
    pressed,
    render,
    size = "md",
    tone: toneProp,
    type = "button",
    variant,
    ...props
  },
  ref,
) {
  const { tone, appearance } = resolveButtonVariant({ tone: toneProp, appearance: appearanceProp, variant });
  const level = tone === "level" ? (levelProp ?? "blue") : undefined;
  const inert = disabled || loading;
  const shared = {
    "data-tone": tone,
    "data-appearance": appearance,
    "data-level": level,
    "data-size": size,
    "aria-busy": loading || undefined,
    "aria-pressed": pressed,
  };
  const spinner = loading ? <span className="brand-button__spinner" aria-hidden="true" /> : null;

  const child = asChild ? Children.only(children) : render;
  if (child === undefined) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx("brand-button", className)}
        disabled={inert}
        onClick={onClick}
        {...shared}
        {...props}
      >
        {spinner}
        <span className="brand-button__label">{children}</span>
      </button>
    );
  }

  const state: ButtonRenderState = { tone, appearance, level, size, loading, disabled: inert, pressed };
  const childElement = isValidElement(child) ? (child as ReactElement<Record<string, unknown>>) : undefined;
  const childProps = childElement?.props ?? {};
  const label = asChild ? (childProps.children as ReactNode) : children;
  const nativeButton = childElement?.type === "button";
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (inert) {
      event.preventDefault();
      return;
    }
    (childProps.onClick as ((event: MouseEvent<HTMLButtonElement>) => void) | undefined)?.(event);
    onClick?.(event);
  };
  const merged: ButtonRenderProps = {
    ...props,
    ...shared,
    ...(nativeButton ? { type, disabled: inert } : { "aria-disabled": inert || undefined }),
    className: cx("brand-button", childProps.className as string | undefined, className),
    onClick: handleClick,
    ref: mergeRefs<HTMLElement>(ref as Ref<HTMLElement>, childElement ? elementRef(childElement) : undefined),
    children: (
      <>
        {spinner}
        <span className="brand-button__label">{label}</span>
      </>
    ),
  };

  if (typeof render === "function" && !asChild) return render(merged, state);
  if (!childElement) throw new Error("Button: `render` or `asChild` needs a single React element.");
  const { children: content, ...rest } = merged;
  return cloneElement(childElement, rest, content);
});
