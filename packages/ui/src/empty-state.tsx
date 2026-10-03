import { forwardRef, useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./utils";

export type EmptyStateTone = "empty" | "no-results" | "error" | "denied";
export type EmptyStateSize = "page" | "inline";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** What the user is looking at, in plain words. */
  title: ReactNode;
  /** What happened and what to do next. */
  description?: ReactNode | undefined;
  /** The one next action, usually a Button or link. */
  action?: ReactNode | undefined;
  /** A quieter alternative, for example "Learn more". */
  secondaryAction?: ReactNode | undefined;
  /** Replaces the default tone icon. Pass null to hide the icon. */
  icon?: ReactNode | null | undefined;
  /** Chooses the default icon and how the state is announced. */
  tone?: EmptyStateTone | undefined;
  /** "page" centres the state in a large area; "inline" fits inside cards and tables. */
  size?: EmptyStateSize | undefined;
  headingLevel?: 2 | 3 | 4 | undefined;
}

const iconPaths: Record<EmptyStateTone, ReactNode> = {
  empty: (
    <>
      <path d="M4 13.5 6.5 6h11l2.5 7.5" />
      <path d="M4 13.5V18h16v-4.5h-5a3 3 0 0 1-6 0H4Z" />
    </>
  ),
  "no-results": (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  error: (
    <>
      <path d="M12 4 21 19H3L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 16.5v.5" />
    </>
  ),
  denied: (
    <>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    action,
    children,
    className,
    description,
    headingLevel = 2,
    icon,
    secondaryAction,
    size = "page",
    title,
    tone = "empty",
    ...props
  },
  ref,
) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const announced = tone === "error" || tone === "denied";
  const resolvedIcon = icon === undefined ? (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[tone]}
    </svg>
  ) : icon;

  return (
    <div
      ref={ref}
      className={cx("brand-empty-state", className)}
      data-tone={tone}
      data-size={size}
      role={announced ? "status" : undefined}
      aria-labelledby={titleId}
      {...props}
    >
      {resolvedIcon !== null ? (
        <span className="brand-empty-state__icon" aria-hidden="true">{resolvedIcon}</span>
      ) : null}
      <Heading id={titleId} className="brand-empty-state__title">{title}</Heading>
      {description !== undefined ? <p className="brand-empty-state__description">{description}</p> : null}
      {children}
      {action !== undefined || secondaryAction !== undefined ? (
        <div className="brand-empty-state__actions">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
});
