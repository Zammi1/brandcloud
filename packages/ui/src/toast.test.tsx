import type { HTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toast } from "./toast";

afterEach(() => {
  vi.useRealTimers();
});

describe("Toast", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<Toast open={false} onOpenChange={() => {}} title="Saved" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("auto-dismisses after the duration", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    render(
      <Toast open onOpenChange={onOpenChange} duration={6000} title="Saved">
        Your changes are live.
      </Toast>,
    );
    vi.advanceTimersByTime(5999);
    expect(onOpenChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("pauses the countdown while hovered and resumes the remaining time", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const { container } = render(
      <Toast open onOpenChange={onOpenChange} duration={6000} title="Saved" />,
    );
    const toast = container.firstElementChild as HTMLElement;
    vi.advanceTimersByTime(3000);
    fireEvent.pointerEnter(toast);
    vi.advanceTimersByTime(6000);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.pointerLeave(toast);
    vi.advanceTimersByTime(2999);
    expect(onOpenChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("pauses the countdown while focus is inside", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    render(
      <Toast open onOpenChange={onOpenChange} duration={4000} title="Saved">
        <button type="button">Undo</button>
      </Toast>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Undo" }));
    vi.advanceTimersByTime(10000);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByRole("button", { name: "Undo" }));
    vi.advanceTimersByTime(4000);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("persists until dismissed when duration is 0", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    render(<Toast open onOpenChange={onOpenChange} duration={0} title="Held" />);
    vi.advanceTimersByTime(60000);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("announces assertively for danger tone and politely otherwise", () => {
    const { rerender, container } = render(
      <Toast open onOpenChange={() => {}} tone="danger" title="Upload failed" />,
    );
    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "danger");
    rerender(<Toast open onOpenChange={() => {}} tone="success" title="Uploaded" />);
    expect(container.firstElementChild).toHaveAttribute("role", "status");
  });

  it("keeps the computed role when callers attempt to override it", () => {
    const rogue = { role: "presentation", "aria-label": "Caller label" } as HTMLAttributes<HTMLDivElement>;
    const { container, rerender } = render(
      <Toast open onOpenChange={() => {}} tone="success" title="Uploaded" {...rogue} />,
    );
    expect(container.firstElementChild).toHaveAttribute("role", "status");
    expect(container.firstElementChild).toHaveAttribute("aria-label", "Caller label");

    rerender(<Toast open onOpenChange={() => {}} tone="danger" title="Upload failed" {...rogue} />);
    expect(container.firstElementChild).toHaveAttribute("role", "alert");
  });

  it("dismisses via the dismiss button", () => {
    const onOpenChange = vi.fn();
    render(<Toast open onOpenChange={onOpenChange} dismissLabel="Close" title="Saved" />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
