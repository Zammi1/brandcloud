import { Fragment } from "react";
import { createPortal } from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { normalizeReactNode } from "./react-node";

describe("stable React-node normalization", () => {
  it("materializes arrays, fragments, intrinsic trees, and Sets without changing their render output", () => {
    const content = new Set([
      <span key="one">One</span>,
      <Fragment key="two"><svg /><img src="two.png" alt="Two" /></Fragment>,
    ]);
    const normalized = normalizeReactNode(content, { name: "test content", policy: "intrinsic" });
    expect(renderToStaticMarkup(<>{normalized}</>)).toBe(renderToStaticMarkup(<>{content}</>));
  });

  it("normalizes bigint leaves to renderer-independent visible text", () => {
    const normalized = normalizeReactNode(<span>{42n}</span>, {
      name: "test content",
      policy: "intrinsic",
    });
    expect(renderToStaticMarkup(<>{normalized}</>)).toBe("<span>42</span>");
  });

  it("preserves React's static-sibling validation when the authored tree is unchanged", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const content = <div><span>First</span><span>Second</span></div>;
    const normalized = normalizeReactNode(content, {
      name: "test content",
      policy: "intrinsic",
    });
    expect(normalized).toBe(content);
    renderToStaticMarkup(<>{normalized}</>);
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining("unique \"key\" prop"));
    error.mockRestore();
  });

  it("rejects one-shot generators before advancing them", () => {
    let advances = 0;
    function* content() {
      advances += 1;
      yield <span>Never rendered</span>;
    }
    expect(() => normalizeReactNode(content() as never, { name: "test content" })).toThrow(
      "test content must not contain a one-shot iterator or generator; use an array or Set.",
    );
    expect(advances).toBe(0);
  });

  it("rejects a direct portal inside a Set before target rendering", () => {
    const target = document.createElement("div");
    const content = new Set([createPortal(<button type="button">Escaped</button>, target) as never]);
    expect(() => normalizeReactNode(content, { name: "test content", policy: "intrinsic" })).toThrow(
      "test content must not contain a direct React portal.",
    );
    expect(target).toBeEmptyDOMElement();
  });
});
