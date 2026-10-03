import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface TooltipHarnessProps {
  delay?: number | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

function TooltipHarness({ delay, onOpenChange }: TooltipHarnessProps) {
  return (
    <Tooltip delay={delay} onOpenChange={onOpenChange}>
      <TooltipTrigger>Save</TooltipTrigger>
      <TooltipContent side="top" align="center">
        Saved to your library
      </TooltipContent>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("does not render tooltip content while hidden", () => {
    render(<TooltipHarness />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("shows the tooltip content on trigger focus after the delay and associates it", async () => {
    vi.useFakeTimers();
    try {
      render(<TooltipHarness delay={120} />);
      const trigger = screen.getByRole("button", { name: "Save" });
      await act(async () => {
        trigger.focus();
        await vi.advanceTimersByTimeAsync(120);
      });
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent("Saved to your library");
      expect(tooltip.id).not.toBe("");
      expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the tooltip on hover only once the delay has elapsed", () => {
    vi.useFakeTimers();
    try {
      render(<TooltipHarness delay={300} />);
      const trigger = screen.getByRole("button", { name: "Save" });
      fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
      fireEvent.mouseEnter(trigger, { pointerType: "mouse" });
      fireEvent.mouseMove(trigger, { pointerType: "mouse", movementX: 5, movementY: 0 });
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides the tooltip on Escape and reports the state change", async () => {
    const onOpenChange = vi.fn();
    render(<TooltipHarness delay={0} onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Save" });
    trigger.focus();
    const tooltip = await screen.findByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
    expect(trigger).not.toHaveAttribute("aria-describedby");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("removes the tooltip content when unmounted while open", async () => {
    const { unmount } = render(<TooltipHarness delay={0} />);
    screen.getByRole("button", { name: "Save" }).focus();
    await screen.findByRole("tooltip");
    unmount();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("passes side and align through to the positioned content", async () => {
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Save</TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          Saved to your library
        </TooltipContent>
      </Tooltip>,
    );
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveAttribute("data-side", "bottom");
    expect(tooltip).toHaveAttribute("data-align", "start");
  });
});
