import { useEffect, useMemo, useState } from "react";
import * as U from "@brandcloud/ui";
import UiDemo from "../../islands/UiDemo";
import { pkg, tgz, NPM_NOTE } from "../../lib/site";

const installCommand = `pnpm add ${tgz("ui")} ${tgz("tokens")} react react-dom`;
import "./explorer.css";

type Entry = {
  name: string;
  file: string;
  text: string;
  group: string;
  demo:
    | "button"
    | "forms"
    | "choices"
    | "overlays"
    | "structure"
    | "feedback"
    | "screens"
    | "experimental";
  anchor: string;
};
type Appearance = "solid" | "depth" | "outline" | "ghost";
function Preview({
  entry,
  disabled,
  loading,
  error,
  appearance,
  theme,
}: {
  entry: Entry;
  disabled: boolean;
  loading: boolean;
  error: boolean;
  appearance: Appearance;
  theme: string;
}) {
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [sortableItems, setSortableItems] = useState([
    { id: "brief", title: "Write the brief" },
    { id: "design", title: "Design the page" },
    { id: "review", title: "Review together" },
  ]);
  const [kanbanColumns, setKanbanColumns] = useState([
    { id: "todo", title: "To do", items: [{ id: "draft", title: "Draft homepage" }] },
    { id: "doing", title: "In progress", items: [{ id: "tokens", title: "Set brand tokens" }] },
    { id: "done", title: "Done", items: [] as { id: string; title: string }[] },
  ]);
  const action = (
    <U.Button
      disabled={disabled}
      loading={loading}
      appearance={appearance}
      onClick={() =>
        setMessage("Action selected. This is a local component example.")
      }
    >
      Create project
    </U.Button>
  );
  const field = (control: React.ReactNode) => (
    <U.FormField
      label="Project name"
      description="A name your team will recognise."
      error={error ? "Enter a project name to continue." : undefined}
      disabled={disabled}
    >
      {control}
    </U.FormField>
  );
  let content;
  switch (entry.file) {
    case "drag-drop":
      content = <U.SortableList items={sortableItems} onItemsChange={setSortableItems}
        getItemLabel={(item) => item.title} renderItem={(item) => item.title}
        disabled={disabled} label="Project task order" />;
      break;
    case "sortable-table":
      content = <U.SortableTable items={sortableItems} onItemsChange={setSortableItems}
        getItemLabel={(item) => item.title} disabled={disabled} caption="Project tasks"
        columns={[{ id: "title", header: "Task", rowHeader: true }]} />;
      break;
    case "kanban":
      content = <U.KanbanBoard columns={kanbanColumns} onColumnsChange={(columns) => setKanbanColumns(columns.map((column) => ({ id: column.id, title: String(column.title), items: [...column.items] })))}
        getItemLabel={(item) => item.title} renderCard={(item) => item.title}
        disabled={disabled} label="Project progress" />;
      break;
    case "button":
      content = action;
      break;
    case "input":
    case "form-field":
      content = field(
        <U.Input placeholder="Summer campaign" disabled={disabled} />,
      );
      break;
    case "textarea":
      content = field(
        <U.Textarea
          rows={3}
          placeholder="Describe your project"
          disabled={disabled}
        />,
      );
      break;
    case "select":
      content = field(
        <U.Select
          disabled={disabled}
          placeholder="Choose a project"
          options={["Summer campaign", "Product launch", "Client website"]}
        />,
      );
      break;
    case "checkbox":
      content = (
        <U.CheckboxGroup
          legend="Include in export"
          disabled={disabled}
          defaultValue={["tokens"]}
          options={[
            { value: "tokens", label: "Design tokens" },
            { value: "components", label: "Components" },
          ]}
        />
      );
      break;
    case "radio":
      content = (
        <U.RadioGroup
          legend="Project framework"
          disabled={disabled}
          defaultValue="react"
          options={[
            { value: "react", label: "React" },
            { value: "astro", label: "Astro" },
          ]}
        />
      );
      break;
    case "switch":
      content = <U.Switch label="Show preview labels" disabled={disabled} />;
      break;
    case "dialog":
      content = (
        <U.Dialog
          portalTheme={theme}
          trigger={
            <button className="ex-trigger" disabled={disabled}>
              Open project dialog
            </button>
          }
          title="Create a project"
          description="A local example of the modal and focus behaviour."
        >
          {field(<U.Input placeholder="Project name" />)}
        </U.Dialog>
      );
      break;
    case "drawer":
      content = (
        <U.Drawer
          portalTheme={theme}
          trigger={
            <button className="ex-trigger" disabled={disabled}>
              Open project details
            </button>
          }
          title="Project details"
        >
          <p>Summer campaign</p>
          <p>Draft · Updated today</p>
        </U.Drawer>
      );
      break;
    case "menu":
      content = (
        <U.Menu>
          <U.MenuTrigger className="ex-trigger" disabled={disabled}>
            Project actions
          </U.MenuTrigger>
          <U.MenuPopover data-brand="docs" data-theme={theme}>
            <U.MenuGroup>
              <U.MenuLabel>Summer campaign</U.MenuLabel>
              <U.MenuItem
                onSelect={() =>
                  setMessage("Project duplicated in this example.")
                }
              >
                Duplicate project
              </U.MenuItem>
              <U.MenuItem disabled>Publish (requires review)</U.MenuItem>
            </U.MenuGroup>
            <U.MenuSeparator />
            <U.MenuCheckboxItem defaultChecked>Show labels</U.MenuCheckboxItem>
          </U.MenuPopover>
        </U.Menu>
      );
      break;
    case "popover":
      content = (
        <U.Popover>
          <U.PopoverTrigger className="ex-trigger" disabled={disabled}>
            What is included?
          </U.PopoverTrigger>
          <U.PopoverContent data-brand="docs" data-theme={theme}>
            <p>Tokens, React components and Astro marketing blocks.</p>
          </U.PopoverContent>
        </U.Popover>
      );
      break;
    case "tooltip":
      content = (
        <U.Tooltip>
          <U.TooltipTrigger className="ex-trigger" disabled={disabled}>
            Hover or focus for help
          </U.TooltipTrigger>
          <U.TooltipContent data-brand="docs" data-theme={theme}>
            Preview changes before publishing.
          </U.TooltipContent>
        </U.Tooltip>
      );
      break;
    case "tabs":
      content = (
        <U.Tabs defaultValue="overview">
          <U.TabsList aria-label="Project information">
            <U.TabsTab value="overview">Overview</U.TabsTab>
            <U.TabsTab value="activity" disabled={disabled}>
              Activity
            </U.TabsTab>
          </U.TabsList>
          <U.TabsPanel value="overview">
            Your project brief and latest draft.
          </U.TabsPanel>
          <U.TabsPanel value="activity">Project created today.</U.TabsPanel>
        </U.Tabs>
      );
      break;
    case "accordion":
      content = (
        <U.Accordion>
          <U.AccordionItem value="license" disabled={disabled}>
            <U.AccordionTrigger>
              Can I use these components commercially?
            </U.AccordionTrigger>
            <U.AccordionPanel>
              Yes. The public library is MIT licensed. Pro packages have a
              separate licence.
            </U.AccordionPanel>
          </U.AccordionItem>
        </U.Accordion>
      );
      break;
    case "card":
      content = (
        <U.Card>
          <U.Heading as="h4" size="sm">
            Summer campaign
          </U.Heading>
          <p>Your next project starts with a clear brief.</p>
          <U.Badge>Draft</U.Badge>
        </U.Card>
      );
      break;
    case "avatar":
      content = (
        <U.AvatarGroup label="Project team">
          <U.Avatar name="Alex Morgan" />
          <U.Avatar name="Jamie Lee" />
          <U.Avatar name="Sam Taylor" />
        </U.AvatarGroup>
      );
      break;
    case "separator":
      content = (
        <div>
          <p>Project brief</p>
          <U.Separator />
          <p>Draft and review</p>
        </div>
      );
      break;
    case "layout":
      content = (
        <U.Container>
          <U.Stack gap="sm">
            <U.Heading as="h4" size="md">
              A clear hierarchy
            </U.Heading>
            <p>Container, Stack and Heading share the same tokens.</p>
            <U.Button disabled={disabled}>
              Continue
              <U.VisuallyHidden> to the next project step</U.VisuallyHidden>
            </U.Button>
          </U.Stack>
        </U.Container>
      );
      break;
    case "meter":
      content = (
        <U.Meter
          label="Sections reviewed"
          value={6}
          max={8}
          formattedValue="6 of 8"
          ariaValueText="6 of 8 sections reviewed"
        />
      );
      break;
    case "notice":
      content = (
        <U.Notice
          headingLevel={4}
          tone={error ? "danger" : "info"}
          title={error ? "Your draft needs attention" : "Ready for review"}
        >
          {error
            ? "Add a clear audience before exporting."
            : "Review your claims and evidence before export."}
        </U.Notice>
      );
      break;
    case "toast":
      content = (
        <>
          <U.Button onClick={() => setToast(true)} disabled={disabled}>
            Show notification
          </U.Button>
          <U.Toast
            open={toast}
            onOpenChange={setToast}
            title="Example notification"
            tone={error ? "danger" : "success"}
          >
            Your changes appear here.
          </U.Toast>
        </>
      );
      break;
    case "loading":
      content = (
        <U.Stack>
          <U.Spinner label="Preparing preview" />
          <U.Progress
            value={loading ? undefined : 65}
            aria-label="Export preparation"
          />
          <U.Skeleton height={18} width="70%" />
          <U.Skeleton height={18} width="90%" />
        </U.Stack>
      );
      break;
    case "feedback-prompt":
      content = (
        <U.FeedbackPrompt
          mode="binary"
          headingLevel="h4"
          question="Was this example useful?"
          submitted={accepted}
          onSubmit={() => setAccepted(true)}
          submittedLabel="Thanks. This example keeps feedback in this page only."
        />
      );
      break;
    case "page-header":
      content = (
        <U.PageHeader
          headingLevel={2}
          title="Your projects"
          meta="3 drafts"
          description="Build, review and export your work."
          primaryAction={action}
        />
      );
      break;
    case "empty-state":
      content = (
        <U.EmptyState
          headingLevel={4}
          title="No projects yet"
          description="Start with a brief for your first project."
          action={action}
        />
      );
      break;
    case "code-block":
      content = (
        <U.CodeBlock
          language="tsx"
          title="Your first component"
          code={
            'import { Button } from "@brandcloud/ui";\n\n<Button>Create project</Button>'
          }
        />
      );
      break;
    default:
      content = <UiDemo name={entry.demo} />;
  }
  return (
    <div className="ex-live">
      {content}
      <p className="ex-feedback" role="status">
        {message}
      </p>
    </div>
  );
}

export default function ComponentExplorer({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [selected, setSelected] = useState(entries[0].name);
  const [appearance, setAppearance] = useState<Appearance>("solid");
  const [theme, setTheme] = useState("light");
  const [density, setDensity] = useState("marketing");
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState("");
  const [reset, setReset] = useState(0);
  const groups = [...new Set(entries.map((e) => e.group))];
  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (group === "All" || e.group === group) &&
          `${e.name} ${e.text} ${e.group}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [entries, query, group],
  );
  const entry = entries.find((e) => e.name === selected) || entries[0];
  const experimental = entry.demo === "experimental";
  const source = experimental
    ? `${pkg("ui")}/experimental/${entry.file}`
    : pkg("ui");
  const code = `import { ${entry.name} } from "${source}";\nimport "${pkg("tokens")}/css";\nimport "${pkg("ui")}/public.css";`;
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const initial = entries.find(
      (e) => e.anchor === hash || `preview-${e.name.toLowerCase()}` === hash,
    );
    if (initial) setSelected(initial.name);
  }, [entries]);
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied.`);
    } catch {
      setCopied("Clipboard unavailable. Select and copy the code below.");
    }
  }
  function choose(name: string) {
    setSelected(name);
    setCopied("");
    setReset((n) => n + 1);
    window.history.replaceState(null, "", `#preview-${name.toLowerCase()}`);
  }
  return (
    <section className="ex" aria-labelledby="explorer-title">
      <header className="ex-header">
        <div>
          <p className="ex-eyebrow">The public library · MIT</p>
          <h2 id="explorer-title">Find your building block.</h2>
        </div>
        <p>
          {entries.length} exports. Real components.
          <br />
          Your brand, every state.
        </p>
      </header>
      <div className="ex-search">
        <U.FormField label="Search components">
          <U.Input
            type="search"
            placeholder="Try dialog, form or loading…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </U.FormField>
        <U.FormField label="Family">
          <U.Select
            value={group}
            onValueChange={setGroup}
            options={["All", ...groups]}
          />
        </U.FormField>
      </div>
      <div className="ex-workspace">
        <nav className="ex-catalog" aria-label="Component explorer">
          <p className="ex-count" role="status">
            {filtered.length} component{filtered.length === 1 ? "" : "s"}
          </p>
          {filtered.length ? (
            filtered.map((e) => (
              <button
                type="button"
                key={e.name}
                onClick={() => choose(e.name)}
                aria-current={selected === e.name ? "true" : undefined}
              >
                <span>{e.name}</span>
                <small>{e.group}</small>
              </button>
            ))
          ) : (
            <div className="ex-empty">
              <p>No matching components.</p>
              <U.Button
                size="sm"
                onClick={() => {
                  setQuery("");
                  setGroup("All");
                }}
              >
                Clear filters
              </U.Button>
            </div>
          )}
        </nav>
        <div className="ex-inspector">
          <header className="ex-detail-head">
            <div>
              <p className="ex-eyebrow">
                {entry.group}
                {experimental ? " · Experimental" : ""}
              </p>
              <h3>{entry.name}</h3>
            </div>
            <a href={`#${entry.anchor}`}>API reference ↓</a>
          </header>
          <p>{entry.text}</p>
          <div className="ex-controls">
            <label>
              Theme
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="light">Blue surface</option>
                <option value="dark">Dark blue</option>
              </select>
            </label>
            <label>
              Density
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value)}
              >
                <option value="marketing">Comfortable</option>
                <option value="app">Compact</option>
              </select>
            </label>
            <label>
              Button appearance
              <select
                value={appearance}
                onChange={(e) => setAppearance(e.target.value as Appearance)}
              >
                {["solid", "depth", "outline", "ghost"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="ex-state-controls">
            <U.Checkbox
              label="Disabled controls"
              checked={disabled}
              onCheckedChange={setDisabled}
            />
            <U.Checkbox
              label="Loading"
              checked={loading}
              onCheckedChange={setLoading}
            />
            <U.Checkbox
              label="Error"
              checked={error}
              onCheckedChange={setError}
            />
            <button
              type="button"
              className="ex-reset"
              onClick={() => {
                setReset((n) => n + 1);
                setDisabled(false);
                setLoading(false);
                setError(false);
              }}
            >
              Reset example
            </button>
          </div>
          <div
            className="ex-stage"
            data-brand="docs"
            data-theme={theme}
            data-density={density}
            data-button-appearance={appearance}
          >
            <Preview
              key={`${entry.name}-${reset}`}
              entry={entry}
              disabled={disabled}
              loading={loading}
              error={error}
              appearance={appearance}
              theme={theme}
            />
          </div>
          <p className="ex-help">
            Interactive preview. State controls apply where the component
            supports them. Changes stay in this page.
          </p>
          <div className="ex-code-head">
            <h4>Import this component</h4>
            <U.Button
              size="sm"
              tone="neutral"
              appearance="outline"
              onClick={() => copy(code, "Import")}
            >
              Copy import
            </U.Button>
          </div>
          <pre className="ex-code" tabIndex={0}>
            <code>{code}</code>
          </pre>
          <div className="ex-code-head">
            <h4>Install after packing the repository</h4>
            <U.Button
              size="sm"
              tone="neutral"
              appearance="outline"
              onClick={() => copy(installCommand, "Install command")}
            >
              Copy install
            </U.Button>
          </div>
          <pre className="ex-code" tabIndex={0}>
            <code>{installCommand}</code>
          </pre>
          <p className="ex-feedback" role="status">
            {copied}
          </p>
          <p className="ex-help">{NPM_NOTE}</p>
          <p>
            <a href={`#${entry.anchor}`}>
              Read {entry.name} props and examples
            </a>{" "}
            · <a href="/developers/getting-started/">Installation guide</a>
          </p>
        </div>
      </div>
      <footer className="ex-footer">
        <p>Building a marketing page?</p>
        <a href="#astro-title">Explore all 13 Astro blocks below ↓</a>
      </footer>
    </section>
  );
}
