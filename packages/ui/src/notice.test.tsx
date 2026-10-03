import type { HTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Notice, type NoticeProps } from "./notice";

describe("Notice", () => {
  it("announces politely for non-danger tones", () => {
    render(<Notice tone="info" title="Heads up">Details follow.</Notice>);
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "info");
  });

  it("announces assertively for danger tone", () => {
    render(<Notice tone="danger" title="Payment failed">Try another card.</Notice>);
    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "danger");
  });

  it("renders the title as a configurable heading, defaulting to h4", () => {
    const { rerender } = render(<Notice title="Plan updated" />);
    expect(screen.getByRole("heading", { level: 4, name: "Plan updated" })).toBeInTheDocument();
    rerender(<Notice title="Plan updated" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Plan updated" })).toBeInTheDocument();
  });

  it("reports the dismiss action to the caller without unmounting itself", () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <Notice dismissible onDismiss={onDismiss} title="Session expiring">
        Save your work.
      </Notice>,
    );
    const notice = screen.getByRole("status");
    expect(notice).toHaveAttribute("data-dismissible", "true");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(container.contains(notice)).toBe(true);
  });

  it("labels the dismiss button via dismissLabel", () => {
    render(<Notice dismissible dismissLabel="Sluit" onDismiss={() => {}} title="Voorbeeld" />);
    expect(screen.getByRole("button", { name: "Sluit" })).toBeInTheDocument();
  });

  it("omits the dismiss button when not dismissible", () => {
    render(<Notice title="Sticky" />);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("omits the dismiss button when dismissible is set without onDismiss at runtime", () => {
    const misuse = { dismissible: true } as unknown as NoticeProps;
    render(<Notice {...misuse} title="Dead configuration" />);

    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveAttribute("data-dismissible");
  });

  it("keeps the computed role when callers attempt to override it", () => {
    const rogue = { role: "presentation", "aria-label": "Caller label" } as HTMLAttributes<HTMLDivElement>;
    render(<Notice title="Override attempt" {...rogue} />);

    expect(screen.getByRole("status", { name: "Caller label" })).toHaveAttribute("data-tone", "info");
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });

  it("renders action content in a dedicated slot", () => {
    render(
      <Notice
        title="Update available"
        actions={<button type="button">Reload</button>}
      >
        Refresh to apply.
      </Notice>,
    );
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByText("Refresh to apply.")).toBeInTheDocument();
  });
});
