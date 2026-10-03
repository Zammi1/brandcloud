// A cube mark in 3D. Loaded as its own chunk only when the stage nears the viewport.
// Rules it follows (PRINCIPLES.md section 2): renders only while moving, stops off screen and in
// hidden tabs, no idle loop, same spring physics as the rest of the system, static under reduced motion.
import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { spring } from "@brandcloud/motion";
import { whenVisible } from "@brandcloud/motion/dom";

const QUARTER = Math.PI / 2;
const TURN = Math.PI * 2;
const ISO_TILT = Math.asin(1 / Math.sqrt(3)); // 35.26 degrees: the logo's isometric angle

function buildCube() {
  // Three slabs, like the 2D mark: top, left and right. They only read as one cube from the logo's
  // angle, so the arrival is the pieces resolving into the mark.
  const group = new Group();
  const ink = new MeshStandardMaterial({ color: new Color("#3a3d46"), roughness: 0.5, metalness: 0 });
  const size = 1.46;
  const t = 0.26;
  const off = 1 - t / 2;
  const plate = new RoundedBoxGeometry(size, size, t, 5, 0.1);
  const faces = [
    [0, off, 0, -QUARTER, 0], // top
    [0, 0, off, 0, 0], // front-left once turned 45 degrees
    [off, 0, 0, 0, QUARTER], // front-right
  ];
  for (const [x, y, z, rx, ry] of faces) {
    const mesh = new Mesh(plate, ink);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    group.add(mesh);
  }
  return group;
}

function contactShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(11,11,12,0.28)");
  g.addColorStop(0.6, "rgba(11,11,12,0.08)");
  g.addColorStop(1, "rgba(11,11,12,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(new PlaneGeometry(4.2, 1.1), new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.position.set(0, -1.85, -1);
  return mesh;
}

export function mountCube(stage, { arrive, reduced }) {
  const canvas = stage.querySelector("canvas");
  canvas.hidden = false;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10);

  scene.add(new HemisphereLight("#ffffff", "#8f8a7e", 0.6));
  scene.add(new AmbientLight("#ffffff", 0.08));
  const key = new DirectionalLight("#ffffff", 3.4);
  key.position.set(-5, 7, 2.5);
  scene.add(key);
  const fill = new DirectionalLight("#dfe7ff", 0.5);
  fill.position.set(-6, 0.5, 2);
  scene.add(fill);

  const tilt = new Group();
  tilt.rotation.x = ISO_TILT;
  const spin = buildCube();
  tilt.add(spin);
  scene.add(tilt);
  scene.add(contactShadow());

  // Spring state for the yaw angle (radians). Target is always a whole turn: that is the only
  // angle where the three slabs line up into the mark.
  const { stiffness, damping, mass } = spring.gentle;
  let yaw = arrive && !reduced() ? -0.9 : 0;
  let velocity = 0;
  let target = 0;
  let dragging = false;
  let visible = true;
  let frame = 0;
  let last = 0;

  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    const view = 3.1;
    const aspect = width / Math.max(height, 1);
    camera.left = -view * aspect;
    camera.right = view * aspect;
    camera.top = view;
    camera.bottom = -view;
    camera.updateProjectionMatrix();
    render();
  };
  const render = () => {
    spin.rotation.y = -Math.PI / 4 + yaw;
    renderer.render(scene, camera);
  };
  const settled = () => !dragging && Math.abs(yaw - target) < 0.0005 && Math.abs(velocity) < 0.001;

  const tick = (now) => {
    frame = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!dragging) {
      // Semi-implicit Euler at 1ms steps: the same physics as Motion, Reanimated and the CSS curves.
      for (let s = 0; s < Math.round(dt * 1000); s += 1) {
        const force = -stiffness * (yaw - target) - damping * velocity;
        velocity += (force / mass) * 0.001;
        yaw += velocity * 0.001;
      }
    }
    if (settled()) {
      yaw = target;
      velocity = 0;
      render();
      last = 0;
      return; // nothing left to animate: the loop stops
    }
    render();
    if (visible) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame && visible && document.visibilityState === "visible") {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  // Drag to turn. Release springs to the nearest logo pose (instantly under reduced motion).
  let startX = 0;
  let startYaw = 0;
  let lastX = 0;
  let lastT = 0;
  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    startX = lastX = event.clientX;
    startYaw = yaw;
    lastT = event.timeStamp;
    velocity = 0;
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    yaw = startYaw + (event.clientX - startX) * 0.012;
    const dt = Math.max(1, event.timeStamp - lastT) / 1000;
    velocity = ((event.clientX - lastX) * 0.012) / dt;
    lastX = event.clientX;
    lastT = event.timeStamp;
    render();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    const projected = yaw + velocity * 0.12;
    target = Math.round(projected / TURN) * TURN;
    if (reduced()) {
      yaw = target;
      velocity = 0;
      render();
      return;
    }
    wake();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  new ResizeObserver(resize).observe(stage);
  whenVisible(stage, {
    rootMargin: "0px",
    onEnter: () => {
      visible = true;
      wake();
    },
    onLeave: () => {
      visible = false;
      cancelAnimationFrame(frame);
      frame = 0;
    },
  });
  resize();
  wake();

  return {
    /** Keyboard and button alternative to dragging: one whole turn back to the mark. */
    turn(direction = 1) {
      target += TURN * direction;
      if (reduced()) {
        yaw = target;
        velocity = 0;
        render();
        return;
      }
      wake();
    },
    isAnimating: () => frame !== 0,
    pose: () => ({ yaw, target, velocity }),
  };
}
