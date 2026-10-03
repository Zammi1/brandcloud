import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, resolveButtonVariant, type ButtonVariant } from "./button";

describe("Button", () => {
  it("is a non-submitting button by default", () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "button");
  });

  it("prevents interaction while loading", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps the legacy markup contract: brand tone, md size and no appearance unless asked", () => {
    render(<Button>Continue</Button>);
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toHaveClass("brand-button");
    expect(button).toHaveAttribute("data-tone", "brand");
    expect(button).toHaveAttribute("data-size", "md");
    expect(button).not.toHaveAttribute("data-appearance");
    expect(button).not.toHaveAttribute("data-level");
  });

  it("supports every tone, appearance and size", () => {
    render(
      <>
        <Button tone="ink" appearance="depth" size="lg">Ink depth</Button>
        <Button tone="whatsapp" appearance="solid" size="sm">WhatsApp</Button>
        <Button tone="neutral" appearance="outline">Outline</Button>
        <Button tone="danger" appearance="ghost">Ghost</Button>
        <Button tone="quiet">Quiet</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Ink depth" })).toHaveAttribute("data-appearance", "depth");
    expect(screen.getByRole("button", { name: "Ink depth" })).toHaveAttribute("data-size", "lg");
    expect(screen.getByRole("button", { name: "WhatsApp" })).toHaveAttribute("data-tone", "whatsapp");
    expect(screen.getByRole("button", { name: "Outline" })).toHaveAttribute("data-appearance", "outline");
    expect(screen.getByRole("button", { name: "Ghost" })).toHaveAttribute("data-tone", "danger");
    expect(screen.getByRole("button", { name: "Quiet" })).toHaveAttribute("data-tone", "quiet");
  });

  it("emits a level only for the level tone and defaults it to blue", () => {
    render(
      <>
        <Button tone="level">Growth</Button>
        <Button tone="level" level="obsidian">Scale</Button>
        <Button level="sky">Ignored level</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Growth" })).toHaveAttribute("data-level", "blue");
    expect(screen.getByRole("button", { name: "Scale" })).toHaveAttribute("data-level", "obsidian");
    expect(screen.getByRole("button", { name: "Ignored level" })).not.toHaveAttribute("data-level");
  });

  it("maps the shadcn-compatible variant alias onto tone and appearance", () => {
    const cases: Array<[ButtonVariant, string, string | null]> = [
      ["default", "brand", null],
      ["depth", "brand", "depth"],
      ["solid", "brand", "solid"],
      ["ink", "ink", null],
      ["outline", "neutral", "outline"],
      ["ghost", "neutral", "ghost"],
      ["level", "level", null],
      ["whatsapp", "whatsapp", null],
      ["destructive", "danger", "solid"],
      ["secondary", "neutral", "solid"],
    ];
    for (const [variant, tone, appearance] of cases) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      const button = screen.getByRole("button", { name: variant });
      expect(button).toHaveAttribute("data-tone", tone);
      if (appearance) expect(button).toHaveAttribute("data-appearance", appearance);
      else expect(button).not.toHaveAttribute("data-appearance");
      unmount();
    }
  });

  it("lets explicit tone and appearance win over the variant alias", () => {
    expect(resolveButtonVariant({ variant: "destructive", appearance: "outline" })).toEqual({ tone: "danger", appearance: "outline" });
    expect(resolveButtonVariant({ variant: "outline", tone: "ink" })).toEqual({ tone: "ink", appearance: "outline" });
    expect(resolveButtonVariant({})).toEqual({ tone: "brand", appearance: undefined });
  });

  it("exposes toggle state with aria-pressed only when pressed is set", () => {
    render(
      <>
        <Button pressed>Bold</Button>
        <Button pressed={false}>Italic</Button>
        <Button>Plain</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Italic" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Plain" })).not.toHaveAttribute("aria-pressed");
  });

  it("forwards refs and keeps a submit type when asked", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} type="submit">Send</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Send" }));
    expect(ref.current).toHaveAttribute("type", "submit");
  });

  it("renders another element through the render prop with Button styling and state", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} render={<a href="/pricing" />} tone="ink" className="extra">
        See pricing
      </Button>,
    );
    const link = screen.getByRole("link", { name: "See pricing" });
    expect(link).toHaveAttribute("href", "/pricing");
    expect(link).toHaveClass("brand-button", "extra");
    expect(link).toHaveAttribute("data-tone", "ink");
    expect(link).not.toHaveAttribute("type");
    expect(ref.current).toBe(link);
  });

  it("supports a render function that receives props and state", () => {
    const renderFn = vi.fn((props: Record<string, unknown>, state: { tone: string; loading: boolean }) => (
      <a href="/book" {...props} data-state-tone={state.tone} />
    ));
    render(<Button render={renderFn} tone="whatsapp">Message us</Button>);
    const link = screen.getByRole("link", { name: "Message us" });
    expect(link).toHaveAttribute("data-state-tone", "whatsapp");
    expect(renderFn).toHaveBeenCalledWith(expect.objectContaining({ className: "brand-button" }), expect.objectContaining({ tone: "whatsapp", loading: false }));
  });

  it("supports asChild with merged class names, child handlers and refs", () => {
    const onClick = vi.fn();
    const childClick = vi.fn();
    const childRef = createRef<HTMLAnchorElement>();
    render(
      <Button asChild onClick={onClick} appearance="outline">
        <a href="/start" ref={childRef} className="own" onClick={childClick}>Start</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Start" });
    expect(link).toHaveClass("brand-button", "own");
    expect(link).toHaveAttribute("data-appearance", "outline");
    fireEvent.click(link);
    expect(childClick).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
    expect(childRef.current).toBe(link);
  });

  it("marks custom elements aria-disabled and blocks clicks while disabled or loading", () => {
    const onClick = vi.fn();
    render(
      <Button render={<a href="/later" />} disabled onClick={onClick}>
        Later
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Later" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps native disabled semantics when the render element is a button", () => {
    render(<Button render={<button />} loading>Saving</Button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
