"use client";

import { createElement, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { cx } from "./utils";

export type AccordionValue = string;
export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface AccordionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "dir"> {
  /** Open item values (controlled). */
  value?: AccordionValue[];
  /** Initially open item values (uncontrolled). */
  defaultValue?: AccordionValue[];
  onValueChange?: (value: AccordionValue[]) => void;
  /** Allow more than one item open at once. Defaults to false (one at a time). */
  multiple?: boolean;
  disabled?: boolean;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  { children, className, defaultValue, disabled = false, multiple = false, onValueChange, value, ...props },
  ref,
) {
  return (
    <BaseAccordion.Root
      ref={ref}
      className={cx("brand-accordion", className)}
      multiple={multiple}
      disabled={disabled}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onValueChange ? { onValueChange: (next: unknown[]) => onValueChange(next as AccordionValue[]) } : {})}
      {...props}
    >
      {children}
    </BaseAccordion.Root>
  );
});

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "dir"> {
  value: AccordionValue;
  disabled?: boolean;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { className, disabled, value, ...props },
  ref,
) {
  return (
    <BaseAccordion.Item
      ref={ref}
      className={cx("brand-accordion__item", className)}
      value={value}
      {...(disabled !== undefined ? { disabled } : {})}
      {...props}
    />
  );
});

export interface AccordionTriggerProps extends Omit<HTMLAttributes<HTMLButtonElement>, "dir"> {
  /** Heading level wrapping the trigger, so the outline stays correct. Defaults to 3. */
  headingLevel?: AccordionHeadingLevel;
  children: ReactNode;
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(function AccordionTrigger(
  { children, className, headingLevel = 3, ...props },
  ref,
) {
  return (
    <BaseAccordion.Header className="brand-accordion__header" render={createElement(`h${headingLevel}`)}>
      <BaseAccordion.Trigger ref={ref} className={cx("brand-accordion__trigger", className)} {...props}>
        <span className="brand-accordion__label">{children}</span>
        <span className="brand-accordion__icon" aria-hidden="true" />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
});

export type AccordionPanelProps = Omit<HTMLAttributes<HTMLDivElement>, "dir">;

export const AccordionPanel = forwardRef<HTMLDivElement, AccordionPanelProps>(function AccordionPanel(
  { children, className, ...props },
  ref,
) {
  return (
    <BaseAccordion.Panel ref={ref} className={cx("brand-accordion__panel", className)} {...props}>
      <div className="brand-accordion__content">{children}</div>
    </BaseAccordion.Panel>
  );
});
