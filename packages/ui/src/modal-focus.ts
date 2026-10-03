// Internal module: not part of the public API. Do not export from index.ts or package.json.
import { useEffect, type RefObject } from "react";

interface ModalTabEvent {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
}

const TABBABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  "[contenteditable='true']",
  "[tabindex]",
].join(",");

function isRendered(element: HTMLElement): boolean {
  if (element.hidden || element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display !== "none" && style?.visibility !== "hidden" && element.getClientRects().length > 0;
}

function tabbableChildren(popup: HTMLElement): HTMLElement[] {
  return Array.from(popup.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0 && isRendered(element));
}

/** Closes the animation-frame gap at Base UI's modal focus guards. */
export function containModalTab(
  event: ModalTabEvent,
  popupRef: RefObject<HTMLElement | null>,
): void {
  if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
  const popup = popupRef.current;
  if (!popup) return;
  const tabbable = tabbableChildren(popup);
  const first = tabbable[0] ?? popup;
  const last = tabbable[tabbable.length - 1] ?? popup;
  const active = popup.ownerDocument.activeElement;
  const shouldWrapBackward = event.shiftKey && (active === first || active === popup || !popup.contains(active));
  const shouldWrapForward = !event.shiftKey && (active === last || (tabbable.length === 0 && active === popup) || !popup.contains(active));
  if (!shouldWrapBackward && !shouldWrapForward) return;
  event.preventDefault();
  (shouldWrapBackward ? last : first).focus({ preventScroll: true });
}

/** Captures Tab at the document edge before Base UI's guards can advance it. */
export function useModalTabContainment(
  popupRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;
    const ownerDocument = popupRef.current?.ownerDocument ?? document;
    const handleKeyDown = (event: KeyboardEvent) => {
      const popup = popupRef.current;
      if (!popup) return;
      const ownedPopups = Array.from(ownerDocument.querySelectorAll<HTMLElement>(
        ".brand-dialog__popup, .brand-drawer__popup",
      ));
      if (ownedPopups.at(-1) !== popup) return;
      const focused = ownerDocument.activeElement;
      const focusIsOwned = focused === ownerDocument.body
        || (focused instanceof HTMLElement && focused.dataset.baseUiFocusGuard !== undefined)
        || popup.contains(focused);
      if (focusIsOwned) containModalTab(event, popupRef);
    };
    ownerDocument.addEventListener("keydown", handleKeyDown, true);
    return () => ownerDocument.removeEventListener("keydown", handleKeyDown, true);
  }, [active, popupRef]);
}
