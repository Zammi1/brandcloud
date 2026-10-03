import { forwardRef, type HTMLAttributes } from "react";
import { cx } from "./utils";

export const Container = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Container(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cx("brand-container", className)} {...props} />;
});

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { align = "stretch", className, gap = "md", ...props },
  ref,
) {
  return <div ref={ref} className={cx("brand-stack", className)} data-align={align} data-gap={gap} {...props} />;
});

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { as: Element = "h2", className, size = "md", ...props },
  ref,
) {
  return <Element ref={ref} className={cx("brand-heading", className)} data-size={size} {...props} />;
});

export function VisuallyHidden({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx("brand-visually-hidden", className)} {...props} />;
}
