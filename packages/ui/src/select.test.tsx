import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "./form-field";
import { Select } from "./select";

const plans = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
];

describe("Select", () => {
  it("renders options from props", () => {
    render(<Select aria-label="Plan" options={[...plans, "Scale"]} />);
    const select = screen.getByRole("combobox", { name: "Plan" });
    expect(select).toHaveClass("brand-select");
    expect(select).toHaveValue("starter");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Starter");
    expect(options[1]).toHaveTextContent("Growth");
    expect(options[2]).toHaveTextContent("Scale");
    expect(options[2]).toHaveAttribute("value", "Scale");
  });

  it("renders option and optgroup children", () => {
    render(
      <Select aria-label="Region">
        <optgroup label="Europe">
          <option value="de">Germany</option>
        </optgroup>
        <option value="us">United States</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Region" });
    expect(select).toHaveValue("de");
    expect(screen.getByRole("option", { name: "Germany" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "United States" })).toBeInTheDocument();
  });

  it("fires onValueChange with a string value", () => {
    const onValueChange = vi.fn();
    render(
      <Select
        aria-label="Plan"
        options={plans}
        defaultValue="starter"
        onValueChange={onValueChange}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Plan" }), {
      target: { value: "growth" },
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("growth");
    const emitted = onValueChange.mock.calls[0]?.[0];
    expect(typeof emitted).toBe("string");
  });

  it("supports a controlled value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Select aria-label="Plan" options={plans} value="starter" onValueChange={onValueChange} />,
    );
    const select = screen.getByRole("combobox", { name: "Plan" });
    expect(select).toHaveValue("starter");
    rerender(
      <Select aria-label="Plan" options={plans} value="growth" onValueChange={onValueChange} />,
    );
    expect(select).toHaveValue("growth");
    fireEvent.change(select, { target: { value: "starter" } });
    expect(onValueChange).toHaveBeenCalledWith("starter");
    expect(select).toHaveValue("growth");
  });

  it("keeps numeric values as strings in the DOM", () => {
    render(
      <Select
        aria-label="Quantity"
        options={[
          { value: "10", label: "Ten" },
          { value: "20", label: "Twenty" },
        ]}
        value={20}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Quantity" })).toHaveValue("20");
  });

  it("renders a disabled hidden placeholder while empty and drops it after selection", () => {
    const onValueChange = vi.fn();
    render(
      <Select
        aria-label="Plan"
        options={plans}
        placeholder="Choose a plan"
        onValueChange={onValueChange}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Plan" });
    expect(select).toHaveValue("");
    expect(select).toHaveAttribute("data-empty", "true");
    const placeholder = select.querySelector('option[value=""]');
    expect(placeholder).not.toBeNull();
    expect(placeholder).toBeDisabled();
    expect(placeholder).toHaveAttribute("hidden");
    expect(placeholder).toHaveTextContent("Choose a plan");
    expect(placeholder).toHaveProperty("selected", true);
    fireEvent.change(select, { target: { value: "growth" } });
    expect(onValueChange).toHaveBeenCalledWith("growth");
    expect(select.querySelector('option[value=""]')).toBeNull();
    expect(select).toHaveValue("growth");
    expect(select).not.toHaveAttribute("data-empty");
  });

  it("marks the select as invalid", () => {
    render(<Select aria-label="Plan" options={plans} invalid />);
    const select = screen.getByRole("combobox", { name: "Plan" });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("data-invalid", "true");
  });

  it("forwards disabled and required state", () => {
    render(<Select aria-label="Plan" options={plans} disabled required />);
    const select = screen.getByRole("combobox", { name: "Plan" });
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute("required");
    expect(select).toHaveAttribute("data-disabled", "true");
    expect(select).toHaveAttribute("data-required", "true");
  });

  it("associates a rendered label with the select", () => {
    render(<Select label="Plan" options={plans} />);
    const select = screen.getByLabelText("Plan");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Plan")).toHaveAttribute("for", select.id);
  });

  it("passes aria-describedby through natively", () => {
    render(
      <div>
        <span id="plan-hint">Billed monthly</span>
        <Select aria-label="Plan" options={plans} aria-describedby="plan-hint" />
      </div>,
    );
    expect(screen.getByRole("combobox", { name: "Plan" })).toHaveAttribute(
      "aria-describedby",
      "plan-hint",
    );
  });

  it("participates in FormField context like Input", () => {
    render(
      <FormField label="Plan" required description="Pick one." error="Choose a plan.">
        <Select options={plans} />
      </FormField>,
    );
    const select = screen.getByLabelText(/^Plan/) as HTMLSelectElement;
    const description = screen.getByText("Pick one.");
    const error = screen.getByText("Choose a plan.");
    expect(select.id).toMatch(/^brand-field-/);
    expect(screen.getByText("Plan")).toHaveAttribute("for", select.id);
    expect(select).toHaveAttribute("aria-describedby", `${description.id} ${error.id}`);
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-required", "true");
    expect(select).toHaveAttribute("required");
    expect(select).toHaveAttribute("data-invalid", "true");
  });
});
