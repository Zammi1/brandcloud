// @vitest-environment node

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium, firefox, webkit, type Browser, type Page } from "playwright";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import { afterEach, describe, expect, it } from "vitest";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const dialogPath = resolve(packageDirectory, "src/dialog.tsx");
const drawerPath = resolve(packageDirectory, "src/drawer.tsx");
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const browserTypes = { chromium, firefox, webkit } as const;
type BrowserName = keyof typeof browserTypes;

let activeBrowser: Browser | undefined;

afterEach(async () => {
  await activeBrowser?.close();
  activeBrowser = undefined;
});

async function bundleProbe(source: string, name: string): Promise<string> {
  const virtualId = `/wave7-${name}.tsx`;
  const result = await build({
    configFile: false,
    logLevel: "silent",
    plugins: [
      {
        name: `wave7-${name}`,
        enforce: "pre",
        resolveId(id) {
          if (id === virtualId) return virtualId;
          return undefined;
        },
        load(id) {
          return id === virtualId ? source : undefined;
        },
      },
      react(),
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: {
        input: virtualId,
        output: { format: "iife", name: "Wave7OverlayProbe" },
      },
    },
  });
  if (!Array.isArray(result) && !("output" in result)) {
    throw new Error("Wave 7 overlay probe unexpectedly started a build watcher.");
  }
  const output = Array.isArray(result) ? result[0]!.output : result.output;
  const chunk = output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk") throw new Error("Wave 7 overlay probe did not emit JavaScript.");
  return chunk.code;
}

async function openProbe(
  source: string,
  name: string,
  initialKind = "dialog",
  browserName: BrowserName = "chromium",
): Promise<Page> {
  const code = await bundleProbe(source, name);
  await activeBrowser?.close();
  activeBrowser = await browserTypes[browserName].launch({ headless: true });
  const page = await activeBrowser.newPage({ viewport: { width: 320, height: 500 } });
  await page.setContent('<!doctype html><html dir="rtl"><head></head><body><div id="root"></div><div id="external-root"></div></body></html>');
  await page.evaluate((kind) => { (window as any).initialOverlayKind = kind; }, initialKind);
  await page.addScriptTag({ content: code });
  return page;
}

describe("Dialog and Drawer browser contracts", () => {
  it("keeps rich hidden presentation independently named and axe-clean in every engine", async () => {
    const source = `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { Dialog } from ${JSON.stringify(dialogPath)};
      import { Drawer } from ${JSON.stringify(drawerPath)};
      function DialogProbe() {
        return <Dialog defaultOpen trigger={<button>Open dialog</button>} title={<span aria-hidden="true">Hidden dialog presentation</span>} titleAccessibleLabel="Independent dialog name">Body</Dialog>;
      }
      function DrawerProbe() {
        return <Drawer defaultOpen trigger={<button>Open drawer</button>} title={<span hidden>Hidden drawer presentation</span>} titleAccessibleLabel="Independent drawer name">Body</Drawer>;
      }
      createRoot(document.getElementById("root")).render(window.initialOverlayKind === "dialog" ? <DialogProbe /> : <DrawerProbe />);
    `;

    for (const browserName of Object.keys(browserTypes) as BrowserName[]) {
      for (const kind of ["dialog", "drawer"] as const) {
        const page = await openProbe(source, `accessible-title-${browserName}-${kind}`, kind, browserName);
        await page.addScriptTag({ content: axeSource });
        const expectedName = kind === "dialog" ? "Independent dialog name" : "Independent drawer name";
        const dialog = page.getByRole("dialog", { name: expectedName });
        await dialog.waitFor();
        expect(await dialog.count()).toBe(1);
        const violations = await page.evaluate(async () => {
          const result = await (window as any).axe.run(document, { runOnly: ["aria-dialog-name"] });
          return result.violations.map((violation: { id: string }) => violation.id);
        });
        expect(violations, `${browserName} ${kind}`).toEqual([]);
      }
    }
  }, 30_000);

  it("contains rapid forward and reverse Tab cycles inside modal popups", async () => {
    const source = `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { Dialog } from ${JSON.stringify(dialogPath)};
      import { Drawer } from ${JSON.stringify(drawerPath)};
      const content = <><button id="first" type="button">First</button><button id="last" type="button">Last</button></>;
      function DialogProbe() {
        return <><a id="outside" href="#outside">Outside</a><Dialog defaultOpen trigger={<button>Open dialog</button>} title="Dialog probe" actions={<button id="action" type="button">Action</button>}>{content}</Dialog></>;
      }
      function DrawerProbe() {
        return <><a id="outside" href="#outside">Outside</a><Drawer defaultOpen trigger={<button>Open drawer</button>} title="Drawer probe" actions={<button id="action" type="button">Action</button>}>{content}</Drawer></>;
      }
      createRoot(document.getElementById("root")).render(window.initialOverlayKind === "dialog" ? <DialogProbe /> : <DrawerProbe />);
    `;

    for (const browserName of Object.keys(browserTypes) as BrowserName[]) {
      for (const kind of ["dialog", "drawer"] as const) {
      const page = await openProbe(source, `tab-cycle-${browserName}-${kind}`, kind, browserName);
      const popupSelector = `.brand-${kind}__popup`;
      await page.locator(popupSelector).waitFor();
      await page.locator("#first").focus();
      for (let index = 0; index < 10; index += 1) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate((selector) => {
          const popup = document.querySelector(selector);
          return popup?.contains(document.activeElement) ?? false;
        }, popupSelector);
        expect(inside, `${browserName} ${kind} forward Tab ${index + 1}`).toBe(true);
      }
      await page.locator("#last").focus();
      for (let index = 0; index < 10; index += 1) {
        await page.keyboard.press("Shift+Tab");
        const inside = await page.evaluate((selector) => {
          const popup = document.querySelector(selector);
          return popup?.contains(document.activeElement) ?? false;
        }, popupSelector);
        expect(inside, `${browserName} ${kind} reverse Tab ${index + 1}`).toBe(true);
      }
      }
    }
  }, 45_000);

  it("owns the opening edge before rapid forward and reverse Tab cycles", async () => {
    const source = `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { Dialog } from ${JSON.stringify(dialogPath)};
      import { Drawer } from ${JSON.stringify(drawerPath)};
      const content = <><a id="first-edge" href="#first">First edge</a><button id="last-edge" type="button">Last edge</button></>;
      function DialogProbe() {
        return <><details><summary id="external-proof-summary">External proof summary</summary></details><Dialog trigger={<button id="open-edge">Open dialog</button>} title="Dialog edge">{content}</Dialog></>;
      }
      function DrawerProbe() {
        return <><details><summary id="external-proof-summary">External proof summary</summary></details><Drawer trigger={<button id="open-edge">Open drawer</button>} title="Drawer edge">{content}</Drawer></>;
      }
      createRoot(document.getElementById("root")).render(window.initialOverlayKind === "dialog" ? <DialogProbe /> : <DrawerProbe />);
    `;

    for (const browserName of Object.keys(browserTypes) as BrowserName[]) {
      for (const kind of ["dialog", "drawer"] as const) {
        const page = await openProbe(source, `opening-edge-${browserName}-${kind}`, kind, browserName);
        const popupSelector = `.brand-${kind}__popup`;
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: width === 390 ? 844 : 500 });
          for (const key of ["Tab", "Shift+Tab"]) {
            await page.locator("#open-edge").click();
            await page.locator(popupSelector).waitFor();
            const openingFocusIsOwned = await page.evaluate((selector) => {
              const popup = document.querySelector(selector);
              return popup?.contains(document.activeElement) ?? false;
            }, popupSelector);
            expect(openingFocusIsOwned, `${browserName} ${kind} ${width}px opening focus`).toBe(true);
            for (let index = 0; index < 12; index += 1) {
              await page.keyboard.press(key);
              const active = await page.evaluate((selector) => {
                const popup = document.querySelector(selector);
                return {
                  inside: popup?.contains(document.activeElement) ?? false,
                  activeId: (document.activeElement as HTMLElement | null)?.id ?? "",
                };
              }, popupSelector);
              expect(active.inside, `${browserName} ${kind} ${width}px ${key} ${index + 1}: ${active.activeId}`).toBe(true);
            }
            await page.keyboard.press("Escape");
            await page.locator(popupSelector).waitFor({ state: "detached" });
          }
        }
      }
    }
  }, 45_000);

  it("proves opaque external portals are outside both popup focus boundaries", async () => {
    const source = `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { createPortal } from "react-dom";
      import { Dialog } from ${JSON.stringify(dialogPath)};
      import { Drawer } from ${JSON.stringify(drawerPath)};
      function External({ id }) {
        return createPortal(<button id={id} type="button">External control</button>, document.getElementById("external-root"));
      }
      function DialogProbe() {
        return <Dialog defaultOpen trigger={<button>Open dialog</button>} title="Dialog probe"><button>Inside</button><External id="dialog-external" /></Dialog>;
      }
      function DrawerProbe() {
        return <Drawer defaultOpen trigger={<button>Open drawer</button>} title="Drawer probe"><button>Inside</button><External id="drawer-external" /></Drawer>;
      }
      const root = createRoot(document.getElementById("root"));
      window.renderOverlay = (kind) => root.render(kind === "dialog" ? <DialogProbe /> : <DrawerProbe />);
      window.renderOverlay(window.initialOverlayKind);
    `;
    const page = await openProbe(source, "focus-boundary");
    await page.locator(".brand-dialog__popup").waitFor();
    const dialog = await page.evaluate(async () => {
      const popup = document.querySelector(".brand-dialog__popup")!;
      const external = document.getElementById("dialog-external")!;
      external.focus();
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { outside: !popup.contains(external), focused: document.activeElement === external };
    });
    expect(dialog).toEqual({ outside: true, focused: true });

    const drawerPage = await openProbe(source, "focus-boundary-drawer", "drawer");
    await drawerPage.locator(".brand-drawer__popup").waitFor();
    const drawer = await drawerPage.evaluate(async () => {
      const popup = document.querySelector(".brand-drawer__popup")!;
      const external = document.getElementById("drawer-external")!;
      external.focus();
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { outside: !popup.contains(external), focused: document.activeElement === external };
    });
    expect(drawer).toEqual({ outside: true, focused: true });
  }, 15_000);

  it("contains long tokens at 320px and 200% text while preserving physical RTL insets", async () => {
    const source = `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { Dialog } from ${JSON.stringify(dialogPath)};
      import { Drawer } from ${JSON.stringify(drawerPath)};
      const token = "UNBREAKABLE".repeat(80);
      function DialogProbe() {
        return <Dialog defaultOpen portalDirection="rtl" trigger={<button>Open</button>} title={<span id="title">{token}</span>} titleAccessibleLabel={token} description={<span id="description">{token}</span>} actions={<button id="action">{token}</button>}><div id="content">{token}</div></Dialog>;
      }
      function DrawerProbe() {
        return <Drawer defaultOpen portalDirection="rtl" trigger={<button>Open</button>} title={<span id="title">{token}</span>} titleAccessibleLabel={token} description={<span id="description">{token}</span>} actions={<button id="action">{token}</button>}><div id="content">{token}</div></Drawer>;
      }
      const root = createRoot(document.getElementById("root"));
      window.renderOverlay = (kind) => root.render(kind === "dialog" ? <DialogProbe /> : <DrawerProbe />);
      window.renderOverlay(window.initialOverlayKind);
    `;
    const page = await openProbe(source, "layout");
    const css = readFileSync(resolve(packageDirectory, "dist/styles.css"), "utf8")
      .replaceAll("env(safe-area-inset-left)", "37px")
      .replaceAll("env(safe-area-inset-right)", "11px")
      .replaceAll("env(safe-area-inset-top)", "7px")
      .replaceAll("env(safe-area-inset-bottom)", "5px");
    await page.addStyleTag({ content: css });

    async function measure(selector: string) {
      return page.evaluate((popupSelector) => {
        const popup = document.querySelector(popupSelector) as HTMLElement;
        const insetTarget = popupSelector.includes("dialog")
          ? document.querySelector(".brand-dialog__portal") as HTMLElement
          : popup;
        const style = getComputedStyle(insetTarget);
        return {
          clientWidth: popup.clientWidth,
          scrollWidth: popup.scrollWidth,
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          wraps: ["title", "description", "content", "action"].map((id) => getComputedStyle(document.getElementById(id)!).overflowWrap),
        };
      }, selector);
    }

    await page.locator(".brand-dialog__popup").waitFor();
    const dialog = await measure(".brand-dialog__popup");
    expect(dialog.scrollWidth).toBe(dialog.clientWidth);
    expect(dialog.documentScrollWidth).toBe(dialog.documentClientWidth);
    expect(dialog.paddingLeft).toBe("37px");
    expect(dialog.paddingRight).toBe("16px");
    expect(dialog.wraps).toEqual(["anywhere", "anywhere", "anywhere", "anywhere"]);

    await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    const zoomedDialog = await measure(".brand-dialog__popup");
    expect(zoomedDialog.scrollWidth).toBe(zoomedDialog.clientWidth);
    expect(zoomedDialog.documentScrollWidth).toBe(zoomedDialog.documentClientWidth);

    await page.evaluate(() => {
      document.documentElement.style.fontSize = "16px";
      (window as any).renderOverlay("drawer");
    });
    await page.locator(".brand-drawer__popup").waitFor();
    const drawer = await measure(".brand-drawer__popup");
    expect(drawer.scrollWidth).toBe(drawer.clientWidth);
    expect(drawer.documentScrollWidth).toBe(drawer.documentClientWidth);
    expect(drawer.paddingLeft).toBe("37px");
    expect(drawer.paddingRight).toBe("16px");
    expect(drawer.wraps).toEqual(["anywhere", "anywhere", "anywhere", "anywhere"]);

    await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    const zoomedDrawer = await measure(".brand-drawer__popup");
    expect(zoomedDrawer.scrollWidth).toBe(zoomedDrawer.clientWidth);
    expect(zoomedDrawer.documentScrollWidth).toBe(zoomedDrawer.documentClientWidth);
  }, 15_000);
});
