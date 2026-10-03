import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

describe("Popover", () => {
  it("opens and closes uncontrolled through the trigger and restores trigger focus", async () => {
    const onOpenChange = vi.fn();
    render(
      <Popover onOpenChange={onOpenChange}>
        <PopoverTrigger>Toggle popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Toggle popover" });
    expect(screen.queryByText("Popover body")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const body = await screen.findByText("Popover body");
    expect(body).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledWith(true);

    fireEvent.keyDown(body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Popover body")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(trigger).toHaveFocus();
  });

  it("closes through the trigger toggle when uncontrolled and restores trigger focus", async () => {
    const onOpenChange = vi.fn();
    render(
      <Popover defaultOpen onOpenChange={onOpenChange}>
        <PopoverTrigger>Toggle popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Toggle popover" });
    await screen.findByText("Popover body");

    fireEvent.click(trigger);
    await waitFor(() => expect(screen.queryByText("Popover body")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(trigger).toHaveFocus();
  });

  it("supports controlled open state", async () => {
    const onOpenChange = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open externally</button>
          <Popover
            open={open}
            onOpenChange={(next) => { onOpenChange(next); setOpen(next); }}
          >
            <PopoverTrigger>Controlled popover</PopoverTrigger>
            <PopoverContent>Controlled body</PopoverContent>
          </Popover>
        </>
      );
    }
    render(<Harness />);
    expect(screen.queryByText("Controlled body")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open externally" }));
    const body = await screen.findByText("Controlled body");
    expect(body).toBeVisible();

    fireEvent.keyDown(body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Controlled body")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("passes side and align from the root to the positioner and honors content overrides", async () => {
    render(
      <Popover defaultOpen side="top" align="start">
        <PopoverTrigger>Placed popover</PopoverTrigger>
        <PopoverContent side="left" align="end">Placed body</PopoverContent>
      </Popover>,
    );
    const body = await screen.findByText("Placed body");
    const positioner = body.closest(".brand-popover");
    expect(positioner).not.toBeNull();
    expect(positioner).toHaveAttribute("data-side", "left");
    expect(positioner).toHaveAttribute("data-align", "end");
  });

  it("moves keyboard focus into interactive content", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open tools</PopoverTrigger>
        <PopoverContent>
          <button type="button">First tool</button>
        </PopoverContent>
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Open tools" });
    trigger.focus();
    fireEvent.click(trigger, { detail: 0 });

    const firstTool = await screen.findByRole("button", { name: "First tool" });
    await waitFor(() => expect(firstTool).toHaveFocus());
  });
});


describe("Popover refs", () => {
  it.each([
    ["PopoverTrigger", PopoverTrigger],
    ["PopoverContent", PopoverContent],
  ])("%s supports the React 18 forwardRef protocol", (_name, component) => {
    expect(component).toHaveProperty("$$typeof", Symbol.for("react.forward_ref"));
  });

  it("forwards trigger and portaled content refs and clears them on unmount", async () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const contentRef = createRef<HTMLDivElement>();
    const { unmount } = render(
      <Popover defaultOpen>
        <PopoverTrigger ref={triggerRef}>Ref tools</PopoverTrigger>
        <PopoverContent ref={contentRef} aria-label="Ref tools panel">Tools</PopoverContent>
      </Popover>,
    );

    expect(contentRef.current).toBe(await screen.findByRole("dialog", { name: "Ref tools panel" }));
    expect(triggerRef.current).toBe(screen.getByRole("button", { name: "Ref tools" }));

    unmount();
    expect(contentRef.current).toBeNull();
    expect(triggerRef.current).toBeNull();
  });
});
