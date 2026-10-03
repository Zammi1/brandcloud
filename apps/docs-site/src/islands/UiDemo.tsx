/**
 * Live examples of every @brandcloud/ui component for the components page. One module, many small islands:
 * each <UiDemo name="..."> hydrates on its own when it scrolls into view.
 * Example copy is about a made-up workshop; nothing here sends data anywhere.
 */
import { useState, type ReactNode } from "react";
import {
  Accordion, AccordionItem, AccordionPanel, AccordionTrigger, Avatar, AvatarGroup, Badge, Button, Card, Checkbox, CheckboxGroup,
  CodeBlock, Container, Dialog, Drawer, EmptyState, FeedbackPrompt, FormDescription, FormError, FormField, FormLabel, Heading,
  Input, Menu, MenuCheckboxItem, MenuGroup, MenuItem, MenuLabel, MenuPopover, MenuSeparator, MenuTrigger, Meter, Notice, PageHeader,
  Popover, PopoverContent, PopoverTrigger, Progress, Radio, RadioGroup, Select, Separator, Skeleton, Spinner, Stack, Switch, Tabs,
  TabsList, TabsPanel, TabsTab, Textarea, Toast, Tooltip, TooltipContent, TooltipTrigger, VisuallyHidden,
} from "@brandcloud/ui";
import { TextButton } from "@brandcloud/ui/experimental/text-button";
import { HandwrittenAction } from "@brandcloud/ui/experimental/annotated-action";
import { ActionList, FileDropzone, FloatingField, MilestoneSelector, RangeSlider } from "@brandcloud/ui/experimental/polish";

const tones = ["brand", "ink", "neutral", "danger", "whatsapp"] as const;
const appearances = ["depth", "solid", "outline", "ghost"] as const;
const levels = ["sky", "blue", "navy", "pearl", "obsidian"] as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ud-row">
      <p className="ud-row__label">{label}</p>
      <div className="ud-row__items">{children}</div>
    </div>
  );
}

function ButtonDemo() {
  const [on, setOn] = useState(false);
  return (
    <div className="ud">
      {tones.map((tone) => (
        <Row key={tone} label={`tone="${tone}"`}>
          {appearances.map((a) => <Button key={a} tone={tone} appearance={a}>{a[0].toUpperCase() + a.slice(1)}</Button>)}
        </Row>
      ))}
      <Row label={'tone="level"'}>{levels.map((l) => <Button key={l} tone="level" level={l}>{l[0].toUpperCase() + l.slice(1)}</Button>)}</Row>
      <Row label="size"><Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button></Row>
      <Row label="States">
        <span className="ud-state"><Button>Default</Button><small>default</small></span>
        <span className="ud-state" data-force="hover"><Button>Hover</Button><small>hover</small></span>
        <span className="ud-state" data-force="focus"><Button>Focus</Button><small>focus-visible</small></span>
        <span className="ud-state" data-force="active"><Button>Pressed</Button><small>pressed (held)</small></span>
        <span className="ud-state"><Button loading>Saving</Button><small>loading</small></span>
        <span className="ud-state"><Button disabled>Disabled</Button><small>disabled</small></span>
      </Row>
      <Row label="Toggle (pressed prop)">
        <Button tone="neutral" appearance="outline" pressed={on} onClick={() => setOn((v) => !v)}>{on ? "Grid view on" : "Grid view off"}</Button>
      </Row>
      <Row label="As a link (render)"><Button render={<a href="#ui-button" />} tone="ink">Link styled as a button</Button></Row>
    </div>
  );
}

function FormsDemo() {
  return (
    <div className="ud ud-grid">
      <FormField label="Workshop name" description="As it appears on invoices.">
        <Input defaultValue="Merewick Cycles" />
      </FormField>
      <div className="ud-state-block" data-force="focus">
        <FormField label="Focused (shown)">
          <Input defaultValue="Focus ring shown" />
        </FormField>
      </div>
      <FormField label="Email" error="Enter a full email address, with an @ and a domain." required>
        <Input defaultValue="hello@" />
      </FormField>
      <FormField label="Account number" description="Disabled until the account is verified." disabled>
        <Input defaultValue="Pending" />
      </FormField>
      <FormField label="Service">
        <Select placeholder="Choose a service"
          options={[{ value: "safety", label: "Safety check" }, { value: "full", label: "Full service" }, { value: "wheel", label: "Wheel build", disabled: true }]} />
      </FormField>
      <FormField label="Service (invalid)" error="Choose a service to continue.">
        <Select placeholder="Choose a service" options={["Safety check", "Full service"]} />
      </FormField>
      <FormField label="Notes" description="Anything the mechanic should know.">
        <Textarea rows={3} defaultValue="Rear brake rubs on the left." />
      </FormField>
      <FormField label="Notes (invalid)" error="Keep it under 500 characters.">
        <Textarea rows={3} defaultValue="A very long note." />
      </FormField>
      <div className="ud-stack">
        <p className="ud-row__label">Built from parts</p>
        <FormLabel htmlFor="ud-parts" required>Postcode</FormLabel>
        <Input id="ud-parts" aria-describedby="ud-parts-d ud-parts-e" invalid defaultValue="MW19" />
        <FormDescription id="ud-parts-d">For the collection address.</FormDescription>
        <FormError id="ud-parts-e">That postcode looks incomplete.</FormError>
      </div>
    </div>
  );
}

function ChoicesDemo() {
  const [notify, setNotify] = useState(true);
  return (
    <div className="ud ud-grid">
      <div className="ud-stack">
        <Checkbox label="Send me a reminder the day before" defaultChecked />
        <Checkbox label="Some parts chosen" indeterminate />
        <Checkbox label="Disabled option" disabled />
      </div>
      <CheckboxGroup legend="Extras" name="extras" defaultValue={["chain"]}
        options={[{ value: "chain", label: "Chain clean" }, { value: "tyres", label: "New tyres" }, { value: "bar", label: "Bar tape", disabled: true }]} />
      <RadioGroup legend="Collection" name="collection" defaultValue="drop"
        options={[{ value: "drop", label: "I will drop it off" }, { value: "collect", label: "Collect it from me" }, { value: "post", label: "By post", disabled: true }]} />
      <div className="ud-stack">
        <p className="ud-row__label">Single radios</p>
        <Radio name="ud-solo" value="a" label="Morning slot" defaultChecked />
        <Radio name="ud-solo" value="b" label="Afternoon slot" />
      </div>
      <div className="ud-stack">
        <Switch label="Text me when it is ready" checked={notify} onCheckedChange={setNotify} />
        <Switch label="Disabled switch" disabled />
      </div>
    </div>
  );
}

function OverlaysDemo() {
  const [toast, setToast] = useState(false);
  return (
    <div className="ud">
      <Row label="Dialog">
        <Dialog trigger={<button className="ud-trigger">Open dialog</button>} title="Cancel this booking?" description="The slot goes back on sale straight away."
          actions={<Button tone="danger">Cancel booking</Button>}>
          <p>You can book again at any time.</p>
        </Dialog>
      </Row>
      <Row label="Drawer">
        <Drawer trigger={<button className="ud-trigger">Open drawer</button>} title="Booking details" side="right">
          <p>Full service, Thursday 10am. Collection from the shop.</p>
        </Drawer>
      </Row>
      <Row label="Menu">
        <Menu>
          <MenuTrigger className="ud-trigger">Booking actions</MenuTrigger>
          <MenuPopover>
            <MenuGroup>
              <MenuLabel>This booking</MenuLabel>
              <MenuItem onSelect={() => {}}>Move to another day</MenuItem>
              <MenuItem onSelect={() => {}}>Add a note</MenuItem>
              <MenuItem disabled onSelect={() => {}}>Refund (after collection)</MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuCheckboxItem defaultChecked>Send reminders</MenuCheckboxItem>
          </MenuPopover>
        </Menu>
      </Row>
      <Row label="Popover">
        <Popover>
          <PopoverTrigger className="ud-trigger">What is included?</PopoverTrigger>
          <PopoverContent>
            <p className="ud-pop">Gears and brakes adjusted, chain cleaned, tyres checked.</p>
          </PopoverContent>
        </Popover>
      </Row>
      <Row label="Tooltip">
        <Tooltip>
          <TooltipTrigger className="ud-trigger">Hover or focus me</TooltipTrigger>
          <TooltipContent side="top">Opens 8am to 6pm</TooltipContent>
        </Tooltip>
      </Row>
      <Row label="Toast">
        <Button tone="ink" onClick={() => setToast(true)}>Show a toast</Button>
        <Toast open={toast} onOpenChange={setToast} title="Booking saved" tone="success">Thursday 10am, full service.</Toast>
      </Row>
    </div>
  );
}

function StructureDemo() {
  return (
    <div className="ud">
      <Row label="Accordion">
        <Accordion defaultValue={["a"]} className="ud-wide">
          <AccordionItem value="a"><AccordionTrigger>How long does a service take?</AccordionTrigger><AccordionPanel>Most are ready the same day.</AccordionPanel></AccordionItem>
          <AccordionItem value="b"><AccordionTrigger>Do you service e-bikes?</AccordionTrigger><AccordionPanel>Yes, except the motor itself.</AccordionPanel></AccordionItem>
          <AccordionItem value="c" disabled><AccordionTrigger>Gift vouchers (disabled)</AccordionTrigger><AccordionPanel>Not yet.</AccordionPanel></AccordionItem>
        </Accordion>
      </Row>
      <Row label="Tabs">
        <Tabs defaultValue="today" className="ud-wide">
          <TabsList aria-label="Bookings">
            <TabsTab value="today">Today</TabsTab>
            <TabsTab value="week">This week</TabsTab>
            <TabsTab value="later" disabled>Later</TabsTab>
          </TabsList>
          <TabsPanel value="today"><p>Three bookings today.</p></TabsPanel>
          <TabsPanel value="week"><p>Eleven bookings this week.</p></TabsPanel>
          <TabsPanel value="later"><p>Nothing yet.</p></TabsPanel>
        </Tabs>
      </Row>
      <Row label="Separator">
        <div className="ud-wide"><p>Above the rule</p><Separator /><p>Below the rule</p></div>
        <div className="ud-inline"><span>Left</span><Separator orientation="vertical" decorative /><span>Right</span></div>
      </Row>
      <Row label="Card and Badge">
        <Card className="ud-card"><Heading as="h4" size="sm">Full service</Heading><p>Ready the same day.</p><Badge>Most booked</Badge></Card>
        <Card elevated className="ud-card"><Heading as="h4" size="sm">Safety check</Heading><p>Twenty minutes, while you wait.</p></Card>
      </Row>
      <Row label="Container, Stack, Heading">
        <Container className="ud-wide"><Stack gap="sm"><Heading as="h4" size="md">A stack with a small gap</Heading><p>Stacks space their children evenly.</p></Stack></Container>
      </Row>
      <Row label="VisuallyHidden"><Button tone="neutral" appearance="outline">Delete<VisuallyHidden> the Thursday booking</VisuallyHidden></Button></Row>
      <Row label="Avatar and AvatarGroup">
        <Avatar name="Rosa Merewick" size="sm" /><Avatar name="Tom Hale" /><Avatar name="Ade Okafor" size="lg" />
        <AvatarGroup label="Mechanics on shift"><Avatar name="Rosa Merewick" /><Avatar name="Tom Hale" /></AvatarGroup>
      </Row>
    </div>
  );
}

function FeedbackDemo() {
  const [shown, setShown] = useState(true);
  const [loading, setLoading] = useState(false);
  return (
    <div className="ud">
      <Row label="Notice">
        <div className="ud-wide ud-stack">
          <Notice headingLevel={3} tone="info" title="Opening hours change on Monday">We open at 9am from next week.</Notice>
          <Notice headingLevel={3} tone="success" title="Booking confirmed" />
          <Notice headingLevel={3} tone="warning" title="Parts on order">Your wheel arrives Friday.</Notice>
          {shown && <Notice headingLevel={3} tone="danger" title="Payment failed" dismissible onDismiss={() => setShown(false)}>Try another card.</Notice>}
        </div>
      </Row>
      <Row label="Meter">
        <div className="ud-wide ud-stack">
          <Meter label="Slots booked today" value={6} max={8} ariaValueText="6 of 8 slots booked" formattedValue="6 of 8" />
          <Meter label="Storage used" value={92} tone="warning" ariaValueText="92 percent used" />
        </div>
      </Row>
      <Row label="Loading">
        {loading ? (
          <>
            <Spinner label="Loading bookings" size="sm" />
            <Spinner label="Loading bookings" />
            <Progress value={40} ariaValueText="40 percent uploaded" aria-label="Photo upload" className="ud-progress" />
            <div className="ud-wide ud-stack"><Skeleton height={14} width="60%" /><Skeleton height={14} width="80%" /></div>
          </>
        ) : (
          <Progress value={40} ariaValueText="40 percent uploaded" aria-label="Photo upload" className="ud-progress" />
        )}
        <Button tone="neutral" appearance="outline" size="sm" onClick={() => setLoading((v) => !v)}>{loading ? "Stop the loading demo" : "Show spinners and skeletons"}</Button>
      </Row>
      <Row label="FeedbackPrompt">
        <div className="ud-wide ud-grid">
          <FeedbackPrompt headingLevel="h3" mode="binary" question="Was this page useful?" />
          <FeedbackPrompt headingLevel="h3" mode="csat" question="How was your service?" scaleLabels={{ min: "Poor", max: "Great" }} />
        </div>
      </Row>
    </div>
  );
}

function ScreensDemo() {
  return (
    <div className="ud">
      <Row label="PageHeader">
        <div className="ud-wide ud-frame">
          <PageHeader headingLevel={2} title="Bookings" meta="11 this week" description="Every booking, newest first."
            secondaryActions={<Button tone="neutral" appearance="outline" size="sm">Export</Button>} primaryAction={<Button size="sm">New booking</Button>} />
        </div>
      </Row>
      <Row label="EmptyState">
        <div className="ud-wide ud-grid">
          <EmptyState size="inline" headingLevel={3} title="No bookings yet" description="New bookings show up here." action={<Button size="sm">Add a booking</Button>} />
          <EmptyState size="inline" tone="no-results" headingLevel={4} title="No matches" description="Try a different name or date." />
        </div>
      </Row>
      <Row label="CodeBlock">
        <div className="ud-wide"><CodeBlock title="Embed code" language="HTML" code={'<script src="/booking.js" defer></script>'} /></div>
      </Row>
    </div>
  );
}

function ExperimentalDemo() {
  const [range, setRange] = useState<[number, number]>([40, 120]);
  const [milestone, setMilestone] = useState("week");
  const [items, setItems] = useState([{ id: "1", title: "Full service", description: "Thursday 10am" }, { id: "2", title: "Wheel true", description: "Friday 2pm" }]);
  return (
    <div className="ud">
      <Row label="TextButton"><p>Your booking is saved. <TextButton onClick={() => {}}>Change the time</TextButton></p></Row>
      <Row label="HandwrittenAction"><HandwrittenAction note="Takes two minutes" noteStyle="plain"><a href="#ui-experimental">Book a service</a></HandwrittenAction></Row>
      <Row label="FloatingField"><div className="ud-wide ud-grid"><FloatingField label="Postcode" error="That postcode looks incomplete."
        defaultValue="MW19" /></div></Row>
      <Row label="ActionList"><div className="ud-wide"><ActionList title="Today" items={items} onRemoveItem={(id) => setItems((list) => list.filter((i) => i.id !== id))}
        emptyMessage="Nothing booked." /></div></Row>
      <Row label="RangeSlider"><div className="ud-wide"><RangeSlider label="Price range" min={0} max={200} step={10} value={range} onValueChange={setRange} formatValue={(v) => `£${v}`}
        /></div></Row>
      <Row label="MilestoneSelector"><MilestoneSelector legend="When do you need it?" value={milestone} onValueChange={setMilestone}
        options={[{ id: "today", label: "Today" }, { id: "week", label: "This week" }, { id: "later", label: "No rush" }]} /></Row>
      <Row label="FileDropzone"><div className="ud-wide"><FileDropzone title="Photos of the bike" description="PNG or JPG. Nothing is uploaded in this demo." accept="image/*"
        onFiles={() => {}} /></div></Row>
    </div>
  );
}

const demos = {
  button: ButtonDemo,
  forms: FormsDemo,
  choices: ChoicesDemo,
  overlays: OverlaysDemo,
  structure: StructureDemo,
  feedback: FeedbackDemo,
  screens: ScreensDemo,
  experimental: ExperimentalDemo,
} as const;

export default function UiDemo({ name }: { name: keyof typeof demos }) {
  const Demo = demos[name];
  return <Demo />;
}
