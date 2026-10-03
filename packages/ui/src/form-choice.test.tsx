import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox, CheckboxGroup } from "./checkbox";
import { Radio, RadioGroup } from "./radio";
import { Switch } from "./switch";

describe("Checkbox", () => {
  it("toggles via label click", () => {
    render(<Checkbox label="Newsletter" />);
    const input = screen.getByLabelText("Newsletter") as HTMLInputElement;
    expect(input).not.toBeChecked();
    fireEvent.click(screen.getByText("Newsletter"));
    expect(input).toBeChecked();
    fireEvent.click(screen.getByText("Newsletter"));
    expect(input).not.toBeChecked();
  });

  it("uses children as the label text", () => {
    render(<Checkbox value="terms">Accept terms</Checkbox>);
    expect(screen.getByLabelText("Accept terms")).toBeInTheDocument();
  });

  it("stays controlled while reporting onCheckedChange", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Sync" checked onCheckedChange={onCheckedChange} />);
    const input = screen.getByLabelText("Sync") as HTMLInputElement;
    expect(input).toBeChecked();
    fireEvent.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(input).toBeChecked();
  });

  it("exposes indeterminate state through aria and data attributes", () => {
    render(<Checkbox label="Select all" indeterminate />);
    const input = screen.getByLabelText("Select all") as HTMLInputElement;
    expect(input).toHaveAttribute("aria-checked", "mixed");
    expect(input.indeterminate).toBe(true);
    expect(input.closest("label")).toHaveAttribute("data-indeterminate");
  });
});

describe("CheckboxGroup", () => {
  const options = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
  ];

  it("renders a named fieldset and manages an array value", () => {
    const onValueChange = vi.fn();
    render(<CheckboxGroup legend="Interests" options={options} onValueChange={onValueChange} />);
    expect(screen.getByRole("group", { name: "Interests" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alpha"));
    expect(onValueChange).toHaveBeenLastCalledWith(["alpha"]);
    expect(screen.getByLabelText("Alpha")).toBeChecked();
    fireEvent.click(screen.getByText("Beta"));
    expect(onValueChange).toHaveBeenLastCalledWith(["alpha", "beta"]);
    fireEvent.click(screen.getByText("Alpha"));
    expect(onValueChange).toHaveBeenLastCalledWith(["beta"]);
    expect(screen.getByLabelText("Alpha")).not.toBeChecked();
  });

  it("respects controlled value", () => {
    render(<CheckboxGroup legend="Interests" options={options} value={["beta"]} />);
    expect(screen.getByLabelText("Alpha")).not.toBeChecked();
    expect(screen.getByLabelText("Beta")).toBeChecked();
  });

  it("respects defaultValue and an explicit group name", () => {
    render(
      <CheckboxGroup legend="Interests" options={options} defaultValue={["alpha"]} name="interests" />,
    );
    expect(screen.getByLabelText("Alpha")).toBeChecked();
    expect(screen.getByLabelText("Alpha")).toHaveAttribute("name", "interests");
    expect(screen.getByLabelText("Beta")).toHaveAttribute("name", "interests");
  });

  it("disables items from disabledValues and honours group disabled", () => {
    render(<CheckboxGroup legend="Interests" options={options} disabledValues={["beta"]} />);
    expect(screen.getByLabelText("Alpha")).toBeEnabled();
    expect(screen.getByLabelText("Beta")).toBeDisabled();
  });

  it("ignores clicks while readOnly", () => {
    render(<CheckboxGroup legend="Interests" options={options} defaultValue={["alpha"]} readOnly />);
    fireEvent.click(screen.getByLabelText("Beta"));
    expect(screen.getByLabelText("Beta")).not.toBeChecked();
  });

  it("treats required as a group constraint, not a per-item attribute", () => {
    render(<CheckboxGroup legend="Interests" options={options} required />);
    const group = screen.getByRole("group", { name: "Interests" });
    expect(group).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Alpha")).not.toHaveAttribute("required");
    expect(screen.getByLabelText("Beta")).not.toHaveAttribute("required");
    expect(screen.getByLabelText("Alpha")).not.toHaveAttribute("aria-required");
    expect(screen.getByLabelText("Beta")).not.toHaveAttribute("aria-required");
  });

  it("still marks standalone checkboxes required", () => {
    render(<Checkbox label="Terms" required />);
    expect(screen.getByLabelText("Terms")).toHaveAttribute("required");
    expect(screen.getByLabelText("Terms")).toHaveAttribute("aria-required", "true");
  });
});

describe("RadioGroup", () => {
  const options = [
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "team", label: "Team" },
  ];

  it("renders a radiogroup with native exclusivity on label clicks", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup legend="Plan" name="plan" options={options} defaultValue="free" onValueChange={onValueChange} />,
    );
    const group = screen.getByRole("radiogroup", { name: "Plan" });
    expect(group).toBeInTheDocument();
    const radios = options.map(({ label }) => screen.getByLabelText(label) as HTMLInputElement);
    for (const radio of radios) expect(radio).toHaveAttribute("name", "plan");
    expect(radios[0]).toBeChecked();
    fireEvent.click(screen.getByText("Pro"));
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith("pro");
  });

  it("moves selection and focus with arrow keys, wrapping at the ends", () => {
    render(<RadioGroup legend="Plan" options={options} defaultValue="free" />);
    const [first, second, third] = options.map(
      ({ label }) => screen.getByLabelText(label) as HTMLInputElement,
    ) as [HTMLInputElement, HTMLInputElement, HTMLInputElement];
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(second).toBeChecked();
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: "ArrowDown" });
    expect(third).toBeChecked();
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, { key: "ArrowUp" });
    expect(second).toBeChecked();
    fireEvent.keyDown(second, { key: "ArrowUp" });
    expect(first).toBeChecked();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "ArrowUp" });
    expect(third).toBeChecked();
  });

  it("moves focus without changing selection while readOnly", () => {
    render(<RadioGroup legend="Plan" options={options} defaultValue="free" readOnly />);
    const [first, second] = options.map(
      ({ label }) => screen.getByLabelText(label) as HTMLInputElement,
    ) as [HTMLInputElement, HTMLInputElement];
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(first).toBeChecked();
    expect(second).not.toBeChecked();
    expect(document.activeElement).toBe(second);
  });

  it("skips disabled options during arrow navigation", () => {
    render(
      <RadioGroup
        legend="Plan"
        options={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro", disabled: true },
          { value: "team", label: "Team" },
        ]}
        defaultValue="free"
      />,
    );
    const [first, , third] = options.map(
      ({ label }) => screen.getByLabelText(label) as HTMLInputElement,
    ) as [HTMLInputElement, HTMLInputElement, HTMLInputElement];
    expect(screen.getByLabelText("Pro")).toBeDisabled();
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(third).toBeChecked();
    expect(document.activeElement).toBe(third);
  });
});

describe("Switch", () => {
  it("has role=switch with aria-checked and data state toggling on click", () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Dark mode" onCheckedChange={onCheckedChange} />);
    const input = screen.getByRole("switch");
    const root = input.closest("label") as HTMLLabelElement;
    expect(input).toHaveAttribute("aria-checked", "false");
    expect(root).toHaveAttribute("data-unchecked");
    expect(root).not.toHaveAttribute("data-checked");
    fireEvent.click(input);
    expect(input).toHaveAttribute("aria-checked", "true");
    expect(root).toHaveAttribute("data-checked");
    expect(root).not.toHaveAttribute("data-unchecked");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("toggles on Enter and Space", () => {
    render(<Switch label="Dark mode" />);
    const input = screen.getByRole("switch") as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(input, { key: " " });
    expect(input).toHaveAttribute("aria-checked", "false");
  });

  it("stays controlled while reporting onCheckedChange", () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Dark mode" checked={false} onCheckedChange={onCheckedChange} />);
    const input = screen.getByRole("switch");
    fireEvent.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(input).toHaveAttribute("aria-checked", "false");
  });

  it("ignores clicks and key activation while readOnly", () => {
    render(<Switch label="Locked" readOnly />);
    const input = screen.getByRole("switch");
    fireEvent.click(input);
    expect(input).toHaveAttribute("aria-checked", "false");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveAttribute("aria-checked", "false");
  });

  it("requires a visible label or aria-label", () => {
    expect(() => render(<Switch />)).toThrow(TypeError);
    render(<Switch aria-label="Dark mode" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});
