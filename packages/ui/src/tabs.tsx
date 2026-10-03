"use client";

import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cx } from "./utils";

export type TabsValue = string | number;
export type TabsActivation = "automatic" | "manual";
export type TabsOrientation = "horizontal" | "vertical";

const TabsActivationContext = createContext<TabsActivation>("automatic");

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: TabsValue;
  defaultValue?: TabsValue;
  onValueChange?: (value: TabsValue) => void;
  activation?: TabsActivation;
  orientation?: TabsOrientation;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    activation = "automatic",
    children,
    className,
    defaultValue,
    onValueChange,
    orientation = "horizontal",
    value,
    ...props
  },
  ref,
) {
  const isControlled = value !== undefined;

  function handleValueChange(next: TabsValue) {
    onValueChange?.(next);
  }

  return (
    <TabsActivationContext.Provider value={activation}>
      <BaseTabs.Root
        ref={ref}
        className={cx("brand-tabs", className)}
        value={isControlled ? value : undefined}
        defaultValue={isControlled ? undefined : defaultValue}
        onValueChange={handleValueChange}
        orientation={orientation}
        {...props}
      >
        {children}
      </BaseTabs.Root>
    </TabsActivationContext.Provider>
  );
});

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  function TabsList({ className, ...props }, ref) {
    const activation = useContext(TabsActivationContext);
    return (
      <BaseTabs.List
        ref={ref}
        className={cx("brand-tabs__list", className)}
        activateOnFocus={activation === "automatic"}
        {...props}
      />
    );
  },
);

export interface TabsTabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: TabsValue;
}

export const TabsTab = forwardRef<HTMLButtonElement, TabsTabProps>(
  function TabsTab({ className, ...props }, ref) {
    return (
      <BaseTabs.Tab
        ref={ref}
        className={cx("brand-tabs__tab", className)}
        {...props}
      />
    );
  },
);

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: TabsValue;
  keepMounted?: boolean;
}

export const TabsPanel = forwardRef<HTMLDivElement, TabsPanelProps>(
  function TabsPanel({ className, keepMounted, ...props }, ref) {
    return (
      <BaseTabs.Panel
        ref={ref}
        className={cx("brand-tabs__panel", className)}
        keepMounted={keepMounted}
        {...props}
      />
    );
  },
);
