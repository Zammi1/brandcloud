/**
 * AI-look score in the browser. The page is drawn in a sandboxed iframe (srcdoc, no allow-scripts),
 * then the detector's own in-page checks (packages/antipatterns/lib/page-checks.js, loaded as text)
 * run against that frame's document. Scoring, weights and bands are the ones in rules.json, the same
 * as lib/engine.mjs. Rules that need Node-side pointer or scroll probes are listed as CLI only.
 * Nothing is uploaded: the HTML never leaves this browser.
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import pageChecksSource from "@antipatterns-lib/page-checks.js?raw";
import { Button } from "@brandcloud/ui/button";
import { FormField } from "@brandcloud/ui/form-field";
import { Textarea } from "@brandcloud/ui/textarea";
import { Select } from "@brandcloud/ui/select";
import { RadioGroup } from "@brandcloud/ui/radio";
import { Notice } from "@brandcloud/ui/notice";

export interface ScoreRule {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  check: string;
  params: Record<string, unknown>;
  fix: string;
  category: string;
  cliOnly: boolean;
}
export interface Scoring {
  weights: Record<string, number>;
  bands: { max: number; label: string; meaning: string }[];
  cap: number;
}
interface Props {
  rules: ScoreRule[];
  scoring: Scoring;
  detectBin: string;
}

type Finding = { hits: number; evidence: string[]; error?: string };
type Result = { score: number; band: string; meaning: string; fired: (ScoreRule & Finding)[]; ran: number; width: number; source: string };
type Status = { kind: "idle" } | { kind: "rendering" } | { kind: "checking" } | { kind: "done"; result: Result } | { kind: "error"; message: string };

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } } as const;
type Viewport = keyof typeof VIEWPORTS;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs page-checks.js against another document by handing it that frame's window and document. */
function runChecks(frame: HTMLIFrameElement, rules: ScoreRule[]): Promise<Record<string, Finding>> {
  const win = frame.contentWindow as (Window & { __AP?: { run: (spec: unknown) => Promise<Record<string, Finding>> } }) | null;
  const doc = frame.contentDocument;
  if (!win || !doc || !doc.body) throw new Error("The page did not render.");
  delete win.__AP;
  // eslint-disable-next-line no-new-func -- the detector's checks are shipped as a plain browser script.
  const factory = new Function("window", "document", "getComputedStyle", `${pageChecksSource}\nreturn window.__AP;`);
  const api = factory(win, doc, (el: Element, pseudo?: string) => win.getComputedStyle(el, pseudo));
  const spec = rules.filter((r) => !r.cliOnly).map((r) => ({ id: r.id, check: r.check, params: r.params }));
  return api.run(spec);
}

export default function AiLookScore({ rules, scoring, detectBin }: Props) {
  const [html, setHtml] = useState("");
  const [fileName, setFileName] = useState<string>();
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [sampleRule, setSampleRule] = useState(rules.find((r) => !r.cliOnly)?.id ?? rules[0].id);
  const [sampleVersion, setSampleVersion] = useState<"bad" | "good">("bad");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [srcdoc, setSrcdoc] = useState<string>();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pending = useRef<{ source: string; width: number } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Scale the full-width frame down to fit the column, without changing the page's own layout width.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const { width, height } = VIEWPORTS[viewport];
      const scale = Math.min(1, stage.clientWidth / width);
      stage.style.setProperty("--frame-scale", String(scale));
      stage.style.setProperty("--frame-w", `${width}px`);
      stage.style.setProperty("--frame-h", `${height}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [viewport, srcdoc]);

  const start = (source: string, doc: string) => {
    if (!doc.trim()) {
      setStatus({ kind: "error", message: "There is no HTML to check yet. Paste a page, choose a file or load an example." });
      return;
    }
    pending.current = { source, width: VIEWPORTS[viewport].width };
    setStatus({ kind: "rendering" });
    // A new srcdoc every time, so the frame reloads even for the same HTML.
    setSrcdoc(`${doc}\n<!-- run ${Date.now()} -->`);
  };

  const onLoad = async () => {
    const job = pending.current;
    const frame = frameRef.current;
    if (!job || !frame) return;
    pending.current = null;
    try {
      setStatus({ kind: "checking" });
      await frame.contentDocument?.fonts?.ready;
      await wait(350);
      const findings = await runChecks(frame, rules);
      const fired = rules.filter((r) => !r.cliOnly && findings[r.id]?.hits > 0).map((r) => ({ ...r, ...findings[r.id] }));
      let score = 0;
      for (const r of fired) score += scoring.weights[r.severity] ?? 0;
      score = Math.min(scoring.cap, score);
      const band = scoring.bands.find((b) => score <= b.max) ?? scoring.bands[scoring.bands.length - 1];
      setStatus({ kind: "done", result: { score, band: band.label, meaning: band.meaning, fired, ran: rules.filter((r) => !r.cliOnly).length, width: job.width, source: job.source } });
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      setStatus({ kind: "error", message: "Choose an .html file. A screenshot cannot be measured: the checks read the page's real styles and structure." });
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    setHtml(text);
    start(file.name, text);
  };

  const loadSample = async () => {
    try {
      const response = await fetch(`/pairs/${sampleRule}/${sampleVersion}.html`);
      if (!response.ok) throw new Error(`Example not found (${response.status}).`);
      let text = await response.text();
      // Relative links in the example resolve against its own folder.
      text = text.replace(/<head([^>]*)>/i, `<head$1><base href="/pairs/${sampleRule}/">`);
      setFileName(undefined);
      setHtml(text);
      start(`${sampleRule} ${sampleVersion} example`, text);
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const busy = status.kind === "rendering" || status.kind === "checking";
  const cliOnly = rules.filter((r) => r.cliOnly);
  const result = status.kind === "done" ? status.result : null;

  return (
    <div className="ls">
      <div className="ls-input">
        <form className="ls-form" onSubmit={(e) => { e.preventDefault(); start(fileName ?? "pasted HTML", html); }} aria-labelledby="ls-input-title">
          <h2 id="ls-input-title" className="ls-h">Your page</h2>
          <FormField label="Paste the page's HTML" description="The whole document works best, with its CSS inline. Linked stylesheets with relative paths will not load here.">
            <Textarea rows={9} value={html} onChange={(e) => { setHtml(e.target.value); setFileName(undefined); }} spellCheck={false} className="ls-code" placeholder="<!doctype html>" />
          </FormField>
          <label className="ls-file">
            <span>Or choose an .html file</span>
            <input type="file" accept=".html,.htm,text/html" onChange={onFile} />
          </label>
          <RadioGroup legend="Check it at" name="ls-viewport" value={viewport} onValueChange={(v) => setViewport(v as Viewport)}
            options={[{ value: "desktop", label: "Desktop, 1440 by 900" }, { value: "phone", label: "Phone, 390 by 844" }]} />
          <div className="s-cluster">
            <Button type="submit" size="lg" loading={busy}>Check this page</Button>
          </div>
        </form>

        <div className="ls-sample" aria-labelledby="ls-sample-title">
          <h2 id="ls-sample-title" className="ls-h ls-h--small">Or try an example pair</h2>
          <p className="ls-help">Every rule has a made-up page in two versions: one with the tell, one fixed. Load either and check it.</p>
          <FormField label="Rule">
            <Select value={sampleRule} onValueChange={setSampleRule} options={rules.map((r) => ({ value: r.id, label: `${r.id}: ${r.title}` }))} />
          </FormField>
          <RadioGroup legend="Version" name="ls-version" value={sampleVersion} onValueChange={(v) => setSampleVersion(v as "bad" | "good")}
            options={[{ value: "bad", label: "With the tell" }, { value: "good", label: "Fixed" }]} />
          <Button type="button" tone="ink" onClick={loadSample} disabled={busy}>Load and check the example</Button>
        </div>
      </div>

      <div className="ls-output">
        <div ref={resultRef} tabIndex={-1} className="ls-result" aria-live="polite" aria-labelledby="ls-result-title">
          <h2 id="ls-result-title" className="ls-h">Result</h2>
          {status.kind === "idle" && <p className="ls-help">Paste a page, choose a file or load an example, then check it. The score appears here with the evidence for each rule that fires.</p>}
          {status.kind === "rendering" && <p className="ls-help">Drawing the page in a sandboxed frame.</p>}
          {status.kind === "checking" && <p className="ls-help">Running {rules.filter((r) => !r.cliOnly).length} checks on the page.</p>}
          {status.kind === "error" && <Notice tone="warning" title="Nothing checked">{status.message}</Notice>}
          {result && (
            <>
              <div className="ls-score" data-band={scoring.bands.findIndex((b) => b.label === result.band)}>
                <p className="ls-score__num s-num"><span>{result.score}</span><span className="ls-score__of">/ {scoring.cap}</span></p>
                <div>
                  <p className="ls-score__band">{result.band[0].toUpperCase() + result.band.slice(1)}</p>
                  <p className="ls-help">{result.meaning} {result.source}, {result.width}px wide, {result.ran} rules checked.</p>
                </div>
              </div>
              {result.fired.length === 0 ? (
                <p className="ls-clean">No rule fired. Run the command-line version too for the {cliOnly.length} pointer and scroll rules, and for anything your page's scripts do.</p>
              ) : (
                <ol className="ls-fired">
                  {result.fired.map((r) => (
                    <li key={r.id}>
                      <div className="ls-fired__head">
                        <span className="ls-sev" data-sev={r.severity}>{r.severity}</span>
                        <h3>{r.title}</h3>
                        <span className="ls-fired__id">{r.id}, {r.hits} {r.hits === 1 ? "hit" : "hits"}</span>
                      </div>
                      {r.evidence.length > 0 && (
                        <ul className="ls-evidence" aria-label="Evidence">
                          {r.evidence.slice(0, 4).map((e, i) => <li key={i}><code>{e}</code></li>)}
                        </ul>
                      )}
                      <p><strong>Fix:</strong> {r.fix}</p>
                      <a className="s-textlink" href={`/developers/anti-ai/#${r.id}`}>See the bad and good pair for {r.id}</a>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        <div className="ls-stage-wrap">
          <p className="ls-help">The page as checked, at {VIEWPORTS[viewport].width}px wide, scaled to fit. Its scripts are switched off.</p>
          <div ref={stageRef} className="ls-stage" data-empty={srcdoc ? undefined : ""}>
            {srcdoc ? (
              <iframe ref={frameRef} className="ls-frame" title="The page being checked" sandbox="allow-same-origin" srcDoc={srcdoc} onLoad={onLoad} />
            ) : (
              <ol className="ls-empty">
                <li>Paste a page's HTML, choose an .html file or load an example pair.</li>
                <li>Pick desktop or phone width.</li>
                <li>Check it. The page appears here, scaled to fit, with the score above.</li>
              </ol>
            )}
          </div>
        </div>
      </div>

      <section className="ls-limits" aria-labelledby="ls-limits-title">
        <h2 id="ls-limits-title" className="ls-h">What this page cannot check</h2>
        <ul className="ls-limits__list">
          <li><strong>Pointer and scroll rules.</strong> {cliOnly.map((r) => `${r.id} (${r.title})`).join(" and ")} move the mouse or scroll the page, so they are checked by the CLI
            only.</li>
          <li><strong>Anything your scripts do.</strong> Scripts are switched off here for safety, so motion added by JavaScript is not seen. The CLI runs them.</li>
          <li><strong>Screenshots.</strong> A picture cannot be measured: the checks read real styles and structure. Save the page as HTML, or use the CLI.</li>
          <li><strong>A live URL.</strong> Fetching another site from this page needs a server, which is planned. Until then, use the CLI.</li>
        </ul>
        <pre className="s-code" tabIndex={0}><code>{`pnpm exec ${detectBin} https://your-site.co.uk
pnpm exec ${detectBin} https://your-site.co.uk --mobile
pnpm exec ${detectBin} dist/index.html --max-score 9 --fail-on high`}</code></pre>
      </section>
    </div>
  );
}
