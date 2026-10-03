"use client";

import { forwardRef, useId, useState, type ForwardedRef, type HTMLAttributes, type ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./utils";

export type FeedbackPromptMode = "binary" | "csat" | "nps";
export type FeedbackPromptSubmissionValue = boolean | number;
export type FeedbackPromptHeadingLevel = "h2" | "h3" | "h4";

export interface FeedbackPromptSubmission<TValue extends FeedbackPromptSubmissionValue = FeedbackPromptSubmissionValue> {
  value: TValue;
  comment: string;
}

export interface FeedbackPromptScaleLabels {
  min: ReactNode;
  max: ReactNode;
}

export interface FeedbackPromptBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onSubmit"> {
  question: ReactNode;
  headingLevel?: FeedbackPromptHeadingLevel;
  positiveLabel?: string;
  negativeLabel?: string;
  submitLabel?: string;
  comment?: boolean;
  commentLabel?: string;
  submitted?: boolean;
  submittedLabel?: ReactNode;
  scaleLabels?: FeedbackPromptScaleLabels;
  announcementTemplate?: string;
  outOfLabel?: string;
}

export interface FeedbackPromptBinaryProps extends FeedbackPromptBaseProps {
  mode: "binary";
  value?: boolean | null;
  onValueChange?: (value: boolean) => void;
  onSubmit?: (submission: FeedbackPromptSubmission<boolean>) => void;
}

export interface FeedbackPromptCsatProps extends FeedbackPromptBaseProps {
  mode: "csat";
  value?: number | null;
  onValueChange?: (value: number) => void;
  onSubmit?: (submission: FeedbackPromptSubmission<number>) => void;
}

export interface FeedbackPromptNpsProps extends FeedbackPromptBaseProps {
  mode: "nps";
  value?: number | null;
  onValueChange?: (value: number) => void;
  onSubmit?: (submission: FeedbackPromptSubmission<number>) => void;
}

export type FeedbackPromptProps =
  | FeedbackPromptBinaryProps
  | FeedbackPromptCsatProps
  | FeedbackPromptNpsProps;

type FeedbackPromptInternalProps = FeedbackPromptBaseProps & {
  mode: FeedbackPromptMode;
  value?: FeedbackPromptSubmissionValue | null;
  onValueChange?: (value: FeedbackPromptSubmissionValue) => void;
  onSubmit?: (submission: FeedbackPromptSubmission) => void;
};

const CSAT_RATINGS = [1, 2, 3, 4, 5];
const NPS_RATINGS = Array.from({ length: 11 }, (_, index) => index);

function ratingValues(mode: FeedbackPromptMode): number[] {
  if (mode === "csat") return CSAT_RATINGS;
  if (mode === "nps") return NPS_RATINGS;
  return [];
}

function scaleTotal(mode: FeedbackPromptMode): number {
  return mode === "csat" ? 5 : 10;
}

function isValueInDomain(mode: FeedbackPromptMode, value: FeedbackPromptSubmissionValue): boolean {
  if (mode === "binary") return typeof value === "boolean";
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  if (mode === "csat") return value >= 1 && value <= 5;
  return value >= 0 && value <= 10;
}

function resolveControlledValue(
  mode: FeedbackPromptMode,
  value: FeedbackPromptSubmissionValue | null | undefined,
): FeedbackPromptSubmissionValue | null {
  if (value === null || value === undefined) return null;
  if (isValueInDomain(mode, value)) return value;
  if (process.env.NODE_ENV !== "production") {
    throw new TypeError(
      `FeedbackPrompt controlled value ${String(value)} is not valid for the "${mode}" mode.`,
    );
  }
  return null;
}

function ratingAnnouncement(
  template: string | undefined,
  outOfLabel: string,
  rating: number,
  mode: FeedbackPromptMode,
): string {
  const total = scaleTotal(mode);
  if (template === undefined) return `${rating} ${outOfLabel} ${total}`;
  return template.replace(/\{value\}/g, () => String(rating)).replace(/\{count\}/g, () => String(total));
}

export const FeedbackPrompt = forwardRef<HTMLDivElement, FeedbackPromptProps>(function FeedbackPrompt(
  props,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const {
    announcementTemplate,
    className,
    comment = false,
    commentLabel = "Anything else?",
    headingLevel = "h3",
    mode,
    negativeLabel = "No",
    onValueChange,
    onSubmit,
    outOfLabel = "out of",
    positiveLabel = "Yes",
    question,
    scaleLabels,
    submitted = false,
    submittedLabel = "Thanks for your feedback.",
    submitLabel = "Submit",
    value,
    ...rest
  } = props as FeedbackPromptInternalProps;

  const questionId = useId();
  const commentId = useId();
  const groupName = useId();
  const [internalValue, setInternalValue] = useState<FeedbackPromptSubmissionValue | null>(null);
  const [commentText, setCommentText] = useState("");
  const isControlled = value !== undefined;
  const current = isControlled
    ? resolveControlledValue(mode, value)
    : internalValue !== null && isValueInDomain(mode, internalValue)
      ? internalValue
      : null;
  const Heading = headingLevel;

  function select(next: FeedbackPromptSubmissionValue) {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  }

  function submit() {
    if (current === null) return;
    onSubmit?.({ value: current, comment: commentText });
  }

  return (
    <div ref={ref} className={cx("brand-feedback", className)} data-mode={mode} {...rest}>
      <Heading id={questionId} className="brand-feedback__question">{question}</Heading>
      {submitted ? (
        <p className="brand-feedback__submitted" role="status">{submittedLabel}</p>
      ) : (
        <>
          {mode === "binary" ? (
            <div className="brand-feedback__options" role="group" aria-labelledby={questionId}>
              <Button
                size="sm"
                tone={current === true ? "brand" : "quiet"}
                aria-pressed={current === true}
                onClick={() => select(true)}
              >
                {current === true ? <span className="brand-feedback__check" aria-hidden="true">✓</span> : null}
                {positiveLabel}
              </Button>
              <Button
                size="sm"
                tone={current === false ? "brand" : "quiet"}
                aria-pressed={current === false}
                onClick={() => select(false)}
              >
                {current === false ? <span className="brand-feedback__check" aria-hidden="true">✓</span> : null}
                {negativeLabel}
              </Button>
            </div>
          ) : (
            <div className="brand-feedback__options" role="radiogroup" aria-labelledby={questionId}>
              {scaleLabels ? <span className="brand-feedback__scale">{scaleLabels.min}</span> : null}
              {ratingValues(mode).map((rating) => {
                const selected = current === rating;
                return (
                  <label key={rating} className="brand-feedback__option" data-selected={selected || undefined}>
                    <input
                      className="brand-feedback__input"
                      type="radio"
                      name={groupName}
                      value={String(rating)}
                      checked={selected}
                      onChange={() => select(rating)}
                      aria-label={ratingAnnouncement(announcementTemplate, outOfLabel, rating, mode)}
                    />
                    <span aria-hidden="true">{rating}</span>
                    {selected ? <span className="brand-feedback__check" aria-hidden="true">✓</span> : null}
                  </label>
                );
              })}
              {scaleLabels ? <span className="brand-feedback__scale">{scaleLabels.max}</span> : null}
            </div>
          )}
          {comment ? (
            <div className="brand-feedback__comment">
              <label htmlFor={commentId}>{commentLabel}</label>
              <textarea
                id={commentId}
                rows={3}
                value={commentText}
                onChange={(event) => setCommentText(event.currentTarget.value)}
              />
            </div>
          ) : null}
          <Button size="sm" onClick={submit} disabled={current === null}>{submitLabel}</Button>
        </>
      )}
    </div>
  );
});
