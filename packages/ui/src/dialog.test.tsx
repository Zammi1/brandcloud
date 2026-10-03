import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { createPortal } from "react-dom";
import { Fragment, memo, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "./dialog";

describe("Dialog", () => {
  function Harness({ onOpenChange = vi.fn() }: { onOpenChange?: (open: boolean) => void }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button">Outside</button>
        <Dialog
          trigger={<button>Open dialog</button>}
          title="Share settings"
          description="Choose how this link is shared."
          open={open}
          onOpenChange={(next) => { onOpenChange(next); setOpen(next); }}
          actions={<button type="button">Save</button>}
          closeLabel="Close settings"
        >
          <a href="#terms">Terms</a>
        </Dialog>
      </>
    );
  }

  it("starts focus reliably on the named popup and installs modal focus containment", async () => {
    render(<Harness />);
    const outside = screen.getByRole("button", { name: "Outside" });
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog", { name: "Share settings" });
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(within(dialog).getByText("Choose how this link is shared.")).toBeVisible();

    expect(outside.parentElement).toHaveAttribute("data-base-ui-inert");
    expect(outside.parentElement).toHaveAttribute("aria-hidden", "true");
    const guards = document.querySelectorAll("[data-base-ui-focus-guard]");
    expect(guards).toHaveLength(2);
    fireEvent.focus(guards[1]!);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it.each(["escape", "backdrop", "close"] as const)("dismisses through %s and restores trigger focus", async (method) => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");

    if (method === "escape") fireEvent.keyDown(dialog, { key: "Escape" });
    if (method === "backdrop") fireEvent.click(document.querySelector<HTMLElement>(".brand-dialog__backdrop")!);
    if (method === "close") fireEvent.click(within(dialog).getByRole("button", { name: "Close settings" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("propagates explicit portal direction and theme", () => {
    render(<Dialog defaultOpen portalDirection="rtl" portalTheme="midnight" trigger={<button>Details</button>} title="Details">Content</Dialog>);
    const portal = screen.getByRole("dialog").closest(".brand-dialog__portal");
    expect(portal).toHaveAttribute("dir", "rtl");
    expect(portal).toHaveAttribute("data-theme", "midnight");
  });

  it.each([
    ["title", "   ", /dialog title must contain visible text/],
    ["title", <Fragment>   </Fragment>, /dialog title must contain visible text/],
    ["title", { unexpected: true }, /dialog title must contain visible text/],
    ["closeLabel", "   ", /dialog closeLabel must be a nonempty string/],
    ["closeLabel", 42, /dialog closeLabel must be a nonempty string/],
  ] as const)("rejects an invalid required %s value", (name, value, message) => {
    const props = {
      trigger: <button>Open dialog</button>,
      title: "Named dialog",
      closeLabel: "Close dialog",
      children: "Content",
      [name]: value,
    };
    expect(() => render(<Dialog {...(props as any)} />)).toThrow(message);
  });

  it("supports inspectable composite titles and rejects opaque title components", () => {
    const OpaqueTitle = memo(() => <span>Opaque title</span>);
    render(
      <Dialog defaultOpen trigger={<button>Open named dialog</button>} title={<><span>Named</span> <em>dialog</em></>} titleAccessibleLabel="Named dialog">
        Content
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Named dialog" })).toBeVisible();
    expect(() => render(
      <Dialog defaultOpen trigger={<button>Open opaque title</button>} title={<OpaqueTitle /> as never} titleAccessibleLabel="Opaque title">Content</Dialog>,
    )).toThrow(/dialog title must be an intrinsic authored tree; memo components are not supported/);
  });

  it("uses an independent scalar name for rich and semantically hidden intrinsic titles", () => {
    render(
      <Dialog
        defaultOpen
        trigger={<button>Open hidden title dialog</button>}
        title={<span aria-hidden="true">Hidden presentation</span>}
        titleAccessibleLabel="Independent dialog name"
      >Content</Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Independent dialog name" })).toBeVisible();
    expect(() => render(
      <Dialog {...({ defaultOpen: true, trigger: <button>Missing scalar</button>, title: <span>Rich title</span>, children: "Content" } as any)} />,
    )).toThrow(/accessible label is required for rich title content/);
    expect(() => render(
      <Dialog defaultOpen trigger={<button>Blank scalar</button>} title={<span>Rich title</span>} titleAccessibleLabel=" ">Content</Dialog>,
    )).toThrow(/accessible label must be a nonempty string/);
  });

  it("renders Set slots and rejects generators before advancing them", () => {
    let advances = 0;
    function* oneShot() {
      advances += 1;
      yield <span>Consumed</span>;
    }
    render(
      <Dialog defaultOpen trigger={<button>Open Set dialog</button>} title="Set dialog" actions={new Set([<button key="save">Save Set</button>])}>
        {new Set([<span key="body">Set body</span>])}
      </Dialog>,
    );
    expect(screen.getByText("Set body")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save Set" })).toBeVisible();
    expect(() => render(
      <Dialog defaultOpen trigger={<button>Open generator dialog</button>} title="Generator dialog">
        {oneShot() as never}
      </Dialog>,
    )).toThrow(/dialog children must not contain a one-shot iterator or generator/);
    expect(advances).toBe(0);
  });

  it("recaptures document context for controlled programmatic opens and reopens", () => {
    document.documentElement.dir = "ltr";
    document.documentElement.setAttribute("data-theme", "light");
    const base = { trigger: <button>Details</button>, title: "Details" } as const;
    const { rerender } = render(<Dialog {...base} open={false}>Content</Dialog>);

    document.documentElement.dir = "rtl";
    document.documentElement.setAttribute("data-theme", "midnight");
    rerender(<Dialog {...base} open>Content</Dialog>);
    let portal = screen.getByRole("dialog").closest(".brand-dialog__portal");
    expect(portal).toHaveAttribute("dir", "rtl");
    expect(portal).toHaveAttribute("data-theme", "midnight");

    rerender(<Dialog {...base} open={false}>Content</Dialog>);
    document.documentElement.dir = "ltr";
    document.documentElement.setAttribute("data-theme", "daylight");
    rerender(<Dialog {...base} open>Content</Dialog>);
    portal = screen.getByRole("dialog").closest(".brand-dialog__portal");
    expect(portal).toHaveAttribute("dir", "ltr");
    expect(portal).toHaveAttribute("data-theme", "daylight");
  });

  it("captures current document context when the trigger opens the dialog", () => {
    document.documentElement.dir = "ltr";
    document.documentElement.setAttribute("data-theme", "light");
    render(<Dialog trigger={<button>Details</button>} title="Details">Content</Dialog>);
    document.documentElement.dir = "rtl";
    document.documentElement.setAttribute("data-theme", "midnight");

    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    const portal = screen.getByRole("dialog", { name: "Details" }).closest(".brand-dialog__portal");
    expect(portal).toHaveAttribute("dir", "rtl");
    expect(portal).toHaveAttribute("data-theme", "midnight");
  });

  it("applies live explicit direction and theme overrides while open", () => {
    const base = { trigger: <button>Details</button>, title: "Details", open: true } as const;
    const { rerender } = render(<Dialog {...base} portalDirection="ltr" portalTheme="daylight">Content</Dialog>);
    rerender(<Dialog {...base} portalDirection="rtl" portalTheme="midnight">Content</Dialog>);
    const portal = screen.getByRole("dialog").closest(".brand-dialog__portal");
    expect(portal).toHaveAttribute("dir", "rtl");
    expect(portal).toHaveAttribute("data-theme", "midnight");
  });

  it("rejects direct authored portals and leaves opaque external overlay focus to the consumer", () => {
    function ConsumerOverlay() {
      return createPortal(<button id="external-dialog-control" type="button">External consumer control</button>, document.body);
    }
    const base = { defaultOpen: true, trigger: <button>Open portal dialog</button>, title: "Portal dialog" } as const;

    expect(() => render(
      <Dialog {...base}>{createPortal(<button type="button">Direct child portal</button>, document.body)}</Dialog>,
    )).toThrow(/dialog children must not contain a direct React portal/);
    expect(() => render(
      <Dialog {...base} description={createPortal(<span>Direct description portal</span>, document.body)}>Content</Dialog>,
    )).toThrow(/dialog description must not contain a direct React portal/);
    expect(() => render(
      <Dialog {...base} actions={createPortal(<button type="button">Direct action portal</button>, document.body)}>Content</Dialog>,
    )).toThrow(/dialog actions must not contain a direct React portal/);

    render(<Dialog {...base}><ConsumerOverlay /></Dialog>);
    const dialog = screen.getByRole("dialog", { name: "Portal dialog" });
    const external = document.getElementById("external-dialog-control") as HTMLButtonElement;
    expect(dialog).not.toContainElement(external);
    external.focus();
    expect(external).toHaveFocus();
  });

  it("defines viewport, safe-area, internal-scroll, containment, narrow, forced-colour, and reduced-motion rules", () => {
    const css = readFileSync("dist/styles.css", "utf8");
    expect(css).toMatch(/\.brand-dialog__portal \{[^}]*overflow: hidden[^}]*env\(safe-area-inset-top\)/s);
    expect(css).toMatch(/\.brand-dialog__portal \{[^}]*padding-left: max\(1rem, env\(safe-area-inset-left\)\)[^}]*padding-right: max\(1rem, env\(safe-area-inset-right\)\)/s);
    expect(css).not.toMatch(/\.brand-dialog__portal \{[^}]*padding-inline-(start|end):[^;]*safe-area-inset-(left|right)/);
    expect(css).toMatch(/\.brand-dialog__popup \{[^}]*container-type: inline-size[^}]*max-block-size: calc\(100dvb[^}]*safe-area-inset-top[^}]*safe-area-inset-bottom[^}]*overflow: auto[^}]*overscroll-behavior: contain/s);
    expect(css).toMatch(/\.brand-dialog__title,[^}]*\.brand-dialog__description,[^}]*\.brand-dialog__content,[^}]*\.brand-dialog__actions \{[^}]*min-inline-size: 0[^}]*overflow-wrap: anywhere/s);
    expect(css).toMatch(/\.brand-dialog__content \*,[^}]*\.brand-dialog__actions \* \{[^}]*min-inline-size: 0[^}]*max-inline-size: 100%[^}]*overflow-wrap: anywhere/s);
    expect(css).toMatch(/@media \(max-width: 46rem\)[\s\S]*\.brand-dialog__popup \{ padding: 1rem; \}/);
    expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*\.brand-dialog__backdrop[\s\S]*backdrop-filter: none/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.brand-dialog__backdrop[\s\S]*transition-duration: 0ms/);
  });
});
