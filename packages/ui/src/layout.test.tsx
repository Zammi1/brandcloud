import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Container, Heading, Stack, VisuallyHidden } from "./layout";

describe("layout primitives", () => {
  it("renders container and stack hooks with defaults", () => {
    const { container } = render(
      <Container data-testid="container">
        <Stack data-testid="stack" gap="lg" align="center">Content</Stack>
      </Container>,
    );
    expect(screen.getByTestId("container")).toHaveClass("brand-container");
    const stack = screen.getByTestId("stack");
    expect(stack).toHaveClass("brand-stack");
    expect(stack).toHaveAttribute("data-gap", "lg");
    expect(stack).toHaveAttribute("data-align", "center");
    expect(container.querySelector(".brand-stack")).toBe(stack);
  });

  it("renders a heading at the requested level and size", () => {
    render(<Heading as="h3" size="sm">Plan and usage</Heading>);
    const heading = screen.getByRole("heading", { level: 3, name: "Plan and usage" });
    expect(heading).toHaveClass("brand-heading");
    expect(heading).toHaveAttribute("data-size", "sm");
  });

  it("defaults headings to h2 and keeps visually hidden text accessible", () => {
    render(
      <>
        <Heading>Leads</Heading>
        <button type="button">
          <VisuallyHidden>Close panel</VisuallyHidden>
        </button>
      </>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Leads" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close panel" })).toBeInTheDocument();
  });
});
