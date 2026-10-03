import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackPrompt } from "./feedback-prompt";

describe("FeedbackPrompt", () => {
  it("renders two labelled binary actions and reports the boolean value", () => {
    const onValueChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <FeedbackPrompt mode="binary" question="Was this helpful?" onValueChange={onValueChange} onSubmit={onSubmit} />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Was this helpful?" })).toBeInTheDocument();

    const yes = screen.getByRole("button", { name: "Yes" });
    const no = screen.getByRole("button", { name: "No" });
    expect(yes).toHaveAttribute("aria-pressed", "false");
    expect(no).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(yes);
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(yes).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({ value: true, comment: "" });
  });

  it("supports localized binary labels", () => {
    render(<FeedbackPrompt mode="binary" question="Question" positiveLabel="Oui" negativeLabel="Non" />);

    expect(screen.getByRole("button", { name: "Oui" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Non" })).toBeInTheDocument();
  });

  it("renders a csat radio group of 1–5 with announced labels and captions", () => {
    render(
      <FeedbackPrompt
        mode="csat"
        question="How was your experience?"
        scaleLabels={{ min: "Very poor", max: "Very good" }}
      />,
    );

    expect(screen.getByRole("radiogroup", { name: "How was your experience?" })).toBeInTheDocument();
    for (let rating = 1; rating <= 5; rating += 1) {
      expect(screen.getByRole("radio", { name: `${rating} out of 5` })).toBeInTheDocument();
    }
    expect(screen.getByText("Very poor")).toBeInTheDocument();
    expect(screen.getByText("Very good")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "4 out of 5" }));
    expect(screen.getByRole("radio", { name: "4 out of 5" })).toBeChecked();
  });

  it("renders an nps radio group of 0–10 announced against a 10-point range", () => {
    render(<FeedbackPrompt mode="nps" question="How likely are you to recommend us?" />);

    for (let rating = 0; rating <= 10; rating += 1) {
      expect(screen.getByRole("radio", { name: `${rating} out of 10` })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("radio", { name: "10 out of 10" }));
    expect(screen.getByRole("radio", { name: "10 out of 10" })).toBeChecked();
  });

  it("localizes the out-of wording via outOfLabel", () => {
    render(<FeedbackPrompt mode="nps" question="Q" outOfLabel="van" />);

    expect(screen.getByRole("radio", { name: "7 van 10" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "7 van 11" })).not.toBeInTheDocument();
  });

  it("honors a controlled value", () => {
    const onValueChange = vi.fn();
    render(<FeedbackPrompt mode="csat" question="Q" value={3} onValueChange={onValueChange} />);

    expect(screen.getByRole("radio", { name: "3 out of 5" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "5 out of 5" }));
    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(screen.getByRole("radio", { name: "3 out of 5" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "5 out of 5" })).not.toBeChecked();
  });

  it("rejects controlled values outside the mode domain in development", () => {
    expect(() => render(<FeedbackPrompt mode="nps" question="Q" value={12} />)).toThrow(TypeError);
    expect(() => render(<FeedbackPrompt mode="csat" question="Q" value={7} />)).toThrow(TypeError);
    const incompatibleBinaryValue = 3 as unknown as boolean;
    expect(() => render(<FeedbackPrompt mode="binary" question="Q" value={incompatibleBinaryValue} />)).toThrow(
      TypeError,
    );
  });

  it("renders out-of-domain controlled values as unselected and blocks submit outside development", () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const onSubmit = vi.fn();
      render(
        <FeedbackPrompt mode="nps" question="Q" value={12} onSubmit={onSubmit} />,
      );

      for (let rating = 0; rating <= 10; rating += 1) {
        expect(screen.getByRole("radio", { name: `${rating} out of 10` })).not.toBeChecked();
      }
      const submit = screen.getByRole("button", { name: "Submit" });
      expect(submit).toBeDisabled();
      fireEvent.click(submit);
      expect(onSubmit).not.toHaveBeenCalled();

      const incompatibleBinaryValue = 3 as unknown as boolean;
      render(<FeedbackPrompt mode="binary" question="Q" value={incompatibleBinaryValue} onSubmit={onSubmit} />);
      expect(screen.getByRole("button", { name: "Yes" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "No" })).toHaveAttribute("aria-pressed", "false");
    } finally {
      process.env.NODE_ENV = previousEnv;
    }
  });

  it("clears an uncontrolled leftover value that is outside the new mode domain", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<FeedbackPrompt mode="csat" question="Q" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("radio", { name: "3 out of 5" }));
    rerender(<FeedbackPrompt mode="binary" question="Q" onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Yes" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "No" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("replaces the inputs with an acknowledgement when submitted", () => {
    render(<FeedbackPrompt mode="nps" question="Q" submitted />);

    expect(screen.getByRole("status")).toHaveTextContent("Thanks for your feedback.");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("supports a localized acknowledgement label", () => {
    render(<FeedbackPrompt mode="binary" question="Q" submitted submittedLabel="Merci pour votre avis !" />);

    expect(screen.getByRole("status")).toHaveTextContent("Merci pour votre avis !");
  });

  it("adds an optional labelled comment textarea and passes it to onSubmit", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<FeedbackPrompt mode="csat" question="Q" />);

    expect(screen.queryByLabelText("Anything else?")).not.toBeInTheDocument();

    rerender(<FeedbackPrompt mode="csat" question="Q" comment commentLabel="Anything else?" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Anything else?"), { target: { value: "Loved the flow" } });
    fireEvent.click(screen.getByRole("radio", { name: "4 out of 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({ value: 4, comment: "Loved the flow" });
  });

  it("does not submit without a selected value", () => {
    const onSubmit = vi.fn();
    render(<FeedbackPrompt mode="csat" question="Q" onSubmit={onSubmit} />);

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("supports a configurable heading level", () => {
    render(<FeedbackPrompt mode="binary" question="Q" headingLevel="h2" />);

    expect(screen.getByRole("heading", { level: 2, name: "Q" })).toBeInTheDocument();
  });

  it("builds announced labels from a localized template", () => {
    render(<FeedbackPrompt mode="csat" question="Q" announcementTemplate="{value} sur {count}" />);

    expect(screen.getByRole("radio", { name: "3 sur 5" })).toBeInTheDocument();
  });
});
