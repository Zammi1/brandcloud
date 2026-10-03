import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./drawer";

describe("Drawer", () => {
  it("opens from a button, exposes its accessible name, and restores focus", async () => {
    render(
      <Drawer
        trigger={<button>Help</button>}
        title="Product help"
        description="Answers for this screen"
        closeLabel="Close help"
      >
        Help content
      </Drawer>,
    );
    const trigger = screen.getByRole("button", { name: "Help" });
    expect(trigger).toHaveAttribute("type", "button");
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Product help" });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Answers for this screen")).toBeInTheDocument();
    const close = screen.getByRole("button", { name: "Close help" });
    expect(close).toHaveAttribute("data-brand-part", "focus-target");
    fireEvent.click(close);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it.each(["escape", "backdrop"] as const)("dismisses through %s and restores focus", async (method) => {
    render(<Drawer trigger={<button>Help</button>} title="Product help">Help content</Drawer>);
    const trigger = screen.getByRole("button", { name: "Help" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    if (method === "escape") fireEvent.keyDown(dialog, { key: "Escape" });
    if (method === "backdrop") fireEvent.click(document.querySelector<HTMLElement>(".brand-drawer__backdrop")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("supports controlled state and propagates portal direction and theme", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Drawer
        open={false}
        onOpenChange={onOpenChange}
        portalDirection="rtl"
        portalTheme="midnight"
        side="left"
        trigger={<button>Details</button>}
        title="Details"
      >
        Content
      </Drawer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <Drawer open portalDirection="ltr" portalTheme="daylight" side="left" trigger={<button>Details</button>} title="Details">
        Content
      </Drawer>,
    );
    const portal = screen.getByRole("dialog").closest(".brand-drawer__portal");
    expect(portal).toHaveAttribute("dir", "ltr");
    expect(portal).toHaveAttribute("data-theme", "daylight");
    expect(portal).toHaveAttribute("data-side", "left");
  });

  it("enforces a visible intrinsic title and nonempty close label", () => {
    expect(() => render(<Drawer trigger={<button>Open</button>} title={"   " as never}>Content</Drawer>)).toThrow(
      /drawer title must contain visible text/,
    );
    expect(() => render(<Drawer trigger={<button>Open</button>} title="Named" closeLabel="   ">Content</Drawer>)).toThrow(
      /drawer closeLabel must be a nonempty string/,
    );
    render(<Drawer defaultOpen trigger={<button>Open</button>} title={<><span>Product</span> <em>help</em></>} titleAccessibleLabel="Product help">Content</Drawer>);
    expect(screen.getByRole("dialog", { name: "Product help" })).toBeVisible();
  });

  it("uses an independent scalar name for rich and semantically hidden intrinsic titles", () => {
    render(
      <Drawer
        defaultOpen
        trigger={<button>Open hidden title drawer</button>}
        title={<span hidden>Hidden presentation</span>}
        titleAccessibleLabel="Independent drawer name"
      >Content</Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Independent drawer name" })).toBeVisible();
    expect(() => render(
      <Drawer {...({ defaultOpen: true, trigger: <button>Missing scalar</button>, title: <span>Rich title</span>, children: "Content" } as any)} />,
    )).toThrow(/accessible label is required for rich title content/);
  });

  it("renders Set slots and rejects generators before advancing them", () => {
    let advances = 0;
    function* oneShot() {
      advances += 1;
      yield <span>Consumed</span>;
    }
    render(
      <Drawer defaultOpen trigger={<button>Open Set drawer</button>} title="Set drawer" actions={new Set([<button key="save">Save Set</button>])}>
        {new Set([<span key="body">Set body</span>])}
      </Drawer>,
    );
    expect(screen.getByText("Set body")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save Set" })).toBeVisible();
    expect(() => render(
      <Drawer defaultOpen trigger={<button>Open generator drawer</button>} title="Generator drawer">
        {oneShot() as never}
      </Drawer>,
    )).toThrow(/drawer children must not contain a one-shot iterator or generator/);
    expect(advances).toBe(0);
  });

  it("rejects direct authored portals and leaves opaque external overlay focus to the consumer", () => {
    function ConsumerOverlay() {
      return createPortal(<button id="external-drawer-control" type="button">External drawer control</button>, document.body);
    }
    const base = { defaultOpen: true, trigger: <button>Open portal drawer</button>, title: "Portal drawer" } as const;

    expect(() => render(
      <Drawer {...base}>{createPortal(<button type="button">Direct child portal</button>, document.body)}</Drawer>,
    )).toThrow(/drawer children must not contain a direct React portal/);
    expect(() => render(
      <Drawer {...base} actions={createPortal(<button type="button">Direct action portal</button>, document.body)}>Content</Drawer>,
    )).toThrow(/drawer actions must not contain a direct React portal/);

    render(<Drawer {...base}><ConsumerOverlay /></Drawer>);
    const dialog = screen.getByRole("dialog", { name: "Portal drawer" });
    const external = document.getElementById("external-drawer-control") as HTMLButtonElement;
    expect(dialog).not.toContainElement(external);
    external.focus();
    expect(external).toHaveFocus();
  });

  it("defines safe-area internal scrolling, inline containment, narrow sizing, forced colours, and reduced motion", () => {
    const css = readFileSync("dist/styles.css", "utf8");
    expect(css).toMatch(/\.brand-drawer__popup \{[^}]*container-type: inline-size[^}]*max-inline-size: 100%[^}]*overflow: auto[^}]*overscroll-behavior: contain[^}]*env\(safe-area-inset-top\)/s);
    expect(css).toMatch(/@media \(max-width: 46rem\)[\s\S]*\.brand-drawer__popup \{[^}]*width: min\(100vw, 30rem\)/);
    expect(css).toMatch(/\.brand-drawer__popup \{[^}]*padding-left: max\(1\.5rem, env\(safe-area-inset-left\)\)[^}]*padding-right: max\(1\.5rem, env\(safe-area-inset-right\)\)/s);
    expect(css).not.toMatch(/\.brand-drawer__popup \{[^}]*padding-inline-(start|end):[^;]*safe-area-inset-(left|right)/);
    expect(css).toMatch(/\.brand-drawer__title \{[^}]*min-inline-size: 0[^}]*overflow-wrap: anywhere/);
    expect(css).toMatch(/\.brand-drawer__content,[^}]*\.brand-drawer__actions \{[^}]*min-inline-size: 0[^}]*overflow-wrap: anywhere/s);
    expect(css).toMatch(/\.brand-drawer__content \*,[^}]*\.brand-drawer__actions \* \{[^}]*min-inline-size: 0[^}]*max-inline-size: 100%[^}]*overflow-wrap: anywhere/s);
    expect(css).toMatch(/\.brand-button:focus-visible \{[^}]*outline: 2px solid var\(--brand-focus\)[^}]*outline-offset: 2px/);
    expect(css).toMatch(/\.brand-drawer__backdrop \{[^}]*background: var\(--brand-overlay-backdrop\)/);
    expect(css).not.toContain("rgb(10 10 25 / 0.58)");
    expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*\.brand-drawer__backdrop[^}]*backdrop-filter: none/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.brand-drawer__backdrop,[\s\S]*\.brand-drawer__popup,[\s\S]*transition-duration: 0ms/);
  });
});
