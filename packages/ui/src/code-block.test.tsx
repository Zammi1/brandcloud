import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "./code-block";

const snippet = '<script src="https://cdn.example.co.uk/chat.js" defer></script>';

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
}

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  vi.useRealTimers();
});

describe("CodeBlock", () => {
  it("renders the code in a focusable, named scroll region", () => {
    render(<CodeBlock title="Embed code" language="HTML" code={snippet} />);
    const pre = document.querySelector("pre")!;
    expect(pre).toHaveAttribute("tabindex", "0");
    expect(pre).toHaveAccessibleName("Embed code");
    expect(pre).toHaveTextContent(snippet);
    expect(screen.getByText("HTML")).toBeInTheDocument();
  });

  it("copies the exact code from the keyboard and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onCopy = vi.fn();
    mockClipboard(writeText);
    render(<CodeBlock title="Embed code" code={snippet} onCopy={onCopy} />);
    const button = screen.getByRole("button", { name: "Copy Embed code" });
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copied"));
    expect(writeText).toHaveBeenCalledWith(snippet);
    expect(onCopy).toHaveBeenCalledWith("copied");
    expect(screen.getByRole("button", { name: "Copied: Embed code" })).toBeInTheDocument();
  });

  it("returns to the copy label after the reset delay", async () => {
    vi.useFakeTimers();
    mockClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CodeBlock code="npm test" resetAfterMs={500} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy Code" }));
    });
    expect(screen.getByRole("button", { name: "Copied: Code" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("button", { name: "Copy Code" })).toBeInTheDocument();
  });

  it("shows a visible failure and selects the code when the clipboard is unavailable", async () => {
    const onCopy = vi.fn();
    render(<CodeBlock language="HTML" code={snippet} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy HTML code" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Copy failed. Select the code and copy it manually."),
    );
    expect(onCopy).toHaveBeenCalledWith("failed");
    expect(window.getSelection()?.toString()).toBe(snippet);
  });

  it("treats a rejected clipboard write as a failure and supports wrapping", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    const { container } = render(<CodeBlock code="x" wrap />);
    expect(container.firstElementChild).toHaveAttribute("data-wrap", "true");
    fireEvent.click(screen.getByRole("button", { name: "Copy Code" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-result", "failed"));
  });
});
