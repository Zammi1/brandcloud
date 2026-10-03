import { forwardRef, useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./utils";

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Visible page title. Rendered as the page heading. */
  title: ReactNode;
  /** Optional one-line description under the title. */
  description?: ReactNode | undefined;
  /** Breadcrumb, back link or switcher rendered above the title. */
  context?: ReactNode | undefined;
  /** Short meta beside the title, for example a record count. */
  meta?: ReactNode | undefined;
  /** The single primary action, placed last on the right. */
  primaryAction?: ReactNode | undefined;
  /** Grouped secondary actions, placed before the primary action. */
  secondaryActions?: ReactNode | undefined;
  /** Overflow menu for everything else, placed between secondary and primary. */
  overflow?: ReactNode | undefined;
  /** Tabs or a sub-navigation row rendered as the last row of the header. */
  tabs?: ReactNode | undefined;
  /** Heading level. Pages use 1; nested surfaces such as panels use 2. */
  headingLevel?: 1 | 2 | undefined;
  /** Accessible name for the action group. */
  actionsLabel?: string | undefined;
}

export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  {
    actionsLabel = "Page actions",
    className,
    context,
    description,
    headingLevel = 1,
    meta,
    overflow,
    primaryAction,
    secondaryActions,
    tabs,
    title,
    ...props
  },
  ref,
) {
  const headingId = useId();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const hasActions = primaryAction !== undefined || secondaryActions !== undefined || overflow !== undefined;

  return (
    <header ref={ref} className={cx("brand-page-header", className)} aria-labelledby={headingId} {...props}>
      {context !== undefined ? <div className="brand-page-header__context">{context}</div> : null}
      <div className="brand-page-header__row">
        <div className="brand-page-header__titles">
          <div className="brand-page-header__title-line">
            <Heading id={headingId} className="brand-page-header__title">{title}</Heading>
            {meta !== undefined ? <span className="brand-page-header__meta">{meta}</span> : null}
          </div>
          {description !== undefined ? <p className="brand-page-header__description">{description}</p> : null}
        </div>
        {hasActions ? (
          <div className="brand-page-header__actions" role="group" aria-label={actionsLabel}>
            {secondaryActions !== undefined ? (
              <div className="brand-page-header__secondary">{secondaryActions}</div>
            ) : null}
            {overflow !== undefined ? <div className="brand-page-header__overflow">{overflow}</div> : null}
            {primaryAction !== undefined ? <div className="brand-page-header__primary">{primaryAction}</div> : null}
          </div>
        ) : null}
      </div>
      {tabs !== undefined ? <div className="brand-page-header__tabs">{tabs}</div> : null}
    </header>
  );
});
