import "@brandcloud/motion/motion.css";
import "@brandcloud/motion/view-transitions.css";
import "./lab.css";
import { countUp, onReducedMotionChange, prefersReducedMotion, reveal, viewTransition, whenVisible } from "@brandcloud/motion/dom";
import { simulateSpring, spring } from "@brandcloud/motion";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Reduced-motion preview switch: <html data-motion="reduce"> is honoured by the tokens and helpers.
const toggle = $("[data-reduce-toggle]");
function setPreview(on) {
  if (on) document.documentElement.dataset.motion = "reduce";
  else delete document.documentElement.dataset.motion;
  toggle.setAttribute("aria-pressed", String(on));
  document.dispatchEvent(new CustomEvent("lab:motion", { detail: { reduced: prefersReducedMotion() } }));
}
toggle.addEventListener("click", () => setPreview(toggle.getAttribute("aria-pressed") !== "true"));
if (new URLSearchParams(location.search).has("reduce")) setPreview(true);

// Loading state on a depth button: spinner while busy, no press or lift.
for (const button of $$("[data-loading-demo]")) {
  button.addEventListener("click", () => {
    if (button.getAttribute("aria-busy") === "true") return;
    const label = $(".btn-label", button);
    const original = label.textContent;
    button.setAttribute("aria-busy", "true");
    label.textContent = "Sending";
    const spinner = document.createElement("span");
    spinner.className = "m-spinner";
    spinner.setAttribute("aria-hidden", "true");
    button.prepend(spinner);
    setTimeout(() => {
      spinner.remove();
      label.textContent = original;
      button.removeAttribute("aria-busy");
    }, 1800);
  });
}

// Native dialog and drawer (enter/exit come from .m-dialog / .m-drawer with @starting-style).
let autoClose = 0;
for (const opener of $$("[data-open]")) {
  opener.addEventListener("click", () => {
    const dialog = document.getElementById(opener.dataset.open);
    clearTimeout(autoClose); // a reopen must not be closed by the previous submit's timer
    const done = $("[data-done]", dialog);
    if (done) {
      done.hidden = true;
      done.classList.remove("is-on");
      $("[data-request-status]", dialog).textContent = "";
    }
    dialog.showModal();
  });
}
for (const closer of $$("[data-close]")) closer.addEventListener("click", () => closer.closest("dialog").close());
for (const dialog of $$("dialog")) {
  // Click on the scrim closes.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
const requestForm = $("[data-request-form]");
requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const done = $("[data-done]", requestForm);
  done.hidden = false;
  // The live region exists before the change, so screen readers announce it.
  $("[data-request-status]", requestForm).textContent = "Request sent. You will get a reply on WhatsApp.";
  requestAnimationFrame(() => done.classList.add("is-on"));
  clearTimeout(autoClose);
  autoClose = setTimeout(() => requestForm.closest("dialog").close(), 1600);
});

// View transition: list to detail and back. The morphing element shares view-transition-name.
const vtRoot = $("[data-vt-root]");
const listView = $('[data-view="list"]', vtRoot);
const detailView = $('[data-view="detail"]', vtRoot);
for (const control of $$("[data-case]", vtRoot)) {
  control.addEventListener("click", async () => {
    const open = control.dataset.case === "open";
    await viewTransition(() => {
      listView.hidden = open;
      detailView.hidden = !open;
    });
    $(open ? '[data-case="close"]' : '[data-case="open"]', vtRoot).focus({ preventScroll: true });
  });
}

// A list the user asked for: capped stagger via --m-index.
const checklistButton = $("[data-checklist]");
const checklist = $("[data-checklist-list]");
$$("li", checklist).forEach((li, i) => li.style.setProperty("--m-index", String(Math.min(i, 5))));
checklistButton.addEventListener("click", () => {
  const show = checklist.hidden;
  checklist.hidden = !show;
  checklist.classList.toggle("is-on", show);
  checklistButton.textContent = show ? "Hide the checklist" : "Show the checklist";
});

// One reveal, one count-up.
reveal();
const figure = $("[data-count-to]");
let counted = false;
whenVisible(figure, {
  rootMargin: "0px",
  onEnter: () => {
    if (counted) return;
    counted = true;
    countUp(figure, Number(figure.dataset.countTo));
  },
});

// Spring curves drawn from the same simulation the CSS linear() curves use.
const springsHost = $("[data-springs]");
for (const [name, config] of Object.entries(spring)) {
  const { samples, durationMs } = simulateSpring(config, 80);
  const max = Math.max(1.25, ...samples);
  const w = 160;
  const h = 96;
  const pad = 10;
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const d = samples.map((v, i) => `${i ? "L" : "M"}${(pad + (i / (samples.length - 1)) * (w - pad * 2)).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ratio = config.damping / (2 * Math.sqrt(config.stiffness * config.mass));
  const figureEl = document.createElement("figure");
  figureEl.className = "spring";
  figureEl.style.margin = "0";
  figureEl.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${name} spring curve, settles in ${durationMs} milliseconds">
      <line x1="${pad}" x2="${w - pad}" y1="${y(1)}" y2="${y(1)}" stroke="#c9c6bd" stroke-dasharray="3 3" />
      <path d="${d}" fill="none" stroke="#1d4ed8" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <figcaption><span class="spring-name">${name}</span><br><span class="spring-meta">stiffness ${config.stiffness}, damping ${config.damping}<br>ratio ${ratio.toFixed(2)}, settles in ${durationMs}ms</span></figcaption>`;
  springsHost.append(figureEl);
}

// 3D cube: loaded only when the stage comes near the viewport, never under reduced motion unless asked.
const stage = $("[data-cube]");
const loadButton = $("[data-cube-load]");
const turnButton = $("[data-cube-turn]");
const status = $("[data-cube-status]");
let cube;
let starting = false;
let stopWatch = null;
async function startCube({ arrive }) {
  if (cube || starting) return;
  starting = true;
  stopWatch?.();
  stopWatch = null;
  status.textContent = "Loading the 3D mark";
  try {
    const { mountCube } = await import("./cube.js");
    cube = mountCube(stage, { arrive, reduced: () => prefersReducedMotion() });
    window.__labCube = cube;
    stage.classList.add("is-3d");
    loadButton.hidden = true;
    turnButton.hidden = false;
    status.textContent = "";
  } catch (error) {
    status.textContent = "3D is not available here, so the flat mark stays.";
    console.error(error);
  } finally {
    starting = false;
  }
}
// Runs on load and whenever the motion preference changes. Under reduced motion nothing loads
// until asked, and any pending auto-load watcher is stopped.
function prepareCube() {
  if (cube) return;
  if (prefersReducedMotion()) {
    stopWatch?.();
    stopWatch = null;
    loadButton.hidden = false;
    return;
  }
  loadButton.hidden = true;
  if (stopWatch) return;
  stopWatch = whenVisible(stage, {
    rootMargin: "200px",
    onEnter: () => startCube({ arrive: true }),
  });
}
loadButton.addEventListener("click", () => startCube({ arrive: false }));
turnButton.addEventListener("click", () => cube?.turn(1));
prepareCube();
document.addEventListener("lab:motion", prepareCube);
onReducedMotionChange(prepareCube);
window.__labCubeWatching = () => stopWatch !== null;
