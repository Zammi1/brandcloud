import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuPopover,
  MenuSeparator,
  MenuTrigger,
} from "./menu";

if (typeof window.PointerEvent !== "function") {
  Object.defineProperty(window, "PointerEvent", {
    configurable: true,
    writable: true,
    value: class PointerEventForBaseUIKeyboardClick extends MouseEvent {},
  });
}

describe("Menu", () => {
  it("opens uncontrolled, moves item focus with ArrowDown, and exposes disabled items", async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuPopover>
          <MenuGroup>
            <MenuLabel>File actions</MenuLabel>
            <MenuItem onSelect={() => {}}>First</MenuItem>
            <MenuItem disabled onSelect={() => {}}>Second</MenuItem>
            <MenuItem onSelect={() => {}}>Third</MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem onSelect={() => {}}>Last</MenuItem>
        </MenuPopover>
      </Menu>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));

    const first = await screen.findByRole("menuitem", { name: "First" });
    await waitFor(() => expect(first).toHaveFocus());
    expect(screen.getByText("File actions")).toBeVisible();
    expect(screen.getByRole("separator")).toBeInTheDocument();

    fireEvent.keyDown(first, { key: "ArrowDown" });
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Second" })).toHaveFocus(),
    );
    expect(screen.getByRole("menuitem", { name: "Second" })).toHaveAttribute("aria-disabled", "true");

    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Second" }), { key: "ArrowDown" });
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Third" })).toHaveFocus(),
    );

    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Third" }), { key: "ArrowUp" });
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Second" })).toHaveFocus(),
    );

    expect(screen.getByRole("group", { name: "File actions" })).toBeInTheDocument();
  });

  it("selects the highlighted item with Enter and Space and closes by default", async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <Menu onOpenChange={onOpenChange}>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuPopover>
          <MenuItem onSelect={onSelect}>Only action</MenuItem>
        </MenuPopover>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: "Actions" });

    fireEvent.click(trigger);
    const item = await screen.findByRole("menuitem", { name: "Only action" });
    await waitFor(() => expect(item).toHaveFocus());

    fireEvent.keyDown(item, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(trigger);
    const reopened = await screen.findByRole("menuitem", { name: "Only action" });
    await waitFor(() => expect(reopened).toHaveFocus());

    fireEvent.keyDown(reopened, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("keeps the menu open when closeOnSelect is false", async () => {
    const onSelect = vi.fn();
    render(
      <Menu defaultOpen>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuPopover>
          <MenuItem onSelect={onSelect} closeOnSelect={false}>Stay open</MenuItem>
        </MenuPopover>
      </Menu>,
    );
    const item = await screen.findByRole("menuitem", { name: "Stay open" });

    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("does not activate disabled items", async () => {
    const onSelect = vi.fn();
    render(
      <Menu defaultOpen>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuPopover>
          <MenuItem disabled onSelect={onSelect}>Blocked action</MenuItem>
        </MenuPopover>
      </Menu>,
    );
    const item = await screen.findByRole("menuitem", { name: "Blocked action" });
    expect(item).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(item);
    fireEvent.keyDown(item, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("toggles checkbox items and reports aria-checked", async () => {
    const onCheckedChange = vi.fn();
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <Menu defaultOpen>
          <MenuTrigger>View</MenuTrigger>
          <MenuPopover>
            <MenuCheckboxItem
              checked={checked}
              onCheckedChange={(next) => { onCheckedChange(next); setChecked(next); }}
            >
              Grid lines
            </MenuCheckboxItem>
          </MenuPopover>
        </Menu>
      );
    }
    render(<Harness />);
    const item = await screen.findByRole("menuitemcheckbox", { name: "Grid lines" });
    expect(item).toHaveAttribute("aria-checked", "false");

    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(item).toHaveAttribute("aria-checked", "true");

    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    expect(item).toHaveAttribute("aria-checked", "false");
  });

  it("closes on Escape, reports the change, and restores trigger focus", async () => {
    const onOpenChange = vi.fn();
    render(
      <Menu onOpenChange={onOpenChange}>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuPopover>
          <MenuItem onSelect={() => {}}>First</MenuItem>
        </MenuPopover>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: "Actions" });
    fireEvent.click(trigger);
    const item = await screen.findByRole("menuitem", { name: "First" });

    fireEvent.keyDown(item, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("supports controlled open state", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open externally</button>
          <Menu open={open} onOpenChange={setOpen}>
            <MenuTrigger>Controlled menu</MenuTrigger>
            <MenuPopover>
              <MenuItem onSelect={() => {}}>First</MenuItem>
            </MenuPopover>
          </Menu>
        </>
      );
    }
    render(<Harness />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open externally" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "First" })).toBeVisible();
  });

  it("supports Home, End, and character navigation", async () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger>Navigate</MenuTrigger>
        <MenuPopover>
          <MenuItem>Alpha</MenuItem>
          <MenuItem>Beta</MenuItem>
          <MenuItem>Charlie</MenuItem>
        </MenuPopover>
      </Menu>,
    );

    const alpha = await screen.findByRole("menuitem", { name: "Alpha" });
    const beta = screen.getByRole("menuitem", { name: "Beta" });
    const charlie = screen.getByRole("menuitem", { name: "Charlie" });

    fireEvent.keyDown(alpha, { key: "End" });
    await waitFor(() => expect(charlie).toHaveFocus());

    fireEvent.keyDown(charlie, { key: "Home" });
    await waitFor(() => expect(alpha).toHaveFocus());

    fireEvent.keyDown(alpha, { key: "b" });
    await waitFor(() => expect(beta).toHaveFocus());
  });
});


describe("Menu refs", () => {
  it.each([
    ["MenuTrigger", MenuTrigger],
    ["MenuPopover", MenuPopover],
    ["MenuItem", MenuItem],
    ["MenuCheckboxItem", MenuCheckboxItem],
    ["MenuSeparator", MenuSeparator],
    ["MenuGroup", MenuGroup],
    ["MenuLabel", MenuLabel],
  ])("%s supports the React 18 forwardRef protocol", (_name, component) => {
    expect(component).toHaveProperty("$$typeof", Symbol.for("react.forward_ref"));
  });

  it("forwards refs to the interactive elements and portaled content and clears them on unmount", async () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const popupRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLElement>();
    const checkboxRef = createRef<HTMLElement>();
    const separatorRef = createRef<HTMLDivElement>();
    const groupRef = createRef<HTMLDivElement>();
    const labelRef = createRef<HTMLDivElement>();
    const { unmount } = render(
      <Menu defaultOpen>
        <MenuTrigger ref={triggerRef}>Ref actions</MenuTrigger>
        <MenuPopover ref={popupRef}>
          <MenuGroup ref={groupRef}>
            <MenuLabel ref={labelRef}>Ref group</MenuLabel>
            <MenuItem ref={itemRef}>Ref action</MenuItem>
            <MenuCheckboxItem ref={checkboxRef}>Ref option</MenuCheckboxItem>
          </MenuGroup>
          <MenuSeparator ref={separatorRef} />
        </MenuPopover>
      </Menu>,
    );

    expect(popupRef.current).toBe(await screen.findByRole("menu"));
    expect(triggerRef.current).toBe(screen.getByRole("button", { name: "Ref actions" }));
    expect(itemRef.current).toBe(screen.getByRole("menuitem", { name: "Ref action" }));
    expect(checkboxRef.current).toBe(screen.getByRole("menuitemcheckbox", { name: "Ref option" }));
    expect(separatorRef.current).toBe(screen.getByRole("separator"));
    expect(groupRef.current).toBe(screen.getByRole("group", { name: "Ref group" }));
    expect(labelRef.current).toBe(screen.getByText("Ref group"));

    unmount();
    for (const ref of [triggerRef, popupRef, itemRef, checkboxRef, separatorRef, groupRef, labelRef]) {
      expect(ref.current).toBeNull();
    }
  });
});
