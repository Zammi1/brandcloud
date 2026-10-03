"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  Tooltip as BaseTooltip,
  type TooltipPopupProps as BaseTooltipPopupProps,
  type TooltipPopupState,
  type TooltipTriggerProps as BaseTooltipTriggerProps,
} from "@base-ui/react/tooltip";
import { cx } from "./utils";

export type TooltipSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "inline-start"
  | "inline-end";

export type TooltipAlign = "start" | "center" | "end";

interface TooltipContextValue {
  open: boolean;
  contentId: string;
  delay: number;
  closeDelay: number;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string): TooltipContextValue {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error(`@brandcloud/ui: ${component} must be rendered inside a Tooltip.`);
  }
  return context;
}

export interface TooltipProps {
  children: ReactNode;
  delay?: number | undefined;
  closeDelay?: number | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  disabled?: boolean | undefined;
}

export function Tooltip({
  children,
  delay = 300,
  closeDelay = 0,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: TooltipProps) {
  const contentId = useId();
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <BaseTooltip.Root
      open={open}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <TooltipContext.Provider value={{ open, contentId, delay, closeDelay }}>
        {children}
      </TooltipContext.Provider>
    </BaseTooltip.Root>
  );
}

export type TooltipTriggerProps = Omit<
  BaseTooltipTriggerProps,
  "delay" | "closeDelay" | "children"
> & {
  children?: ReactNode;
};

export function TooltipTrigger({ children, ...props }: TooltipTriggerProps) {
  const { open, contentId, delay, closeDelay } = useTooltipContext("TooltipTrigger");
  return (
    <BaseTooltip.Trigger
      delay={delay}
      closeDelay={closeDelay}
      {...props}
      aria-describedby={open ? contentId : undefined}
    >
      {children}
    </BaseTooltip.Trigger>
  );
}

export type TooltipContentProps = Omit<BaseTooltipPopupProps, "children"> & {
  side?: TooltipSide;
  align?: TooltipAlign;
  children?: ReactNode;
};

export function TooltipContent({
  children,
  side = "top",
  align = "center",
  className,
  ...props
}: TooltipContentProps) {
  const { contentId } = useTooltipContext("TooltipContent");
  const contentClassName =
    typeof className === "function"
      ? (state: TooltipPopupState) => cx("brand-tooltip__content", className(state))
      : cx("brand-tooltip__content", className);
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} align={align} className="brand-tooltip">
        <BaseTooltip.Popup
          id={contentId}
          role="tooltip"
          className={contentClassName}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
