/**
 * Brand builder. Every value shown comes from the browser-safe brand API in @brandcloud/tokens:
 * normaliseBrandInput and deriveBrandModes build the brand, checkTokens and depthLabelContrast
 * produce every pass or fail on screen. Nothing is sent anywhere; the logo is read on a canvas here.
 *
 * The live preview is static Astro markup passed in as children. This island writes the derived
 * tokens for the chosen mode onto #bb-preview through one <style> element.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { normaliseBrandInput, deriveBrandModes, checkTokens, depthLabelContrast, type BrandInput, type ContrastCheck, type TokenSet } from "@brandcloud/tokens/brand";
import { parseColour, toHex, toOklch } from "@brandcloud/tokens/colour";
import { themes } from "@brandcloud/tokens";
import { Button } from "@brandcloud/ui/button";
import { FormField } from "@brandcloud/ui/form-field";
import { Input } from "@brandcloud/ui/input";
import { Select } from "@brandcloud/ui/select";
import { RadioGroup } from "@brandcloud/ui/radio";
import { Notice } from "@brandcloud/ui/notice";
import { CodeBlock } from "@brandcloud/ui/code-block";

export interface FontChoice { id: string; label: string; stack: string }
export interface Preset { name: string; label: string; accent: string; ink: string; paper: string; display: string; body: string; appearance: "depth" | "solid" }

interface Props {
  presets: Preset[];
  fonts: FontChoice[];
  productName: string;
  children?: ReactNode;
}

type Mode = "light" | "dark";
type Target = "accent" | "ink" | "paper";

const FRIENDLY: Record<string, string> = {
  text: "Body text",
  "text-muted": "Muted text",
  "text-subtle": "Subtle text",
  accent: "Links (accent)",
  "accent-text": "Solid button label",
  "inverse-text": "Text on dark sections",
  "inverse-text-muted": "Muted text on dark sections",
  "action-depth-text": "Depth button label",
  "action-ink-text": "Ink button label",
  "whatsapp-text": "WhatsApp button label",
  "status-warning-text": "Warning text",
  focus: "Focus ring",
  "border-strong": "Strong border",
};
const friendly = (token: string) => {
  if (FRIENDLY[token]) return FRIENDLY[token];
  const level = /^level-(\w+)-(text|ink)$/.exec(token);
  if (level) return `${level[1][0].toUpperCase()}${level[1].slice(1)} level ${level[2] === "text" ? "label" : "text"}`;
  if (token.startsWith("status-") || token === "danger") return `${token.replace("status-", "").replace("-", " ")} colour`;
  return token;
};

const colourHelp = "Use a hex colour code, six digits after a hash sign, or pick one with the swatch.";
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/^[^a-z]+/, "").slice(0, 40) || "my-brand";
const firstFamily = (stack: string) => stack.split(",")[0].trim().replace(/['"]/g, "").replace(/ Variable$/, "");

/** Opaque CSS colour as #rrggbb, or undefined. */
function cleanHex(value: string): string | undefined {
  const parsed = parseColour(value.trim());
  if (!parsed || parsed.alpha !== 1) return undefined;
  return toHex(parsed);
}

/** A few dominant colours from an image, read on a small canvas in this browser. */
async function coloursFromImage(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = 72 / Math.max(img.naturalWidth || 72, img.naturalHeight || 72);
    const w = Math.max(1, Math.round((img.naturalWidth || 72) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || 72) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 160) continue;
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bucket.n++;
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
      buckets.set(key, bucket);
    }
    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n }));
    const picked: { r: number; g: number; b: number }[] = [];
    for (const c of sorted) {
      if (picked.every((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) > 48)) picked.push(c);
      if (picked.length === 6) break;
    }
    return picked.map((c) => toHex({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), alpha: 1 }));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function brandCss(name: string, label: string, modes: Record<Mode, TokenSet>): string {
  const block = (mode: Mode) => Object.entries(modes[mode]).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `    --brand-${k}: ${v};`).join("\n");
  return [
    `/* ${label}: brand "${name}", made with the brand builder. Light at :root, dark under data-theme="dark". */`,
    "@layer tokens {",
    `  :root, [data-theme="light"], [data-brand="${name}"] {`,
    "    color-scheme: light;",
    block("light"),
    "  }",
    `  [data-theme="dark"], [data-brand="${name}"][data-theme="dark"] {`,
    "    color-scheme: dark;",
    block("dark"),
    "  }",
    "}",
    "",
  ].join("\n");
}

function useDownloadUrl(text: string, type: string): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const next = URL.createObjectURL(new Blob([text], { type }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [text, type]);
  return url;
}

function CheckTable({ checks, caption }: { checks: ContrastCheck[]; caption: string }) {
  return (
    <div className="s-table-wrap" tabIndex={0}>
      <table className="s-table">
        <caption className="s-sr">{caption}</caption>
        <thead>
          <tr><th scope="col">Text</th><th scope="col">On</th><th scope="col">Ratio</th><th scope="col">Needs</th><th scope="col">Result</th></tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={`${c.fg}/${c.bg}`}>
              <th scope="row">{friendly(c.fg)} <code>{c.fg}</code></th>
              <td><code>{c.bg}</code></td>
              <td className="s-num">{c.ratio.toFixed(2)}:1</td>
              <td className="s-num">{c.need}:1{c.required ? "" : " (advisory)"}</td>
              <td><span className="s-status" data-tone={c.pass ? "pass" : "fail"}>{c.pass ? "Pass" : "Fail"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BrandBuilder({ presets, fonts, productName, children }: Props) {
  const first = presets[0];
  const fontFor = (stack: string) => fonts.find((f) => f.label === firstFamily(stack))?.id ?? fonts[0].id;
  const [label, setLabel] = useState("My brand");
  const [colours, setColours] = useState<Record<Target, string>>({ accent: first.accent, ink: first.ink, paper: first.paper });
  const [drafts, setDrafts] = useState<Record<Target, string>>({ accent: first.accent, ink: first.ink, paper: first.paper });
  const [display, setDisplay] = useState(fontFor(first.display));
  const [body, setBody] = useState(fontFor(first.body));
  const [appearance, setAppearance] = useState<"depth" | "solid">(first.appearance);
  const [mode, setMode] = useState<Mode>("light");
  const [logo, setLogo] = useState<{ name: string; colours: string[] } | null>(null);
  const [logoError, setLogoError] = useState<string>();
  const [target, setTarget] = useState<Target>("accent");
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const name = slugify(label);
  const fontStack = (id: string) => fonts.find((f) => f.id === id)?.stack ?? fonts[0].stack;

  const input: BrandInput = useMemo(
    () => ({ name, label, accent: colours.accent, ink: colours.ink, paper: colours.paper, fonts: { display: fontStack(display), body: fontStack(body) }, appearance }),
    [name, label, colours, display, body, appearance],
  );

  const result = useMemo(() => {
    try {
      const brand = normaliseBrandInput(structuredClone(input), "brand");
      const { modes } = deriveBrandModes(brand, { light: themes.light, dark: themes.dark });
      const checks = {
        light: checkTokens(modes.light, `${name} light`),
        dark: checkTokens(modes.dark, `${name} dark`),
      };
      const depth = {
        light: [44, 48, 56].map((height) => ({ height, ...depthLabelContrast(modes.light, { height }) })),
        dark: [44, 48, 56].map((height) => ({ height, ...depthLabelContrast(modes.dark, { height }) })),
      };
      return { ok: true as const, modes, checks, depth };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  }, [input, name]);

  // Write the derived tokens for the chosen mode onto the preview.
  useEffect(() => {
    const preview = document.getElementById("bb-preview");
    if (!preview || !result.ok) return;
    if (!styleRef.current) {
      styleRef.current = document.createElement("style");
      styleRef.current.dataset.brandBuilder = "";
      document.head.append(styleRef.current);
    }
    const tokens = result.modes[mode];
    const declarations = Object.entries(tokens).map(([k, v]) => `--brand-${k}: ${v};`).join(" ");
    styleRef.current.textContent = `#bb-preview { color-scheme: ${mode}; ${declarations} }`;
    preview.dataset.theme = mode;
    preview.dataset.buttonAppearance = appearance;
  }, [result, mode, appearance]);

  useEffect(() => () => styleRef.current?.remove(), []);

  const json = useMemo(() =>
    JSON.stringify({ name, label, accent: colours.accent, ink: colours.ink, paper: colours.paper, fonts: { body: fontStack(body), display: fontStack(display) }, appearance }, null, 2) +
    "\n", [name, label, colours, body, display, appearance]);
  const css = useMemo(() => (result.ok ? brandCss(name, label, result.modes) : ""), [result, name, label]);
  const jsonUrl = useDownloadUrl(json, "application/json");
  const cssUrl = useDownloadUrl(css, "text/css");

  const setColour = (key: Target, value: string) => {
    setDrafts((d) => ({ ...d, [key]: value }));
    const hex = cleanHex(value);
    if (hex) setColours((c) => ({ ...c, [key]: hex }));
  };

  const applyPreset = (presetName: string) => {
    const p = presets.find((x) => x.name === presetName);
    if (!p) return;
    setColours({ accent: p.accent, ink: p.ink, paper: p.paper });
    setDrafts({ accent: p.accent, ink: p.ink, paper: p.paper });
    setDisplay(fontFor(p.display));
    setBody(fontFor(p.body));
    setAppearance(p.appearance);
  };

  const onLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLogoError(undefined);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("That file is not an image. Try a PNG, JPG, SVG or WebP.");
      return;
    }
    try {
      const found = await coloursFromImage(file);
      if (!found.length) {
        setLogoError("No solid colours found in that image. Is it mostly transparent?");
        return;
      }
      setLogo({ name: file.name, colours: found });
      // Suggest: the most colourful mid-tone as the accent, the darkest as ink, the lightest as paper.
      const info = found.map((hex) => ({ hex, ...(toOklch(hex) ?? { l: 0.5, c: 0, h: 0 }) }));
      const accent = [...info].filter((c) => c.l > 0.3 && c.l < 0.8).sort((a, b) => b.c - a.c)[0];
      const darkest = [...info].sort((a, b) => a.l - b.l)[0];
      const lightest = [...info].sort((a, b) => b.l - a.l)[0];
      const next = { ...colours };
      if (accent && accent.c > 0.04) next.accent = accent.hex;
      if (darkest && darkest.l < 0.32) next.ink = darkest.hex;
      if (lightest && lightest.l > 0.93) next.paper = lightest.hex;
      setColours(next);
      setDrafts(next);
    } catch {
      setLogoError("That image could not be read here. Try a PNG or JPG export of the logo.");
    }
  };

  const modeChecks: ContrastCheck[] = result.ok ? result.checks[mode].checks : [];
  const required = modeChecks.filter((c) => c.required);
  const failing = required.filter((c) => !c.pass);
  const sorted = modeChecks.slice().sort((a, b) => Number(b.required) - Number(a.required));
  const summary = (m: Mode) => {
    if (!result.ok) return "";
    const req = result.checks[m].checks.filter((c) => c.required);
    return `${req.filter((c) => c.pass).length} of ${req.length}`;
  };
  const allPass = result.ok && (["light", "dark"] as Mode[]).every((m) => result.checks[m].errors.length === 0);

  return (
    <div className="bb">
      <form className="bb-controls" aria-labelledby="bb-controls-title" onSubmit={(e) => e.preventDefault()}>
        <h2 id="bb-controls-title" className="bb-h">Your brand</h2>
        <a className="bb-jump" href="#bb-status-title">Jump to the checks and live preview</a>

        <FormField label="Brand name" description={`Saved in the file as "${name}".`}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} autoComplete="off" />
        </FormField>

        <FormField label="Start from an example" description={`The ${productName} example brands. Your choices below change it.`}>
          <Select defaultValue={first.name} onValueChange={applyPreset} options={presets.map((p) => ({ value: p.name, label: p.label }))} />
        </FormField>

        <fieldset className="bb-group">
          <legend className="bb-legend">Colours</legend>
          {(["accent", "ink", "paper"] as Target[]).map((key) => {
            const valid = Boolean(cleanHex(drafts[key]));
            const help = { accent: "Buttons, links and highlights.", ink: "Text. Made darker if it needs to be, to pass.", paper: "The page background." }[key];
            return (
              <div className="bb-colour" key={key}>
                <FormField label={key[0].toUpperCase() + key.slice(1)} description={help} error={valid ? undefined : colourHelp}>
                  <Input value={drafts[key]} onChange={(e) => setColour(key, e.target.value)} spellCheck={false} autoComplete="off" className="bb-hex" />
                </FormField>
                <input className="bb-picker" type="color" value={colours[key]} onChange={(e) => setColour(key, e.target.value)}
                  aria-label={`${key[0].toUpperCase() + key.slice(1)} colour picker`} />
              </div>
            );
          })}
        </fieldset>

        <fieldset className="bb-group">
          <legend className="bb-legend">Colours from your logo</legend>
          <p className="bb-help">Read in this browser on a small canvas. The file is never uploaded.</p>
          <label className="bb-file">
            <span className="bb-file__label">Choose a logo image</span>
            <input type="file" accept="image/*" onChange={onLogo} />
          </label>
          {logoError && <p className="bb-error" role="alert">{logoError}</p>}
          {logo && (
            <div className="bb-logo" aria-live="polite">
              <p className="bb-help">{logo.colours.length} colours found in {logo.name}. The closest fits are applied. Pick a role, then a colour, to change one.</p>
              <RadioGroup legend="A colour you pick becomes the" name="bb-target" value={target} onValueChange={(v) => setTarget(v as Target)}
                options={[{ value: "accent", label: "Accent" }, { value: "ink", label: "Ink" }, { value: "paper", label: "Paper" }]} />
              <ul className="bb-swatches">
                {logo.colours.map((hex) => (
                  <li key={hex}>
                    <button type="button" className="bb-swatch" aria-label={`Use ${hex} as ${target}`} aria-pressed={colours[target] === hex} onClick={() => setColour(target, hex)}>
                      <span className="bb-swatch__chip" ref={(el) => el?.style.setProperty("--bb-swatch", hex)} />
                      <span className="bb-swatch__hex">{hex}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </fieldset>

        <fieldset className="bb-group">
          <legend className="bb-legend">Type and buttons</legend>
          <FormField label="Headings font">
            <Select value={display} onValueChange={setDisplay} options={fonts.map((f) => ({ value: f.id, label: f.label }))} />
          </FormField>
          <FormField label="Body font">
            <Select value={body} onValueChange={setBody} options={fonts.map((f) => ({ value: f.id, label: f.label }))} />
          </FormField>
          <RadioGroup legend="Default button" name="bb-appearance" value={appearance} onValueChange={(v) => setAppearance(v as "depth" | "solid")}
            options={[{ value: "depth", label: "Depth: lit from above, with a soft shadow" }, { value: "solid", label: "Solid: one flat colour" }]} />
          <RadioGroup legend="Preview in" name="bb-mode" value={mode} onValueChange={(v) => setMode(v as Mode)}
            options={[{ value: "light", label: "Light mode" }, { value: "dark", label: "Dark mode" }]} />
        </fieldset>
      </form>

      <div className="bb-main">
        <section className="bb-status" aria-labelledby="bb-status-title">
          <h2 id="bb-status-title" className="bb-h">Accessibility</h2>
          <div aria-live="polite">
            {!result.ok ? (
              <Notice tone="danger" title="This brand cannot be built yet">{result.error}</Notice>
            ) : (
              <>
                <p className="bb-verdict" data-pass={allPass ? "" : undefined}>
                  <strong>{allPass ? "Passes WCAG 2.2 AA in light and dark" : "Some text fails WCAG 2.2 AA"}</strong>
                  <span>Required text pairs passing: light {summary("light")}, dark {summary("dark")}.</span>
                </p>
                <ul className="bb-depth" aria-label="Depth button label at its darkest pixel">
                  {result.depth[mode].map((d) => (
                    <li key={d.height}>
                      <span>Depth button label, {d.height}px tall, {mode}</span>
                      <strong className="s-num">{d.ratio.toFixed(2)}:1</strong>
                      <span className="s-status" data-tone={d.ratio >= 4.5 ? "pass" : "fail"}>{d.ratio >= 4.5 ? "Pass" : "Fail"}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <div className="bb-preview-wrap">{children}</div>

        {result.ok && (
          <section className="bb-checks" aria-labelledby="bb-checks-title">
            <h2 id="bb-checks-title" className="bb-h">Every contrast check, {mode} mode</h2>
            <p className="bb-help">
              {failing.length === 0
                ? `All ${required.length} required pairs pass.`
                : `${failing.length} of ${required.length} required pairs fail. Try a darker accent or ink, or a lighter paper.`}{" "}
              Advisory pairs (status colours, focus ring, strong border) are there for information and do not block the build.
            </p>
            {failing.length > 0 && <CheckTable checks={failing} caption={`Required pairs that fail in ${mode} mode`} />}
            <details className="bb-details">
              <summary>Show all {modeChecks.length} checks for {mode} mode</summary>
              <CheckTable checks={sorted} caption={`Contrast checks from checkTokens for the ${mode} mode`} />
            </details>
          </section>
        )}

        {result.ok && (
          <section className="bb-export" aria-labelledby="bb-export-title">
            <h2 id="bb-export-title" className="bb-h">Export</h2>
            <p className="bb-help">The JSON has the same shape as the brand files in the kit. The CSS holds every token for light and dark, ready to import.</p>
            <div className="s-cluster">
              <Button render={<a href={jsonUrl} download={`${name}.json`} />} size="md">Download {name}.json</Button>
              <Button render={<a href={cssUrl} download={`${name}.css`} />} tone="ink" size="md">Download {name}.css</Button>
            </div>
            {!allPass && <p className="bb-help">This brand still fails a required check. The kit's build refuses a brand file that fails, so fix it before you hand it over.</p>}
            <CodeBlock title={`${name}.json`} language="JSON" code={json} />
          </section>
        )}
      </div>
    </div>
  );
}
