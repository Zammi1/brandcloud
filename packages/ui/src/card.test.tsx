import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge as RootBadge, Card as RootCard } from "./index.js";
import { Badge, Card } from "./card.js";

describe("server-safe card leaf", () => {
  it("server-renders Card and Badge without changing their semantic elements", () => {
    const html = renderToStaticMarkup(
      <Card elevated aria-label="Plan container">
        <Badge>Recommended</Badge>
      </Card>,
    );

    expect(html).toContain('<div class="brand-card" data-elevated="true" aria-label="Plan container">');
    expect(html).toContain('<span class="brand-badge">Recommended</span>');
    expect(html).not.toContain("<article");
  });

  it("preserves compatible Card and Badge exports on the root barrel", () => {
    expect(RootCard).toBe(Card);
    expect(RootBadge).toBe(Badge);

    render(
      <RootCard>
        <RootBadge>Root recommendation</RootBadge>
      </RootCard>,
    );
    expect(screen.getByText("Root recommendation")).toHaveClass("brand-badge");
  });
});
