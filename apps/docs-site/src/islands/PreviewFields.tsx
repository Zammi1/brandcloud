/** Form fields for the brand builder preview: @brandcloud/ui inputs in their normal, invalid and disabled states. */
import { FormField } from "@brandcloud/ui/form-field";
import { Input } from "@brandcloud/ui/input";
import { Select } from "@brandcloud/ui/select";
import { Textarea } from "@brandcloud/ui/textarea";
import { Checkbox } from "@brandcloud/ui/checkbox";
import { Button } from "@brandcloud/ui/button";

export default function PreviewFields() {
  return (
    <form className="pf" aria-label="Example form fields" onSubmit={(e) => e.preventDefault()}>
      <FormField label="Your name">
        <Input defaultValue="Sam Example" autoComplete="off" />
      </FormField>
      <FormField label="Email" error="Enter a full email address, with an @ and a domain.">
        <Input defaultValue="sam@" autoComplete="off" />
      </FormField>
      <FormField label="What do you need?">
        <Select defaultValue="refresh" options={[{ value: "new", label: "A new site" }, { value: "refresh", label: "A refresh of my site" }, { value: "page", label: "One landing page" }]} />
      </FormField>
      <FormField label="Reference number" description="Disabled: filled in for you.">
        <Input defaultValue="Filled in later" disabled />
      </FormField>
      <FormField label="Message" className="pf__wide">
        <Textarea rows={3} defaultValue="A short message so the field shows real text." />
      </FormField>
      <Checkbox className="pf__wide" label="Email me about this enquiry only. You can say no and still send it." />
      <div className="pf__wide"><Button type="submit">Send enquiry</Button></div>
    </form>
  );
}
