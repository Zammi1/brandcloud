import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress, Skeleton, Spinner } from "./loading";

describe("Spinner", () => {
  it("exposes a status role with a visually hidden label", () => {
    render(<Spinner label="Loading results" />);
    const status = screen.getByRole("status");
    expect(status).toHaveClass("brand-spinner");
    const label = screen.getByText("Loading results");
    expect(label).toHaveClass("brand-spinner__label");
  });

  it("rejects empty labels and supports sizes", () => {
    expect(() => render(<Spinner label="  " />)).toThrow(TypeError);
    const { rerender } = render(<Spinner label="Working" size="lg" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-size", "lg");
    rerender(<Spinner label="Working" size="sm" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-size", "sm");
  });
});

describe("Progress", () => {
  it("throws when no accessible name is provided", () => {
    expect(() => render(<Progress value={10} />)).toThrow(TypeError);
  });

  it("accepts aria-label or aria-labelledby as accessible name", () => {
    const { rerender } = render(<Progress value={10} aria-label="Uploading" />);
    expect(screen.getByRole("progressbar", { name: "Uploading" })).toBeInTheDocument();
    rerender(
      <>
        <span id="progress-label">Upload progress</span>
        <Progress value={10} aria-labelledby="progress-label" />
      </>,
    );
    expect(screen.getByRole("progressbar")).toHaveAccessibleName("Upload progress");
  });

  it("computes determinate values and states", () => {
    const { rerender } = render(
      <Progress value={40} min={0} max={200} aria-label="Progress" />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "200");
    expect(bar).toHaveAttribute("data-state", "progressing");
    expect(bar.getAttribute("style")).toContain("--brand-progress-value: 20%");
    expect((bar as HTMLElement).style.width).toBe("");

    rerender(<Progress value={200} min={0} max={200} aria-label="Progress" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-state", "complete");

    rerender(
      <Progress value={3} aria-label="Progress" ariaValueText="3 of 5 steps" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAccessibleName("Progress");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "3 of 5 steps");
  });

  it("omits valuenow when indeterminate", () => {
    render(<Progress aria-label="Loading" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
  });

  it("rejects invalid ranges", () => {
    expect(() => render(<Progress value={5} max={0} aria-label="Progress" />)).toThrow(RangeError);
    expect(() => render(<Progress value={-1} aria-label="Progress" />)).toThrow(RangeError);
    expect(() => render(<Progress value={101} aria-label="Progress" />)).toThrow(RangeError);
  });
});

describe("Skeleton", () => {
  it("is aria-hidden by default and maps dimensions to CSS vars", () => {
    const { container } = render(
      <Skeleton width={240} height="2.5rem" borderRadius={8} className="hero-block" />,
    );
    const skeleton = container.querySelector(".brand-skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass("hero-block");
    expect(skeleton).toHaveAttribute(
      "style",
      "--brand-skeleton-width: 240px; --brand-skeleton-height: 2.5rem; --brand-skeleton-radius: 8px;",
    );
  });

  it("never writes raw width, height, or border-radius inline styles", () => {
    const { container } = render(<Skeleton width={240} height={96} borderRadius={8} />);
    const skeleton = container.querySelector(".brand-skeleton") as HTMLElement;
    expect(skeleton.style.width).toBe("");
    expect(skeleton.style.height).toBe("");
    expect(skeleton.style.borderRadius).toBe("");
    expect(skeleton.style.getPropertyValue("--brand-skeleton-width")).toBe("240px");
    expect(skeleton.style.getPropertyValue("--brand-skeleton-height")).toBe("96px");
    expect(skeleton.style.getPropertyValue("--brand-skeleton-radius")).toBe("8px");
  });

  it("keeps consumer style properties alongside the dimension custom properties", () => {
    const { container } = render(<Skeleton width={120} style={{ color: "red" }} />);
    const skeleton = container.querySelector(".brand-skeleton") as HTMLElement;
    expect(skeleton.style.color).toBe("red");
    expect(skeleton.style.getPropertyValue("--brand-skeleton-width")).toBe("120px");
  });

  it("opts into shimmer and can unhide itself", () => {
    const { container } = render(<Skeleton shimmer aria-hidden={false} width="12ch" />);
    const skeleton = container.querySelector(".brand-skeleton");
    expect(skeleton).toHaveAttribute("data-shimmer");
    expect(skeleton).toHaveAttribute("aria-hidden", "false");
    expect(skeleton).toHaveAttribute("style", "--brand-skeleton-width: 12ch;");
  });

  it("omits shimmer and dimension vars when not requested", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector(".brand-skeleton");
    expect(skeleton).not.toHaveAttribute("data-shimmer");
    expect(skeleton).not.toHaveAttribute("style");
  });
});
