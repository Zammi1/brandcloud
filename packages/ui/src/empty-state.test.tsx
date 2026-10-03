import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders a heading, description and the next action", () => {
    const onAdd = vi.fn();
    render(
      <EmptyState
        title="No leads yet"
        description="Leads appear here when a visitor shares their details with your team."
        action={<button onClick={onAdd}>Add a lead</button>}
        secondaryAction={<a href="/help">How leads work</a>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "No leads yet" })).toBeInTheDocument();
    const action = screen.getByRole("button", { name: "Add a lead" });
    action.focus();
    expect(action).toHaveFocus();
    fireEvent.click(action);
    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "How leads work" })).toBeInTheDocument();
  });

  it.each(["error", "denied"] as const)("announces the %s tone politely", (tone) => {
    render(<EmptyState tone={tone} title="Could not load leads" />);
    const status = screen.getByRole("status", { name: "Could not load leads" });
    expect(status).toHaveAttribute("data-tone", tone);
  });

  it.each(["empty", "no-results"] as const)("does not announce the %s tone", (tone) => {
    render(<EmptyState tone={tone} title="Nothing here" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses a decorative default icon, supports custom or no icon, and inline size", () => {
    const { container, rerender } = render(<EmptyState title="Empty" size="inline" headingLevel={3} />);
    expect(container.querySelector(".brand-empty-state__icon")).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveAttribute("data-size", "inline");
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    rerender(<EmptyState title="Empty" icon={null} />);
    expect(container.querySelector(".brand-empty-state__icon")).toBeNull();
    rerender(<EmptyState title="Empty" icon={<span data-testid="custom" />} />);
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });
});
