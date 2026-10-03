import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "./accordion";
import { Avatar, AvatarGroup, avatarInitials } from "./avatar";
import { Separator } from "./separator";

function Faq(props: { multiple?: boolean; onValueChange?: (value: string[]) => void; defaultValue?: string[] }) {
  return (
    <Accordion {...props}>
      <AccordionItem value="price">
        <AccordionTrigger>How much does it cost?</AccordionTrigger>
        <AccordionPanel>Prices start at the Foundation level.</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="time">
        <AccordionTrigger headingLevel={4}>How long does it take?</AccordionTrigger>
        <AccordionPanel>Most builds take two weeks.</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="locked" disabled>
        <AccordionTrigger>Locked question</AccordionTrigger>
        <AccordionPanel>Hidden.</AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("renders headed triggers that toggle their panels", () => {
    const onValueChange = vi.fn();
    render(<Faq onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button", { name: "How much does it cost?" });
    expect(trigger.closest("h3")).not.toBeNull();
    expect(screen.getByRole("button", { name: "How long does it take?" }).closest("h4")).not.toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Prices start at the Foundation level.")).toBeVisible();
    expect(onValueChange).toHaveBeenLastCalledWith(["price"]);
  });

  it("opens one item at a time unless multiple is set", () => {
    const onValueChange = vi.fn();
    render(<Faq defaultValue={["price"]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "How long does it take?" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["time"]);
  });

  it("keeps several items open with multiple", () => {
    const onValueChange = vi.fn();
    render(<Faq multiple defaultValue={["price"]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "How long does it take?" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["price", "time"]);
  });

  it("does not open disabled items", () => {
    render(<Faq />);
    const locked = screen.getByRole("button", { name: "Locked question" });
    fireEvent.click(locked);
    expect(locked).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Avatar", () => {
  it("derives initials", () => {
    expect(avatarInitials("Ada Byron")).toBe("AB");
    expect(avatarInitials("  grace ")).toBe("G");
    expect(avatarInitials("Mary Ann Evans")).toBe("ME");
    expect(avatarInitials("")).toBe("?");
  });

  it("is a labelled image with an initials fallback", () => {
    render(<Avatar name="Ada Byron" size="lg" />);
    const avatar = screen.getByRole("img", { name: "Ada Byron" });
    expect(avatar).toHaveAttribute("data-size", "lg");
    expect(avatar).toHaveTextContent("AB");
  });

  it("can be decorative next to a visible name", () => {
    const { container } = render(<Avatar name="Ada Byron" decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector(".brand-avatar")).toHaveAttribute("aria-hidden", "true");
  });

  it("groups avatars under a label", () => {
    render(
      <AvatarGroup label="Workspace members">
        <Avatar name="Ada Byron" />
        <Avatar name="Alan Turing" />
      </AvatarGroup>,
    );
    expect(screen.getByRole("group", { name: "Workspace members" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });
});

describe("Separator", () => {
  it("is a real separator by default", () => {
    render(<Separator orientation="vertical" />);
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveClass("brand-separator");
  });

  it("can be purely decorative", () => {
    const { container } = render(<Separator decorative />);
    expect(screen.queryByRole("separator")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveAttribute("data-orientation", "horizontal");
  });
});
