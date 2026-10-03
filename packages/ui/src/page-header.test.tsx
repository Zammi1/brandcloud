import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title as the page heading and names the header by it", () => {
    render(<PageHeader title="People" meta="744 records" description="Everyone your team has met." />);
    const heading = screen.getByRole("heading", { level: 1, name: "People" });
    expect(screen.getByRole("banner", { name: "People" })).toContainElement(heading);
    expect(screen.getByText("744 records")).toHaveClass("brand-page-header__meta");
    expect(screen.getByText("Everyone your team has met.")).toHaveClass("brand-page-header__description");
  });

  it("orders actions secondary, overflow, then primary last, inside a named group", () => {
    render(
      <PageHeader
        title="Companies"
        primaryAction={<button>Create company</button>}
        secondaryActions={<button>Import</button>}
        overflow={<button>More actions</button>}
      />,
    );
    const group = screen.getByRole("group", { name: "Page actions" });
    const names = Array.from(group.querySelectorAll("button")).map((button) => button.textContent);
    expect(names).toEqual(["Import", "More actions", "Create company"]);
  });

  it("keeps actions reachable in tab order after the heading context", () => {
    render(
      <PageHeader
        context={<a href="/settings">Settings</a>}
        title="Members"
        primaryAction={<button>Invite member</button>}
        tabs={<div role="tablist" aria-label="Member views"><button role="tab">Current</button></div>}
      />,
    );
    const focusables = Array.from(document.querySelectorAll<HTMLElement>("a, button"));
    expect(focusables.map((element) => element.textContent)).toEqual(["Settings", "Invite member", "Current"]);
    expect(screen.getByRole("tablist", { name: "Member views" })).toBeInTheDocument();
  });

  it("supports a level 2 heading and omits empty regions", () => {
    const { container } = render(<PageHeader title="Profile" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Profile" })).toBeInTheDocument();
    expect(container.querySelector(".brand-page-header__actions")).toBeNull();
    expect(container.querySelector(".brand-page-header__context")).toBeNull();
    expect(container.querySelector(".brand-page-header__tabs")).toBeNull();
  });
});
