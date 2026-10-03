import { forwardRef, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

import type { NoticeTone } from "./notice.js";
import { TextButton } from "./text-button";
import { cx } from "./utils";

const TONE_LABELS: Record<NoticeTone, string> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  danger: "Error",
};

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "role"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duration?: number;
  tone?: NoticeTone;
  title?: ReactNode;
  dismissLabel?: string;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  {
    children,
    className,
    dismissLabel = "Dismiss",
    duration = 6000,
    onOpenChange,
    open,
    tone = "info",
    title,
    ...props
  },
  ref,
) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(duration);
  const timerRef = useRef<number | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) {
      remainingRef.current = duration;
      return;
    }
    if (paused || duration <= 0 || remainingRef.current <= 0) return;
    const startedAt = Date.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      remainingRef.current = 0;
      onOpenChangeRef.current(false);
    }, remainingRef.current);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        remainingRef.current = Math.max(remainingRef.current - (Date.now() - startedAt), 0);
      }
    };
  }, [open, paused, duration]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cx("brand-toast", className)}
      data-tone={tone}
      {...props}
      role={tone === "danger" ? "alert" : "status"}
      onPointerEnter={(event) => {
        props.onPointerEnter?.(event);
        setPaused(true);
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        setPaused(false);
      }}
      onFocus={(event) => {
        props.onFocus?.(event);
        setPaused(true);
      }}
      onBlur={(event) => {
        props.onBlur?.(event);
        setPaused(false);
      }}
    >
      <span className="brand-visually-hidden">{TONE_LABELS[tone]}</span>
      <div className="brand-toast__content">
        {title != null && <p className="brand-toast__title">{title}</p>}
        {children != null && <div className="brand-toast__body">{children}</div>}
      </div>
      <TextButton
        className="brand-toast__dismiss"
        emphasis="neutral"
        aria-label={dismissLabel}
        onClick={() => onOpenChange(false)}
      >
        ×
      </TextButton>
    </div>
  );
});
