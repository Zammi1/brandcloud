"use client";

import {
  cloneElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { containModalTab, useModalTabContainment } from "./modal-focus.js";
import {
  type AccessibleTitleNode,
  type StableReactNode,
  normalizeReactNode,
  resolveAccessibleTitle,
} from "./react-node.js";
import type { PortalDataAttributes } from "./dialog.js";

export type DrawerTriggerButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
export type DrawerTriggerElement = ReactElement<DrawerTriggerButtonProps>;
export type DrawerSide = "left" | "right";
export type DrawerDirection = "ltr" | "rtl";

interface DrawerBaseProps {
  /** Exactly one real button onto which Base UI composes trigger behaviour. */
  trigger: DrawerTriggerElement;
  description?: StableReactNode;
  children: StableReactNode;
  actions?: StableReactNode;
  closeLabel?: string;
  side?: DrawerSide;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  portalDirection?: DrawerDirection;
  portalTheme?: string;
  /** Data attributes copied to the portaled root for scoped presentation adapters. */
  portalDataAttributes?: PortalDataAttributes;
  className?: string;
}

export type DrawerProps = DrawerBaseProps & (
  | {
      /** A primitive visible title that supplies its own programmatic name. */
      title: string | number | bigint;
      titleAccessibleLabel?: string;
    }
  | {
      /** Rich intrinsic visible title presentation. */
      title: Exclude<AccessibleTitleNode, string | number | bigint>;
      /** Independent programmatic name required for rich title presentation. */
      titleAccessibleLabel: string;
    }
);

function resolveDirection(override?: DrawerDirection): DrawerDirection {
  if (override === "ltr" || override === "rtl") return override;
  if (typeof document === "undefined") return "ltr";
  return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
}

function resolveTheme(override?: string): string {
  if (typeof override === "string" && override.trim()) return override.trim();
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") ?? "light";
}

function requireDrawerCloseLabel(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("@brandcloud/ui: drawer closeLabel must be a nonempty string.");
  }
  return value.trim();
}

function normalizePortalDataAttributes(value: PortalDataAttributes | undefined): HTMLAttributes<HTMLDivElement> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("@brandcloud/ui: drawer portalDataAttributes must be an object.");
  }
  const normalized: Record<string, string | number> = {};
  for (const key of Object.keys(value).sort()) {
    const attributeValue = value[key as keyof typeof value];
    if (!/^data-[a-z][a-z0-9_.:-]*$/.test(key)) {
      throw new TypeError(`@brandcloud/ui: drawer portal data attribute "${key}" is invalid.`);
    }
    if (typeof attributeValue !== "string" && typeof attributeValue !== "number") {
      throw new TypeError(`@brandcloud/ui: drawer portal data attribute "${key}" must be a string or number.`);
    }
    normalized[key] = attributeValue;
  }
  return normalized as HTMLAttributes<HTMLDivElement>;
}

function normalizeTrigger(
  trigger: DrawerTriggerElement,
  className?: string,
): DrawerTriggerElement {
  const triggerClassName =
    typeof trigger.props.className === "string" ? trigger.props.className : undefined;
  const mergedClassName = [triggerClassName, className].filter(Boolean).join(" ");

  return cloneElement(trigger, {
    type: trigger.props.type ?? "button",
    className: mergedClassName || undefined,
  });
}

export function Drawer({
  actions,
  children,
  className,
  closeLabel = "Close",
  defaultOpen,
  description,
  onOpenChange,
  open,
  portalDirection,
  portalDataAttributes,
  portalTheme,
  side = "right",
  title,
  titleAccessibleLabel,
  trigger,
}: DrawerProps) {
  const resolvedTitle = resolveAccessibleTitle(title, titleAccessibleLabel, "@brandcloud/ui: drawer title");
  const resolvedDescription = normalizeReactNode(description, { name: "@brandcloud/ui: drawer description" });
  const resolvedChildren = normalizeReactNode(children, { name: "@brandcloud/ui: drawer children" });
  const resolvedActions = normalizeReactNode(actions, { name: "@brandcloud/ui: drawer actions" });
  const resolvedCloseLabel = requireDrawerCloseLabel(closeLabel);
  const resolvedPortalDataAttributes = normalizePortalDataAttributes(portalDataAttributes);
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(Boolean(defaultOpen));
  const [direction, setDirection] = useState(() => resolveDirection(portalDirection));
  const [theme, setTheme] = useState(() => resolveTheme(portalTheme));
  const popupRef = useRef<HTMLDivElement>(null);
  const resolvedOpen = isControlled ? open : internalOpen;
  const resolvedDirection = portalDirection ?? direction;
  const resolvedTheme = portalTheme?.trim() || theme;
  useModalTabContainment(popupRef, Boolean(resolvedOpen));
  const setPopupRef = useCallback((popup: HTMLDivElement | null) => {
    popupRef.current = popup;
    if (popup && resolvedOpen) popup.focus({ preventScroll: true });
  }, [resolvedOpen]);

  useEffect(() => {
    if (!resolvedOpen) return;
    setDirection(resolveDirection(portalDirection));
    setTheme(resolveTheme(portalTheme));
  }, [portalDirection, portalTheme, resolvedOpen]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) setInternalOpen(nextOpen);
    if (nextOpen) {
      setDirection(resolveDirection(portalDirection));
      setTheme(resolveTheme(portalTheme));
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <BaseDrawer.Root
      open={resolvedOpen}
      onOpenChange={handleOpenChange}
      swipeDirection={side}
    >
      <BaseDrawer.Trigger render={normalizeTrigger(trigger, className)} />
      <BaseDrawer.Portal keepMounted={false}>
        <div
          {...resolvedPortalDataAttributes}
          className="brand-drawer__portal"
          data-side={side}
          data-theme={resolvedTheme}
          dir={resolvedDirection}
        >
          <BaseDrawer.Backdrop className="brand-drawer__backdrop" />
          <BaseDrawer.Viewport className="brand-drawer__viewport">
            <BaseDrawer.Popup
              ref={setPopupRef}
              className="brand-drawer__popup"
              aria-label={resolvedTitle.accessibleLabel}
              aria-labelledby={undefined}
              initialFocus={popupRef}
              tabIndex={-1}
              onKeyDownCapture={(event) => containModalTab(event, popupRef)}
            >
              <header className="brand-drawer__header">
                <BaseDrawer.Title className="brand-drawer__title">
                  {resolvedTitle.content}
                </BaseDrawer.Title>
                {description !== undefined ? (
                  <BaseDrawer.Description className="brand-drawer__description">
                    {resolvedDescription}
                  </BaseDrawer.Description>
                ) : null}
              </header>
              <BaseDrawer.Content className="brand-drawer__content">
                {resolvedChildren}
              </BaseDrawer.Content>
              <footer className="brand-drawer__actions">
                {resolvedActions}
                <BaseDrawer.Close
                  type="button"
                  className="brand-button"
                  data-brand-part="focus-target"
                  data-tone="neutral"
                  data-size="md"
                >
                  {resolvedCloseLabel}
                </BaseDrawer.Close>
              </footer>
            </BaseDrawer.Popup>
          </BaseDrawer.Viewport>
        </div>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
}
