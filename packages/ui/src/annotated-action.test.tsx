import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HandwrittenAction, StatusPillAction } from "./annotated-action";

describe("StatusPillAction", () => {
  it("keeps navigation consumer-owned and decoration out of the accessible name", () => {
    render(
      <StatusPillAction status="Limited availability" active>
        <a href="/enquiry" aria-label="Request details — limited availability">Request details</a>
      </StatusPillAction>,
    );

    expect(screen.getByRole("link", { name: "Request details — limited availability" })).toHaveAttribute("href", "/enquiry");
    expect(screen.getByText("Limited availability")).toHaveAttribute("aria-hidden", "true");
  });

  it("can expose meaningful status text", () => {
    render(<StatusPillAction status="Applications close Friday" statusAriaHidden={false}><button>Apply</button></StatusPillAction>);
    expect(screen.getByText("Applications close Friday")).not.toHaveAttribute("aria-hidden");
  });
});

describe("HandwrittenAction", () => {
  it("accepts a consumer link and semantic note treatment", () => {
    render(
      <HandwrittenAction note="Start your journey today" noteStyle="plain" emphasis="neutral">
        <a href="/memberships">View memberships</a>
      </HandwrittenAction>,
    );

    expect(screen.getByRole("link", { name: "View memberships" })).toHaveAttribute("href", "/memberships");
    expect(screen.getByText("Start your journey today")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Start your journey today").parentElement).toHaveAttribute("data-note-style", "plain");
    expect(screen.getByText("Start your journey today").parentElement).toHaveAttribute("data-emphasis", "neutral");
  });
});
