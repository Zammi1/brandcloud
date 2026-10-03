import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { TextButton } from "./text-button";
import { cx } from "./utils";

export type NoticeTone = "info" | "success" | "warning" | "danger";

const TONE_LABELS: Record<NoticeTone, string> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  danger: "Error",
};

export interface NoticeBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "role"> {
  tone?: NoticeTone;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  dismissLabel?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface NoticeDismissibleProps extends NoticeBaseProps {
  dismissible: true;
  onDismiss: () => void;
}

export interface NoticePersistentProps extends NoticeBaseProps {
  dismissible?: false;
  onDismiss?: undefined;
}

export type NoticeProps = NoticeDismissibleProps | NoticePersistentProps;

type NoticeInternalProps = NoticeBaseProps & {
  dismissible?: boolean;
  onDismiss?: () => void;
};

export const Notice = forwardRef<HTMLDivElement, NoticeProps>(function Notice(props, ref) {
  const {
    actions,
    children,
    className,
    dismissLabel = "Dismiss",
    dismissible = false,
    headingLevel = 4,
    onDismiss,
    tone = "info",
    title,
    ...rest
  } = props as NoticeInternalProps;

  const HeadingTag = `h${headingLevel}` as "h4";
  const canDismiss = dismissible && typeof onDismiss === "function";

  return (
    <div
      ref={ref}
      className={cx("brand-notice", className)}
      data-tone={tone}
      data-dismissible={canDismiss || undefined}
      {...rest}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className="brand-visually-hidden">{TONE_LABELS[tone]}</span>
      <div className="brand-notice__content">
        <HeadingTag className="brand-notice__title">{title}</HeadingTag>
        {children != null && <div className="brand-notice__body">{children}</div>}
        {actions != null && <div className="brand-notice__actions">{actions}</div>}
      </div>
      {canDismiss && (
        <TextButton
          className="brand-notice__dismiss"
          emphasis="neutral"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          ×
        </TextButton>
      )}
    </div>
  );
});
