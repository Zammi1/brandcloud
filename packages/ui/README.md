# `@brandcloud/ui`

Accessible React primitives for crafted, brandable interfaces, styled only with `@brandcloud/tokens`.

Import the public root or a leaf export, and include the stylesheet once near the application root:

```tsx
import { Button } from "@brandcloud/ui/button";
import { TextButton } from "@brandcloud/ui/experimental/text-button";
import "@brandcloud/ui/styles.css";
```

## Button family

`Button` takes a colour role (`tone`), a treatment (`appearance`), an offer `level`, a `size` and `loading`:

```tsx
import { Button } from "@brandcloud/ui";

<Button>Save changes</Button>                                   {/* brand tone, appearance from the brand */}
<Button appearance="depth">Get my plan</Button>                 {/* tonal light-model gradient */}
<Button tone="ink">See the work</Button>
<Button tone="level" level="navy">Choose navy</Button>          {/* sky | blue | navy | pearl | obsidian */}
<Button tone="whatsapp"><WhatsAppIcon />Message us</Button>     {/* channel glyphs are the only icons allowed */}
<Button tone="neutral" appearance="outline" pressed>Grid view</Button>
<Button render={<Link href="/pricing" />}>See pricing</Button>   {/* or asChild */}
```

- Tones: `brand`, `ink`, `neutral`, `danger`, `whatsapp`, `level` (legacy `quiet` is neutral ghost). Appearances:
  `depth`, `solid`, `outline`, `ghost`. Sizes: `sm`, `md`, `lg`.
- When `appearance` is omitted the brand decides, in CSS: solid by default, depth inside any
  `[data-button-appearance="depth"]` ancestor (set it on `<html>` to make depth the default). The level tone is depth
  unless told otherwise.
- `variant` is a shadcn-compatible alias (`default`, `secondary`, `outline`, `ghost`, `destructive`, plus `depth`,
  `solid`, `ink`, `level`, `whatsapp`). Explicit `tone` and `appearance` win.
- Colours come from tokens only (`action-depth-*`, `action-ink*`, `whatsapp*`, `level-<name>-*`).
- No arrows inside buttons.

See `SHADCN-PARITY.md` for which export to use instead of a shadcn/ui component.

## Experimental

`TextButton` is a native, non-submitting button presented as inline text. Its action surface grows from an underline
on hover, keyboard focus and press, and it inherits typography and colour:

```tsx
<p>
  Your workspace is ready.{" "}
  <TextButton onClick={openWorkspace}>Open workspace</TextButton>
</p>
```

`StatusPillAction` and `HandwrittenAction` (`@brandcloud/ui/experimental/annotated-action`) decorate a link or button you
own without taking over routing:

```tsx
<StatusPillAction status="Booking now" active emphasis="accent">
  <a href="/enquiry" aria-label="Request details, booking now">Request details</a>
</StatusPillAction>

<HandwrittenAction note="Takes two minutes" noteStyle="handwritten" emphasis="accent">
  <a href="/memberships">View memberships</a>
</HandwrittenAction>
```

Annotations are decorative by default, so put anything that matters in the action's accessible name. Set
`statusAriaHidden={false}` or `noteAriaHidden={false}` only when the annotation should be announced. These components
are not in the stable root yet; their paths and props may change.

## Dialogs and drawers

Dialog and Drawer contain keyboard focus in both directions, manage initial focus, close on Escape, backdrop or the
close button, make the background inert and return focus to the trigger. The required `title` must be authored text
(a string, number, fragment or intrinsic elements). Rich presentation needs a separate non-empty
`titleAccessibleLabel`. Custom, memo, `forwardRef` and lazy title components are rejected because they cannot be
inspected before rendering.

`portalDataAttributes` passes data-only presentation context to the portalled root. Dialog and Drawer stack with the
`--brand-layer-modal` custom property (fallback `50`); override it at the portal context when you integrate with an
application shell.

Slots accept ordinary composite elements. Direct portals inside a slot are rejected before rendering; a component that
creates its own portal after rendering owns that overlay's focus, dismissal and stacking. Collections in slots must be
arrays or `Set` values; one-shot iterators are rejected.

## Drag and drop

`SortableList`, `SortableTable` and `KanbanBoard` (leaf exports `@brandcloud/ui/drag-drop`, `/sortable-table`,
`/kanban`) are built on dnd-kit. They work with mouse, pen, touch and keyboard.

They are fully controlled. You pass the current order and save the new one in the callback. Nothing moves until you
do. Every callback also gets the move that caused it, so you can send a small PATCH and skip resending the whole list:

```tsx
import { SortableList, SortableTable, KanbanBoard } from "@brandcloud/ui";

<SortableList
  label="Checklist"
  items={steps}                                   // T extends { id: string }
  getItemLabel={(step) => step.title}             // plain text for announcements and handle labels
  renderItem={(step, { dragging }) => <span>{step.title}</span>}
  onItemsChange={(next, move) => {                // move: { id, fromIndex, toIndex }
    setSteps(next);
    api.reorder(move.id, move.toIndex);
  }}
  empty={<EmptyState size="inline" title="No steps yet" />}
/>

<SortableTable
  caption="Pipeline priority"
  items={leads}
  getItemLabel={(lead) => lead.company}
  columns={[
    { id: "company", header: "Company", rowHeader: true },
    { id: "stage", header: "Stage", cell: (lead) => <Badge>{lead.stage}</Badge> },
    { id: "value", header: "Value", align: "end", cell: (lead) => money(lead.value) },
  ]}
  onItemsChange={(next, move) => setLeads(next)}
/>

<KanbanBoard
  label="Production board"
  columns={columns}                               // [{ id, title, items, label?, description?, disabled? }]
  getItemLabel={(card) => card.title}
  renderCard={(card) => <CardSummary card={card} />}
  canMove={(move, card) => move.toColumnId !== "done" || card.approved}
  onColumnsChange={(next, move) => {              // move: { itemId, fromColumnId, fromIndex, toColumnId, toIndex }
    setColumns(next);
    api.moveCard(move);
  }}
/>
```

- **IDs.** Each item needs a non-empty, stable `id` that is unique in the collection. On a Kanban board that means
  unique across all columns, and column IDs must be unique too. Duplicate or empty IDs throw, so the wrong record
  never moves silently.
- **Keyboard.** Every item has a grip button (`DragHandle`). Space or Enter picks the item up, the arrow keys move it,
  Space or Enter drops it and Escape cancels. Alt with an arrow key moves it one place without picking it up. On a
  board, Alt+Left and Alt+Right move a card to the next column that accepts cards. Each Kanban card also has a
  **Move** menu: up, down, or to any other column. After a keyboard or menu move, focus goes back to the moved
  item's handle.
- **Announcements.** One polite live region reports pick-up, position changes, drop, cancel, refused moves and
  keyboard moves, by name and position ("Dropped Acme at position 2 of 3."). To translate or reword the text, pass
  `messages` (`defaultSortableMessages` and `defaultKanbanMessages` show every key).
- **Fields inside items.** `dragFrom="handle"` (the default for lists and tables) starts drags only from the grip.
  `dragFrom="item"` (the default for Kanban cards) lets the user drag from anywhere on the item. Inputs, textareas,
  selects, buttons, links, labels and anything marked `[data-no-drag]` never start a drag. On touch screens the user
  presses and holds the item to drag, so the page still scrolls normally. Typing Space in a field never picks
  the item up.
- **Placement.** `handlePlacement="start" | "end" | "custom"` (list and table) and `cardActions="auto" | "custom"`
  (Kanban) control where the built-in controls appear. With `custom`, put `state.handle`, `state.moveMenu`, or your own
  element with `{...state.handleProps}` wherever you want in `renderItem`, `renderCard` or a column `cell`. List items
  also get `moveBackward`/`moveForward`, and Kanban cards get `moveTo(columnId, index?)`. These run the same
  validation, callback and announcement as a drag.
- **Disabled and empty.** Use `disabled` to lock the whole component and `isItemDisabled`/`isRowDisabled` to lock
  single items. A Kanban column with `disabled: true` keeps its cards and accepts no drops. An empty list shows
  `empty`, and an empty table shows it in a cell that spans every column. An empty Kanban column stays a visible drop
  target; replace its text with `columnEmpty`.
- **Tables stay tables.** `SortableTable` renders `<table>`, `<caption>`, `<th scope="col">` and optional
  `<th scope="row">` cells. Without a `cell` renderer a column shows `row[column.id]`.
- **Building your own.** `drag-drop` also exports `moveItem`, `validateSortableIds`, `isInteractiveDragTarget`, the
  `InteractiveSafePointerSensor`/`InteractiveSafeTouchSensor` pair, `useDragSensors`, `restrictToAxis` and
  `useLiveAnnouncer`, so a custom dnd-kit layout behaves like the built-in components. `kanban` exports the pure
  `moveKanbanCard` and `locateKanbanCard` for server-side or optimistic updates.
- **Styling.** Classes are `brand-sortable*`, `brand-sortable-table*`, `brand-kanban*` and `brand-drag-handle`, and the
  state attributes are `data-dragging`, `data-over`, `data-disabled` and `data-empty`. Drop targets and dragged items
  use the blue info surfaces, and the Move button uses the neutral ghost `.brand-button`. You can tune
  `--brand-kanban-column-min` and `--brand-sortable-grid-min`. Motion stops when the user prefers reduced motion.

## React versions

Works with React 18.2 and 19 (`react` and `react-dom` as peers). The repository's consumer fixtures build packed
tarballs in fresh Vite (React 18 and 19) and Next.js 15 apps. Astro sites should use `@brandcloud/astro` instead of this
package.
