import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormDescription, FormError, FormField, FormLabel, useFormFieldProps } from "./form-field";
import { Input } from "./input";
import { Textarea } from "./textarea";

function Probe() {
  const props = useFormFieldProps();
  return <span data-testid="probe" data-props={JSON.stringify(props)} />;
}

describe("FormField", () => {
  it("wires label, description and error ids into the control", () => {
    render(
      <FormField label="Email" required description="We never share it." error="Enter a valid email.">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText(/^Email/);
    const description = screen.getByText("We never share it.");
    const error = screen.getByText("Enter a valid email.");
    expect(input.id).toMatch(/^brand-field-/);
    expect(screen.getByText("Email")).toHaveAttribute("for", input.id);
    expect(input).toHaveAttribute("aria-describedby", `${description.id} ${error.id}`);
    expect(description.id).toBe(`${input.id}-description`);
    expect(error.id).toBe(`${input.id}-error`);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("data-invalid");
    expect(error).toHaveAttribute("data-error", "true");
  });

  it("respects an explicit id prop for the control and derived ids", () => {
    render(
      <FormField label="Email" id="contact-email" description="Used for sign in">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText(/^Email/);
    expect(input).toHaveAttribute("id", "contact-email");
    expect(screen.getByText("Used for sign in")).toHaveAttribute("id", "contact-email-description");
  });

  it("describedby omits parts that are not rendered", () => {
    const { rerender } = render(
      <FormField label="Email" description="Only a description">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-describedby", `${input.id}-description`);
    expect(input).not.toHaveAttribute("aria-invalid");
    rerender(
      <FormField label="Email" error="Only an error">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", `${input.id}-error`);
    rerender(
      <FormField label="Email">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-required");
  });

  it("propagates disabled through context", () => {
    render(
      <FormField label="Email" disabled>
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });

  it("treats falsy error values as absent", () => {
    const { rerender } = render(
      <FormField label="Email" error={false}>
        <Input />
      </FormField>,
    );
    let input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("data-invalid");
    expect(document.querySelector(".brand-field__error")).toBeNull();
    rerender(
      <FormField label="Email" error="">
        <Input />
      </FormField>,
    );
    input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(document.querySelector(".brand-field__error")).toBeNull();
    rerender(
      <FormField label="Email" error="Real error">
        <Input />
      </FormField>,
    );
    input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Real error")).toHaveAttribute("data-error", "true");
  });

  it("treats falsy description values as absent", () => {
    const { rerender } = render(
      <FormField label="Email" description={false}>
        <Input />
      </FormField>,
    );
    let input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(document.querySelector(".brand-field__description")).toBeNull();
    rerender(
      <FormField label="Email" description="Real hint">
        <Input />
      </FormField>,
    );
    input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-describedby", `${input.id}-description`);
    expect(screen.getByText("Real hint")).toBeInTheDocument();
  });

  it("associates the label with the control so clicking the label activates it", () => {
    const onClick = vi.fn();
    render(
      <FormField label="Email">
        <Input onClick={onClick} />
      </FormField>,
    );
    const label = screen.getByText("Email");
    const input = screen.getByLabelText("Email");
    expect(label).toHaveAttribute("for", input.id);
    expect((screen.getByText("Email") as HTMLLabelElement).control).toBe(input);
    fireEvent.click(label);
    expect(onClick).toHaveBeenCalledTimes(1);
    input.focus();
    expect(input).toHaveFocus();
  });
});

describe("Input", () => {
  it("renders clean without a field context", () => {
    render(<Input placeholder="Standalone" />);
    const input = screen.getByPlaceholderText("Standalone");
    expect(input.tagName).toBe("INPUT");
    expect(input).not.toHaveAttribute("id");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-required");
    expect(input).not.toHaveAttribute("data-invalid");
  });

  it("owns association ids from the field and merges consumer describedby", () => {
    render(
      <FormField label="Email" required>
        <Input aria-describedby="extra-hint" />
        <Probe />
      </FormField>,
    );
    const input = screen.getByLabelText(/^Email/);
    expect(input.id).toMatch(/^brand-field-/);
    expect(input).toHaveAttribute("aria-describedby", "extra-hint");
    const probe = JSON.parse(screen.getByTestId("probe").dataset.props ?? "{}");
    expect(probe.id).toBe(input.id);
    expect(probe["aria-invalid"]).toBeUndefined();
    expect(probe.required).toBe(true);
  });
});

describe("Textarea", () => {
  it("mirrors the Input contract inside a field", () => {
    render(
      <FormField label="Bio" required error="Bio is required.">
        <Textarea />
      </FormField>,
    );
    const textarea = screen.getByLabelText(/^Bio/);
    expect(textarea.tagName).toBe("TEXTAREA");
    const error = screen.getByText("Bio is required.");
    expect(textarea.id).toMatch(/^brand-field-/);
    expect(screen.getByText("Bio")).toHaveAttribute("for", textarea.id);
    expect(textarea).toHaveAttribute("aria-describedby", error.id);
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-required", "true");
    expect(textarea).toHaveAttribute("data-invalid");
    expect(textarea.className).toContain("brand-textarea");
  });

  it("renders clean without a field context", () => {
    render(<Textarea placeholder="Standalone" />);
    const textarea = screen.getByPlaceholderText("Standalone");
    expect(textarea).not.toHaveAttribute("aria-describedby");
    expect(textarea).not.toHaveAttribute("aria-invalid");
    expect(textarea).not.toHaveAttribute("data-invalid");
  });
});

describe("standalone parts", () => {
  it("FormDescription and FormError get stable prefixed ids", () => {
    render(
      <>
        <FormDescription>Hint text</FormDescription>
        <FormError>Error text</FormError>
      </>,
    );
    expect(screen.getByText("Hint text").id).toMatch(/^brand-form-description-/);
    expect(screen.getByText("Error text").id).toMatch(/^brand-form-error-/);
    expect(screen.getByText("Error text")).toHaveAttribute("data-error", "true");
  });

  it("FormLabel renders a plain label", () => {
    render(<FormLabel htmlFor="solo">Standalone label</FormLabel>);
    expect(screen.getByText("Standalone label").tagName).toBe("LABEL");
  });

  it("FormDescription and FormError render p elements without roles", () => {
    render(
      <>
        <FormDescription>Hint text</FormDescription>
        <FormError>Error text</FormError>
      </>,
    );
    expect(screen.getByText("Hint text").tagName).toBe("P");
    expect(screen.getByText("Error text").tagName).toBe("P");
    expect(screen.getByText("Error text")).not.toHaveAttribute("role");
  });
});
