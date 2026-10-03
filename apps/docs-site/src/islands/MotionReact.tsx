/**
 * The React (Motion) presets from @brandcloud/motion/react, live. Every demo starts from a user action,
 * and BrandMotionConfig honours the OS setting and <html data-motion="reduce"> (the switch on this page).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { BrandMotionConfig, depthButton, dialog, drawer, list, listItem, overlay, press, reveal, sheet, tierTile, transitions, useBrandReducedMotion, useCountUp } from "@brandcloud/motion/react";

const describe = (v: unknown) => {
  const t = v as { type?: string; stiffness?: number; duration?: number };
  return t.type === "spring" ? `spring, stiffness ${t.stiffness}` : `${Math.round((t.duration ?? 0) * 1000)}ms`;
};

type Panel = "dialog" | "drawer" | "sheet" | null;

function Demo({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <div className="mr-demo">
      <div className="mr-demo__text">
        <p className="mr-demo__name"><code>{name}</code></p>
        <p className="mr-demo__note">{note}</p>
      </div>
      <div className="mr-demo__stage">{children}</div>
    </div>
  );
}

function Overlay({ kind, onClose }: { kind: Exclude<Panel, null>; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const variants = kind === "dialog" ? dialog : kind === "drawer" ? drawer : sheet;
  const title = { dialog: "A dialog that settles in", drawer: "A drawer from the edge it lives on", sheet: "A sheet that rises from the bottom" }[kind];
  return (
    <div className="mr-layer">
      <m.div className="mr-scrim" variants={overlay} initial="hidden" animate="visible" exit="exit" onClick={onClose} />
      <m.div className="mr-panel" data-kind={kind} role="dialog" aria-modal="true" aria-labelledby="mr-panel-title" variants={variants} initial="hidden" animate="visible" exit="exit">
        <h4 id="mr-panel-title">{title}</h4>
        <p>Gentle spring in, a faster exit. Press Escape or the button to close.</p>
        <button ref={closeRef} type="button" className="ud-trigger" onClick={onClose}>Close</button>
      </m.div>
    </div>
  );
}

function CountUp() {
  const [start, setStart] = useState(false);
  const value = useCountUp(1280, { start, format: (v) => Math.round(v).toLocaleString("en-GB") });
  return (
    <div className="mr-count">
      <p className="mr-count__n s-num" aria-live="polite">{start ? value : "0"}</p>
      <button type="button" className="ud-trigger" onClick={() => setStart(true)} disabled={start}>{start ? "Counted once" : "Count up once"}</button>
    </div>
  );
}

function Inner() {
  const reduced = useBrandReducedMotion();
  const [panel, setPanel] = useState<Panel>(null);
  const [items, setItems] = useState<string[]>([]);
  const [revealKey, setRevealKey] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const open = (kind: Exclude<Panel, null>, el: HTMLButtonElement) => {
    triggerRef.current = el;
    setPanel(kind);
  };
  const close = () => {
    setPanel(null);
    triggerRef.current?.focus();
  };
  return (
    <div className="mr">
      <p className="mr-status" aria-live="polite">Reduced motion is <strong>{reduced ? "on" : "off"}</strong> for these demos.</p>
      <Demo name="press" note="Down fast, back on the press spring with a small overshoot.">
        <m.button type="button" className="ud-trigger" {...press}>Press and hold</m.button>
      </Demo>
      <Demo name="depthButton" note="1px lift and 4% brighter on hover, press to 0.95.">
        <m.button type="button" className="ba ba-button" data-tone="brand" data-appearance="depth" data-size="md" {...depthButton}><span className="ba-button__label">Depth
          button</span></m.button>
      </Demo>
      <Demo name="tierTile" note="An offer tile lifts 4px on hover or focus, with a light press.">
        <m.a href="#motion-react" className="mr-tile" {...tierTile}><span>Navy level</span><small>Lifts because the tile is the action</small></m.a>
      </Demo>
      <Demo name="dialog and overlay" note="The scrim fades while the dialog settles in.">
        <button type="button" className="ud-trigger" onClick={(e) => open("dialog", e.currentTarget)}>Open the dialog</button>
      </Demo>
      <Demo name="drawer" note="Slides from the inline end.">
        <button type="button" className="ud-trigger" onClick={(e) => open("drawer", e.currentTarget)}>Open the drawer</button>
      </Demo>
      <Demo name="sheet" note="Rises from the bottom, for phone menus and pickers.">
        <button type="button" className="ud-trigger" onClick={(e) => open("sheet", e.currentTarget)}>Open the sheet</button>
      </Demo>
      <Demo name="list and listItem" note="Items arrive after a user action, with the stagger capped at 300ms in total.">
        <div className="mr-list">
          <button type="button" className="ud-trigger"
            onClick={() => setItems((l) => (l.length ? [] : ["Full service", "Safety check", "Wheel true", "New chain"]))}>{items.length ? "Clear the list" : "Add four items"}</button>
          <m.ul variants={list} initial="hidden" animate="visible" key={items.length}>
            {items.map((it, i) => <m.li key={it} variants={listItem} custom={i}>{it}</m.li>)}
          </m.ul>
        </div>
      </Demo>
      <Demo name="reveal" note="One reveal on first view. Use it for one or two moments a page, never every section.">
        <div className="mr-reveal">
          <m.div key={revealKey} className="mr-reveal__box" {...reveal}>Revealed once, as it came into view</m.div>
          <button type="button" className="ud-trigger" onClick={() => setRevealKey((k) => k + 1)}>Replay</button>
        </div>
      </Demo>
      <Demo name="useCountUp" note="One hero figure at most. Prices never count up.">
        <CountUp />
      </Demo>
      <Demo name="transitions" note="Named transitions from the tokens, for your own components.">
        <ul className="mr-transitions">
          {Object.entries(transitions).map(([k, v]) => <li key={k}><code>{k}</code> <span>{describe(v)}</span></li>)}
        </ul>
      </Demo>
      <AnimatePresence>{panel && <Overlay key={panel} kind={panel} onClose={close} />}</AnimatePresence>
    </div>
  );
}

export default function MotionReact() {
  return (
    <BrandMotionConfig>
      <LazyMotion features={domAnimation}>
        <Inner />
      </LazyMotion>
    </BrandMotionConfig>
  );
}
