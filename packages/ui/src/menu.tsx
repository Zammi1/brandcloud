"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  Menu as BaseMenu,
  type MenuCheckboxItemProps as BaseMenuCheckboxItemProps,
  type MenuCheckboxItemState,
  type MenuGroupProps as BaseMenuGroupProps,
  type MenuGroupState,
  type MenuGroupLabelProps as BaseMenuGroupLabelProps,
  type MenuGroupLabelState,
  type MenuItemProps as BaseMenuItemProps,
  type MenuItemState,
  type MenuPopupProps as BaseMenuPopupProps,
  type MenuPopupState,
  type MenuTriggerProps as BaseMenuTriggerProps,
} from "@base-ui/react/menu";
import { cx } from "./utils";

export type MenuSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "inline-start"
  | "inline-end";

export type MenuAlign = "start" | "center" | "end";

interface MenuPlacementContextValue {
  side: MenuSide;
  align: MenuAlign;
}

const MenuPlacementContext = createContext<MenuPlacementContextValue | null>(null);

function useMenuPlacement(component: string): MenuPlacementContextValue {
  const context = useContext(MenuPlacementContext);
  if (!context) {
    throw new Error(`@brandcloud/ui: ${component} must be rendered inside a Menu.`);
  }
  return context;
}

export interface MenuProps {
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
   * Event handler called when the menu opens or closes.
   */
  onOpenChange?: ((open: boolean) => void) | undefined;

  /**
   * Default side of the trigger the popover is placed on.
   */
  side?: MenuSide | undefined;

  /**
   * Default alignment of the popover relative to the trigger.
   */
  align?: MenuAlign | undefined;
}

export function Menu({
  align = "center",
  children,
  defaultOpen = false,
  onOpenChange,
  open: openProp,
  side = "bottom",
}: MenuProps) {
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
    <BaseMenu.Root open={open} onOpenChange={handleOpenChange}>
      <MenuPlacementContext.Provider value={{ side, align }}>
        {children}
      </MenuPlacementContext.Provider>
    </BaseMenu.Root>
  );
}

export type MenuTriggerProps = Omit<BaseMenuTriggerProps, "children"> & {
  children?: ReactNode;
};

export const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(function MenuTrigger({ children, className, ...props }, ref) {
  return (
    <BaseMenu.Trigger ref={ref} {...props} className={className}>
      {children}
    </BaseMenu.Trigger>
  );
});

export type MenuPopoverProps = Omit<BaseMenuPopupProps, "children"> & {
  children?: ReactNode;
  side?: MenuSide | undefined;
  align?: MenuAlign | undefined;
};

export const MenuPopover = forwardRef<HTMLDivElement, MenuPopoverProps>(function MenuPopover({
  align: alignProp,
  children,
  className,
  side: sideProp,
  ...props
}, ref) {
  const placement = useMenuPlacement("MenuPopover");
  const side = sideProp ?? placement.side;
  const align = alignProp ?? placement.align;
  const popoverClassName =
    typeof className === "function"
      ? (state: MenuPopupState) => cx("brand-menu__content", className(state))
      : cx("brand-menu__content", className);

  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner side={side} align={align} className="brand-menu">
        <BaseMenu.Popup ref={ref} className={popoverClassName} {...props}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
});

export type MenuItemProps = Omit<BaseMenuItemProps, "onClick" | "closeOnClick"> & {
  /**
   * Called when the item is activated by pointer or keyboard.
   */
  onSelect?: (() => void) | undefined;

  /**
   * Whether the menu closes after the item is selected.
   * @default true
   */
  closeOnSelect?: boolean | undefined;
};

export const MenuItem = forwardRef<HTMLElement, MenuItemProps>(function MenuItem({
  children,
  className,
  closeOnSelect = true,
  disabled,
  onSelect,
  ...props
}, ref) {
  const itemClassName =
    typeof className === "function"
      ? (state: MenuItemState) => cx("brand-menu__item", className(state))
      : cx("brand-menu__item", className);

  return (
    <BaseMenu.Item ref={ref}
      {...props}
      disabled={disabled}
      closeOnClick={closeOnSelect}
      onClick={() => {
        onSelect?.();
      }}
      className={itemClassName}
    >
      {children}
    </BaseMenu.Item>
  );
});

export type MenuCheckboxItemProps = Omit<BaseMenuCheckboxItemProps, "children"> & {
  children?: ReactNode;
};

export const MenuCheckboxItem = forwardRef<HTMLElement, MenuCheckboxItemProps>(function MenuCheckboxItem({ children, className, ...props }, ref) {
  const itemClassName =
    typeof className === "function"
      ? (state: MenuCheckboxItemState) =>
          cx("brand-menu__item", "brand-menu__checkbox-item", className(state))
      : cx("brand-menu__item", "brand-menu__checkbox-item", className);

  return (
    <BaseMenu.CheckboxItem ref={ref} {...props} className={itemClassName}>
      <span className="brand-menu__checkbox-mark" aria-hidden="true">
        <BaseMenu.CheckboxItemIndicator
          className="brand-menu__checkbox-indicator"
          keepMounted
        >
          ✓
        </BaseMenu.CheckboxItemIndicator>
      </span>
      <span className="brand-menu__checkbox-text">{children}</span>
    </BaseMenu.CheckboxItem>
  );
});

export type MenuSeparatorProps = HTMLAttributes<HTMLDivElement>;

export const MenuSeparator = forwardRef<HTMLDivElement, MenuSeparatorProps>(function MenuSeparator({ className, ...props }, ref) {
  return (
    <div ref={ref}
      {...props}
      role="separator"
      className={cx("brand-menu__separator", className)}
    />
  );
});

export type MenuGroupProps = Omit<BaseMenuGroupProps, "children"> & {
  children?: ReactNode;
};

export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(function MenuGroup({ children, className, ...props }, ref) {
  const groupClassName =
    typeof className === "function"
      ? (state: MenuGroupState) => cx("brand-menu__group", className(state))
      : cx("brand-menu__group", className);

  return (
    <BaseMenu.Group ref={ref} {...props} className={groupClassName}>
      {children}
    </BaseMenu.Group>
  );
});

export type MenuLabelProps = Omit<BaseMenuGroupLabelProps, "children"> & {
  children?: ReactNode;
};

export const MenuLabel = forwardRef<HTMLDivElement, MenuLabelProps>(function MenuLabel({ children, className, ...props }, ref) {
  const labelClassName =
    typeof className === "function"
      ? (state: MenuGroupLabelState) => cx("brand-menu__label", className(state))
      : cx("brand-menu__label", className);

  return (
    <BaseMenu.GroupLabel ref={ref} {...props} className={labelClassName}>
      {children}
    </BaseMenu.GroupLabel>
  );
});
