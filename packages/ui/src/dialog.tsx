"use client";

import {
  cloneElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { containModalTab, useModalTabContainment } from "./modal-focus.js";
import {
  type AccessibleTitleNode,
  type StableReactNode,
  normalizeReactNode,
  resolveAccessibleTitle,
} from "./react-node.js";

export type TriggerButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export type TriggerElement = ReactElement<TriggerButtonProps>;

export type Direction = "ltr" | "rtl";

export type PortalDataAttributes = Readonly<
  Partial<Record<`data-${string}`, string | number>>
>;

interface DialogBaseProps {
  /**
   * Exactly one interactive button element.
   *
   * BrandCloud intentionally does not accept arbitrary ReactNode here because
   * Base UI trigger behaviour must be composed onto the actual interactive
   * element.
   */
  trigger: TriggerElement;

  description?: StableReactNode;
  children: StableReactNode;
  actions?: StableReactNode;

  /**
   * Text for the built-in close button.
   */
  closeLabel?: string;

  /**
   * Controlled state.
   */
  open?: boolean;

  /**
   * Initial state for uncontrolled usage.
   */
  defaultOpen?: boolean;

  onOpenChange?: (open: boolean) => void;

  /**
   * Optional portal presentation overrides.
   *
   * When omitted, values are captured from document.documentElement when the
   * dialog opens.
   */
  portalDirection?: Direction;
  portalTheme?: string;

  /** Data attributes copied to the portaled root for scoped presentation adapters. */
  portalDataAttributes?: PortalDataAttributes;

  /**
   * Optional class applied to the trigger element.
   */
  className?: string;
}

export type DialogProps = DialogBaseProps & (
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

function resolveDirection(override?: Direction): Direction {
  if (override === "ltr" || override === "rtl") {
    return override;
  }

  if (typeof document === "undefined") {
    return "ltr";
  }

  return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
}

function requireDialogCloseLabel(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("@brandcloud/ui: dialog closeLabel must be a nonempty string.");
  }
  return value.trim();
}

function normalizePortalDataAttributes(value: PortalDataAttributes | undefined): HTMLAttributes<HTMLDivElement> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("@brandcloud/ui: dialog portalDataAttributes must be an object.");
  }
  const normalized: Record<string, string | number> = {};
  for (const key of Object.keys(value).sort()) {
    const attributeValue = value[key as keyof typeof value];
    if (!/^data-[a-z][a-z0-9_.:-]*$/.test(key)) {
      throw new TypeError(`@brandcloud/ui: dialog portal data attribute "${key}" is invalid.`);
    }
    if (typeof attributeValue !== "string" && typeof attributeValue !== "number") {
      throw new TypeError(`@brandcloud/ui: dialog portal data attribute "${key}" must be a string or number.`);
    }
    normalized[key] = attributeValue;
  }
  return normalized as HTMLAttributes<HTMLDivElement>;
}

function resolveTheme(override?: string): string {
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }

  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.getAttribute("data-theme") ?? "light";
}

function normalizeTrigger(
  trigger: TriggerElement,
  className?: string,
): TriggerElement {
  const triggerClassName =
    typeof trigger.props.className === "string"
      ? trigger.props.className
      : undefined;

  const mergedClassName = [triggerClassName, className]
    .filter(Boolean)
    .join(" ");

  return cloneElement(trigger, {
    type: trigger.props.type ?? "button",
    className: mergedClassName || undefined,
  });
}

export function Dialog({
  actions,
  children,
  closeLabel = "Close",
  className,
  defaultOpen,
  description,
  onOpenChange,
  open,
  portalDirection,
  portalDataAttributes,
  portalTheme,
  title,
  titleAccessibleLabel,
  trigger,
}: DialogProps) {
  const resolvedTitle = resolveAccessibleTitle(title, titleAccessibleLabel, "@brandcloud/ui: dialog title");
  const resolvedDescription = normalizeReactNode(description, { name: "@brandcloud/ui: dialog description" });
  const resolvedChildren = normalizeReactNode(children, { name: "@brandcloud/ui: dialog children" });
  const resolvedActions = normalizeReactNode(actions, { name: "@brandcloud/ui: dialog actions" });
  const resolvedCloseLabel = requireDialogCloseLabel(closeLabel);
  const resolvedPortalDataAttributes = normalizePortalDataAttributes(portalDataAttributes);
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState<boolean>(Boolean(defaultOpen));
  const popupRef = useRef<HTMLDivElement>(null);

  const normalizedTrigger = normalizeTrigger(trigger, className);
  const resolvedOpen = isControlled ? open : internalOpen;
  const resolvedPortalDirection = useMemo(
    () => resolveDirection(portalDirection),
    [portalDirection, resolvedOpen],
  );
  const resolvedPortalTheme = useMemo(
    () => resolveTheme(portalTheme),
    [portalTheme, resolvedOpen],
  );
  useModalTabContainment(popupRef, Boolean(resolvedOpen));
  const setPopupRef = useCallback((popup: HTMLDivElement | null) => {
    popupRef.current = popup;
    if (popup && resolvedOpen) popup.focus({ preventScroll: true });
  }, [resolvedOpen]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  return (
    <BaseDialog.Root
      open={resolvedOpen}
      onOpenChange={handleOpenChange}
    >
      <BaseDialog.Trigger render={normalizedTrigger} />
      {resolvedOpen ? (
        <BaseDialog.Portal keepMounted={false}>
          <div
            {...resolvedPortalDataAttributes}
            className="brand-dialog__portal"
            dir={resolvedPortalDirection}
            data-theme={resolvedPortalTheme}
          >
            <BaseDialog.Backdrop className="brand-dialog__backdrop" />

            <BaseDialog.Popup
              ref={setPopupRef}
              initialFocus={popupRef}
              className="brand-dialog__popup"
              aria-label={resolvedTitle.accessibleLabel}
              aria-labelledby={undefined}
              tabIndex={-1}
              onKeyDownCapture={(event) => containModalTab(event, popupRef)}
            >
              <BaseDialog.Title className="brand-dialog__title">
                {resolvedTitle.content}
              </BaseDialog.Title>

              {description !== undefined ? (
                <BaseDialog.Description className="brand-dialog__description">
                  {resolvedDescription}
                </BaseDialog.Description>
              ) : null}

              <div className="brand-dialog__content">
                {resolvedChildren}
              </div>

              <div className="brand-dialog__actions">
                {resolvedActions}

                <BaseDialog.Close
                  type="button"
                  className="brand-button"
                  data-tone="neutral"
                  data-size="md"
                >
                  {resolvedCloseLabel}
                </BaseDialog.Close>
              </div>
            </BaseDialog.Popup>
          </div>
        </BaseDialog.Portal>
      ) : null}
    </BaseDialog.Root>
  );
}
