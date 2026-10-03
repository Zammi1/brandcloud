# shadcn/ui parity for `@brandcloud/ui`

Use this table before copying a shadcn/ui component into a BrandCloud project. If `@brandcloud/ui` has it, import it
(`import { Accordion } from "@brandcloud/ui"` or the leaf subpath, plus `import "@brandcloud/ui/styles.css"` once). If it
does not, either use stock shadcn/ui themed by `@brandcloud/tokens/shadcn.css` (maps `--background`, `--primary`,
`--ring` and the rest of the shadcn variable contract to brand tokens), or build nothing and use the platform.

Rules that apply whichever you pick:

- React only. Astro and other frameworks use `@brandcloud/tokens` and framework-local components (see `@brandcloud/astro`).
- Never copy shadcn code into `packages/ui`. If a shadcn-only component keeps being reused, raise it as a new
  BrandCloud primitive (Base UI underneath, token CSS, test, story).
- Buttons: use `Button` even when porting shadcn markup. `variant` is accepted as a shadcn alias
  (`default`, `secondary`, `outline`, `ghost`, `destructive`) and mapped onto `tone` + `appearance`.
  shadcn's `variant="link"` is not mapped; use `TextButton` from `@brandcloud/ui/experimental/text-button`.
- No arrows inside buttons. The only icon allowed in a button is a channel glyph (WhatsApp, phone).

Status key: **Yes** = BrandCloud export covers it. **Partial** = covers the common case, gaps noted.
**shadcn** = not provided; use shadcn/ui + `@brandcloud/tokens/shadcn.css`. **Platform** = not provided; use the
native element or CSS.

| shadcn/ui | Status | Use instead | Notes |
|---|---|---|---|
| Accordion | Yes | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionPanel` | `multiple` for several open; `headingLevel` on the trigger. |
| Alert | Yes | `Notice` | Tones `info`, `success`, `warning`, `danger`; optional dismiss and actions. |
| Alert Dialog | Partial | `Dialog` with `actions` | Modal, focus trapped and restored; no dedicated `alertdialog` role yet. |
| Aspect Ratio | Platform | CSS `aspect-ratio` | |
| Avatar | Yes | `Avatar`, `AvatarGroup` | Initials fallback; `decorative` when the name is visible next to it. |
| Badge | Partial | `Badge` | Neutral pill only, no tone variants yet. |
| Breadcrumb | shadcn | | A breadcrumb with switcher menus is part of the Pro app sections. |
| Button | Yes | `Button` | `tone` brand, ink, neutral, danger, whatsapp, level; `appearance` depth, solid, outline, ghost; `level`; `size`; `loading`; `pressed`; `render` / `asChild`. |
| Button Group | Partial | a flex wrapper of `Button` | |
| Calendar | shadcn | | |
| Card | Yes | `Card` | `elevated` for raised cards. |
| Carousel | shadcn | | Avoid on marketing pages unless the content is genuinely sequential. |
| Chart | shadcn | | For a single figure use `Meter`. |
| Checkbox | Yes | `Checkbox`, `CheckboxGroup` | Native inputs; indeterminate supported. |
| Collapsible | Partial | single-item `Accordion`, or native `<details>` | |
| Combobox | shadcn | | |
| Command | shadcn | | |
| Context Menu | shadcn | | |
| Data Table | Yes |  | Density, sticky header, sort, explicit selection scope, pagination footer, stacked rows below 760 px. |
| Date Picker | Partial | `FilterDateRange` (inside ) | Native date inputs; no calendar popover. |
| Dialog | Yes | `Dialog` | |
| Drawer | Yes | `Drawer` | |
| Dropdown Menu | Yes | `Menu`, `MenuTrigger`, `MenuPopover`, `MenuItem`, `MenuCheckboxItem`, `MenuGroup`, `MenuLabel`, `MenuSeparator` | |
| Empty | Yes | `EmptyState` | Tones for empty, error and denied. |
| Field | Yes | `FormField`, `FormLabel`, `FormDescription`, `FormError` | Wires `id`, `aria-describedby`, `aria-invalid` into `Input`, `Textarea`, `Select`. |
| Form | Partial | `FormField` + native `<form>` | No schema validation layer; bring your own (for example zod) in the app. |
| Hover Card | shadcn | | `Popover` opens on click, not hover. |
| Input | Yes | `Input` | `invalid` prop. |
| Input Group | shadcn | | |
| Input OTP | shadcn | | |
| Item | Partial | `ActionList` (`@brandcloud/ui/experimental/polish`) | Experimental. |
| Kbd | Platform | `<kbd>` | |
| Label | Yes | `FormLabel` | |
| Menubar | shadcn | | |
| Native Select | Yes | `Select` | `Select` is a styled native `<select>`. |
| Navigation Menu | Partial | `Navbar` in `@brandcloud/astro` (marketing sites) | |
| Pagination | Partial |  pagination footer | No standalone pager. |
| Popover | Yes | `Popover`, `PopoverTrigger`, `PopoverContent` | |
| Progress | Yes | `Progress` (`@brandcloud/ui/loading`), `Meter` | `Meter` for allowances and usage. |
| Radio Group | Yes | `RadioGroup`, `Radio` | |
| Resizable | shadcn | | |
| Scroll Area | Platform | CSS `overflow` | |
| Select | Partial | `Select` (native) | No custom listbox select; use shadcn Select if you need rich option rendering. |
| Separator | Yes | `Separator` | `decorative` hides it from assistive technology. |
| Sheet | Yes | `Drawer`, or  for record detail |  is deep-linkable and keeps the list visible. |
| Sidebar | Partial |  (section nav), `AppShell` (experimental) | |
| Skeleton | Yes | `Skeleton` | |
| Slider | Partial | `RangeSlider` (`@brandcloud/ui/experimental/polish`) | Experimental. |
| Sonner | Partial | `Toast` | One controlled toast with timeout and dismiss; no queue or stacking. |
| Spinner | Yes | `Spinner` | Requires a `label`. |
| Switch | Yes | `Switch` | |
| Table | Yes |  | For static content tables a plain `<table>` is fine. |
| Tabs | Yes | `Tabs`, `TabsList`, `TabsTab`, `TabsPanel` | Automatic or manual activation. |
| Textarea | Yes | `Textarea` | |
| Toast | Partial | `Toast` | shadcn deprecated Toast in favour of Sonner; same note as Sonner. |
| Toggle | Yes | `Button` with `pressed` | Sets `aria-pressed`. |
| Toggle Group | Partial | several `Button pressed` | No roving focus group yet. |
| Tooltip | Yes | `Tooltip`, `TooltipTrigger`, `TooltipContent` | |
| Typography | Partial | `Heading`, `Stack`, `Container`, tokens | Marketing type scale lives in tokens (`font-size-display`, `font-size-h1` and so on). |

BrandCloud only (no shadcn equivalent): `PageHeader`, `CodeBlock`, `FeedbackPrompt`, `Meter` and the
experimental `TextButton`, `StatusPillAction` and `HandwrittenAction`.

Last checked against the shadcn/ui component list on 1 Oct 2026.
