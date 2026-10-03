import { render, screen } from "@testing-library/react";
import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Meter } from "./meter";

describe("Meter", () => {
  it("server-renders its labelled meter contract without hydration", () => {
    const html = renderToStaticMarkup(
      <Meter label="Seats" value={2} max={8} ariaValueText="2 of 8 seats used" />,
    );

    expect(html).toContain('role="meter"');
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain("Seats");
    expect(html).toContain("25%");
  });

  it("exposes its name, role, values, tone, and custom visible value", () => {
    render(
      <Meter label="Storage" value={3} min={0} max={5} ariaValueText="3 of 5 GB used" formattedValue="3 GB" tone="warning" />,
    );
    const meter = screen.getByRole("meter", { name: "Storage" });
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "5");
    expect(meter).toHaveAttribute("aria-valuenow", "3");
    expect(meter).toHaveAttribute("aria-valuetext", "3 of 5 GB used");
    expect(meter).toHaveAttribute("data-tone", "warning");
    expect(screen.getByText("3 GB")).toBeInTheDocument();
    expect(meter.querySelector(".brand-meter__indicator")).toHaveStyle({ width: "60%" });
  });

  it("uses deterministic defaults for range, tone, visible value, and indicator width", () => {
    render(<Meter label="Usage" value={12.345} ariaValueText="12.345 percent used" />);

    const meter = screen.getByRole("meter", { name: "Usage" });
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("data-tone", "neutral");
    expect(screen.getByText("12.35%")).toBeInTheDocument();
    expect(meter.querySelector(".brand-meter__indicator")).toHaveStyle({ width: "12.345%" });
  });

  it("supports a rich visible label only with an explicit accessible name", () => {
    render(
      <Meter
        label={<span><strong>Disk</strong> usage</span>}
        ariaLabel="Disk usage"
        value={40}
        ariaValueText="40 percent used"
      />,
    );

    expect(screen.getByRole("meter", { name: "Disk usage" })).toBeInTheDocument();
  });

  it.each([null, undefined, false, "", "   ", Number.NaN, <span key="empty" />, <Fragment key="fragment" />])(
    "rejects a non-meaningful label without an accessible override: %o",
    (label) => {
      expect(() =>
        render(<Meter label={label} value={40} ariaValueText="40 percent used" />),
      ).toThrow(TypeError);
    },
  );

  it("rejects rich visible labels without an explicit aria label", () => {
    expect(() =>
      render(
        <Meter
          label={<span>Storage used</span>}
          value={40}
          ariaValueText="40 percent used"
        />,
      ),
    ).toThrow(/ariaLabel is required/);
  });

  it.each(["", "   "])("rejects empty human-readable value text: %o", (ariaValueText) => {
    expect(() =>
      render(<Meter label="Usage" value={40} ariaValueText={ariaValueText} />),
    ).toThrow(/ariaValueText/);
  });

  it("trims the explicit accessible name and human-readable value text", () => {
    render(
      <Meter
        label={<span>Storage used</span>}
        ariaLabel="  Storage used  "
        value={40}
        ariaValueText="  40 percent used  "
      />,
    );

    expect(screen.getByRole("meter", { name: "Storage used" })).toHaveAttribute(
      "aria-valuetext",
      "40 percent used",
    );
  });

  it("normalizes the largest finite cross-zero range without overflow", () => {
    const { rerender } = render(
      <Meter
        label="Extreme range"
        value={0}
        min={-Number.MAX_VALUE}
        max={Number.MAX_VALUE}
        ariaValueText="Half used"
      />,
    );

    let meter = screen.getByRole("meter", { name: "Extreme range" });
    expect(meter.querySelector(".brand-meter__indicator")).toHaveStyle({ width: "50%" });
    expect(screen.getByText("50%")).toBeInTheDocument();

    rerender(
      <Meter
        label="Extreme range"
        value={Number.MAX_VALUE}
        min={-Number.MAX_VALUE}
        max={Number.MAX_VALUE}
        ariaValueText="Fully used"
      />,
    );
    meter = screen.getByRole("meter", { name: "Extreme range" });
    expect(meter.querySelector(".brand-meter__indicator")).toHaveStyle({ width: "100%" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it.each([
    { value: Number.NaN, min: 0, max: 10 },
    { value: 4, min: Number.NEGATIVE_INFINITY, max: 10 },
    { value: 4, min: 0, max: Number.POSITIVE_INFINITY },
    { value: 4, min: 5, max: 5 },
    { value: 4, min: 6, max: 5 },
    { value: -1, min: 0, max: 10 },
    { value: 11, min: 0, max: 10 },
  ])("rejects invalid input instead of misrepresenting it: %o", (range) => {
    expect(() => render(<Meter label="Usage" ariaValueText="Invalid" {...range} />)).toThrow(RangeError);
  });
});
