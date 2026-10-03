import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionList, FileDropzone, FloatingField, MilestoneSelector, RangeSlider } from "./polish";

describe("polish primitives", () => {
  it("associates floating labels and support text with the input", () => {
    render(<FloatingField label="Workspace name" hint="Visible to collaborators" required />);
    const input = screen.getByRole("textbox", { name: /Workspace name/ });
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAccessibleDescription("Visible to collaborators");
  });

  it("keeps list removal and clearing consumer owned", () => {
    const onClear = vi.fn();
    const onRemove = vi.fn();
    render(<ActionList title="Recent" items={[{ id: "one", title: "Campaign brief" }]} onClear={onClear} onRemoveItem={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Campaign brief" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onRemove).toHaveBeenCalledWith("one");
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("proposes clamped range values through native sliders", () => {
    const onValueChange = vi.fn();
    render(<RangeSlider label="Budget" min={0} max={100} value={[20, 80]} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole("slider", { name: "Minimum Budget" }), { target: { value: "90" } });
    expect(onValueChange).toHaveBeenCalledWith([79, 80]);
  });

  it("uses a labelled radio group for milestone selection", () => {
    const onValueChange = vi.fn();
    render(<MilestoneSelector legend="Monthly volume" options={[{ id: "small", label: "Small" }, { id: "large", label: "Large" }]} value="small" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Large" }));
    expect(onValueChange).toHaveBeenCalledWith("large");
  });

  it("passes selected files to the consumer without simulating upload success", () => {
    const onFiles = vi.fn();
    const { container } = render(<FileDropzone title="Upload video" description="MP4 up to 50 MB" accept="video/*" onFiles={onFiles} />);
    const file = new File(["video"], "proof.mp4", { type: "video/mp4" });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledOnce();
  });

  it("keeps upload context visible when a preview replaces the drop prompt", () => {
    render(<FileDropzone title="Upload campaign video" description="MP4 up to 50 MB" preview={{ name: "proof.mp4", src: "proof.mp4", type: "video/mp4" }} status="complete" onFiles={() => undefined} />);
    expect(screen.getByText("Upload campaign video")).toBeVisible();
    expect(screen.getByText("MP4 up to 50 MB")).toBeVisible();
    expect(screen.getByText("proof.mp4")).toBeVisible();
  });
});
