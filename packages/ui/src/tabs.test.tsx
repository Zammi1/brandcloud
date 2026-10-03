import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs";

async function pressKey(element: Element, key: string) {
  fireEvent.keyDown(element, { key });
  await act(async () => {});
}

function renderExample(overrides?: { activation?: "automatic" | "manual" }) {
  return render(
    <Tabs defaultValue="alpha" {...overrides}>
      <TabsList aria-label="Sections">
        <TabsTab value="alpha">Alpha</TabsTab>
        <TabsTab value="beta">Beta</TabsTab>
        <TabsTab value="gamma" disabled>
          Gamma
        </TabsTab>
      </TabsList>
      <TabsPanel value="alpha">Alpha content</TabsPanel>
      <TabsPanel value="beta">Beta content</TabsPanel>
      <TabsPanel value="gamma">Gamma content</TabsPanel>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("renders tablist, tabs and the active panel with brand classes", () => {
    renderExample();

    const tablist = screen.getByRole("tablist", { name: "Sections" });
    expect(tablist).toHaveClass("brand-tabs__list");
    expect(tablist.closest(".brand-tabs")).not.toBeNull();

    const alpha = screen.getByRole("tab", { name: "Alpha" });
    expect(alpha).toHaveClass("brand-tabs__tab");
    expect(alpha).toHaveAttribute("aria-selected", "true");
    expect(alpha).toHaveAttribute("data-active", "");

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveClass("brand-tabs__panel");
    expect(panel).toHaveTextContent("Alpha content");
  });

  it("wires aria-controls and aria-labelledby between tabs and panels", () => {
    renderExample();

    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const beta = screen.getByRole("tab", { name: "Beta" });
    const panel = screen.getByRole("tabpanel");

    expect(alpha).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", alpha.id);

    fireEvent.click(beta);
    const betaPanel = screen.getByRole("tabpanel");
    expect(beta).toHaveAttribute("aria-controls", betaPanel.id);
    expect(betaPanel).toHaveAttribute("aria-labelledby", beta.id);
  });

  it("moves selection with arrow keys when activation is automatic", async () => {
    renderExample();

    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const beta = screen.getByRole("tab", { name: "Beta" });

    await pressKey(alpha, "ArrowRight");

    expect(beta).toHaveAttribute("aria-selected", "true");
    expect(beta).toHaveFocus();
    expect(alpha).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Beta content");
  });

  it("skips disabled tabs during arrow-key navigation", async () => {
    renderExample();

    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const beta = screen.getByRole("tab", { name: "Beta" });
    const gamma = screen.getByRole("tab", { name: "Gamma" });

    await pressKey(alpha, "ArrowRight");
    await pressKey(beta, "ArrowRight");

    expect(gamma).toHaveAttribute("data-disabled", "");
    expect(gamma).not.toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Beta content");
  });

  it("does not activate a disabled tab by click", () => {
    const onValueChange = vi.fn();
    render(
      <Tabs defaultValue="alpha" onValueChange={onValueChange}>
        <TabsList aria-label="Sections">
          <TabsTab value="alpha">Alpha</TabsTab>
          <TabsTab value="beta" disabled>
            Beta
          </TabsTab>
        </TabsList>
        <TabsPanel value="alpha">Alpha content</TabsPanel>
        <TabsPanel value="beta">Beta content</TabsPanel>
      </Tabs>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));

    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Alpha content");
    expect(onValueChange).not.toHaveBeenCalledWith("beta");
  });

  it("defers selection until explicit activation in manual mode", async () => {
    renderExample({ activation: "manual" });

    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const beta = screen.getByRole("tab", { name: "Beta" });

    await pressKey(alpha, "ArrowRight");

    expect(beta).toHaveFocus();
    expect(beta).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Alpha content");

    fireEvent.click(beta);
    expect(beta).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Beta content");
  });

  it("renders the panel matching a controlled value and ignores clicks while controlled", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Tabs value="alpha" onValueChange={onValueChange}>
        <TabsList aria-label="Sections">
          <TabsTab value="alpha">Alpha</TabsTab>
          <TabsTab value="beta">Beta</TabsTab>
        </TabsList>
        <TabsPanel value="alpha">Alpha content</TabsPanel>
        <TabsPanel value="beta">Beta content</TabsPanel>
      </Tabs>,
    );

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Alpha content");
    expect(screen.queryByText("Beta content")).not.toBeInTheDocument();

    rerender(
      <Tabs value="beta" onValueChange={onValueChange}>
        <TabsList aria-label="Sections">
          <TabsTab value="alpha">Alpha</TabsTab>
          <TabsTab value="beta">Beta</TabsTab>
        </TabsList>
        <TabsPanel value="alpha">Alpha content</TabsPanel>
        <TabsPanel value="beta">Beta content</TabsPanel>
      </Tabs>,
    );

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Beta content");
    expect(screen.queryByText("Alpha content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Alpha" }));
    expect(onValueChange).toHaveBeenCalledWith("alpha");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Beta content");
  });

  it("reports user activation through onValueChange when uncontrolled", () => {
    const onValueChange = vi.fn();
    render(
      <Tabs defaultValue="alpha" onValueChange={onValueChange}>
        <TabsList aria-label="Sections">
          <TabsTab value="alpha">Alpha</TabsTab>
          <TabsTab value="beta">Beta</TabsTab>
        </TabsList>
        <TabsPanel value="alpha">Alpha content</TabsPanel>
        <TabsPanel value="beta">Beta content</TabsPanel>
      </Tabs>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));

    expect(onValueChange).toHaveBeenCalledWith("beta");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Beta content");
  });
});
