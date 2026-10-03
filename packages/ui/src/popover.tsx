"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  Popover as BasePopover,
  type PopoverPopupProps as BasePopoverPopupProps,
  type PopoverPopupState,
  type PopoverTriggerProps as BasePopoverTriggerProps,
} from "@base-ui/react/popover";
import { cx } from "./utils";

export type PopoverSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "inline-start"
  | "inline-end";

export type PopoverAlign = "start" | "center" | "end";

interface PopoverPlacementContextValue {
  side: PopoverSide;
  align: PopoverAlign;
}

const PopoverPlacementContext = createContext<PopoverPlacementContextValue | null>(null);

function usePopoverPlacement(component: string): PopoverPlacementContextValue {
  const context = useContext(PopoverPlacementContext);
  if (!context) {
    throw new Error(`@brandcloud/ui: ${component} must be rendered inside a Popover.`);
  }
  return context;
}

export interface PopoverProps {
  children: ReactNode;

  /**
   * Controlled open state.
   */
  open?: boolean | undefined;

  /**
   * Initial state for uncontrolled usage.
   */
  defaultOpen?: boolean | undefined;

  /**
   * Event handler called when the popover opens or closes.
   */
  onOpenChange?: ((open: boolean) => void) | undefined;

  /**
   * Default side of the trigger the content is placed on.
   */
  side?: PopoverSide | undefined;

  /**
   * Default alignment of the content relative to the trigger.
   */
  align?: PopoverAlign | undefined;
}

export function Popover({
  align = "center",
  children,
  defaultOpen = false,
  onOpenChange,
  open: openProp,
  side = "bottom",
}: PopoverProps) {
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
    <BasePopover.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPlacementContext.Provider value={{ side, align }}>
        {children}
      </PopoverPlacementContext.Provider>
    </BasePopover.Root>
  );
}

export type PopoverTriggerProps = Omit<BasePopoverTriggerProps, "children"> & {
  children?: ReactNode;
};

export const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(function PopoverTrigger({ children, className, ...props }, ref) {
  return (
    <BasePopover.Trigger ref={ref} {...props} className={className}>
      {children}
    </BasePopover.Trigger>
  );
});

export type PopoverContentProps = Omit<BasePopoverPopupProps, "children"> & {
  children?: ReactNode;
  side?: PopoverSide | undefined;
  align?: PopoverAlign | undefined;
};

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(function PopoverContent({
  align: alignProp,
  children,
  className,
  side: sideProp,
  ...props
}, ref) {
  const placement = usePopoverPlacement("PopoverContent");
  const side = sideProp ?? placement.side;
  const align = alignProp ?? placement.align;
  const contentClassName =
    typeof className === "function"
      ? (state: PopoverPopupState) => cx("brand-popover__content", className(state))
      : cx("brand-popover__content", className);

  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} className="brand-popover">
        <BasePopover.Popup ref={ref} className={contentClassName} {...props}>
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
});
