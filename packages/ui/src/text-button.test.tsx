import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TextButton } from "./text-button";

describe("TextButton", () => {
  it("is a non-submitting button with a keyboard focus target", () => {
    const onClick = vi.fn();
    render(<TextButton onClick={onClick}>Read the release notes</TextButton>);
    const button = screen.getByRole("button", { name: "Read the release notes" });
    expect(button).toHaveAttribute("type", "button");
    button.focus();
    fireEvent.click(button);
    expect(button).toHaveFocus();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses a semantic emphasis instead of raw visual values", () => {
    render(<TextButton emphasis="neutral">Show details</TextButton>);
    expect(screen.getByRole("button", { name: "Show details" })).toHaveAttribute("data-emphasis", "neutral");
  });

  it("preserves native disabled behavior", () => {
    const onClick = vi.fn();
    render(<TextButton disabled onClick={onClick}>Unavailable</TextButton>);
    const button = screen.getByRole("button", { name: "Unavailable" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
