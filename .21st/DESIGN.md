# BrandCloud design context

The owner's selected direction is a cobalt blue canvas and blue working surfaces, white primary actions with black labels, and white normal text. Dark mode uses deeper blue. Explicit white document panels use black text and blue actions. Customer brands remain configurable through semantic tokens.

Astro renders marketing and documentation; React islands use the public `@brandcloud/ui` primitives. Private Pro uses `@brand-pro` packages and must never enter public bundles. Reuse the native token system, buttons, form controls, overlays and layout primitives.

Drag-and-drop uses controlled SortableList, semantic SortableTable and KanbanBoard components with pinned dnd-kit sensors. Handles preserve interactive card content; pointer, touch, keyboard and Move menu paths provide equivalent movement. Applications own persistence, permissions and business constraints. Examples save only in the current browser.

The original modular-cloud logo uses path-based SVG marks and wordmarks, including monochrome and small-size variants. Prefer the white lockup on blue and the black lockup on explicit inverse white panels.

Detailed decisions and source locations are recorded in `design.json`. Claude Design originals and verification evidence are retained in the dated whole-product evidence directory.
