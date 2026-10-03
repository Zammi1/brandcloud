"use client";

import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Button } from "./button";
import { cx } from "./utils";

export interface FloatingFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string;
  hint?: string;
  error?: string;
}

export const FloatingField = forwardRef<HTMLInputElement, FloatingFieldProps>(function FloatingField(
  { className, error, hint, id: providedId, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? `brand-floating-field-${generatedId}`;
  const supportId = error || hint ? `${id}-support` : undefined;
  return (
    <div className={cx("brand-floating-field", className)} data-invalid={error ? "true" : undefined}>
      <input
        {...props}
        ref={ref}
        id={id}
        className="brand-floating-field__input"
        placeholder=" "
        required={required}
        aria-describedby={supportId}
        aria-invalid={error ? "true" : undefined}
      />
      <label className="brand-floating-field__label" htmlFor={id}>
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {error || hint ? (
        <span className="brand-floating-field__support" id={supportId} role={error ? "alert" : undefined}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
});

export interface ActionListItem {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  removeLabel?: string;
}

export interface ActionListTag {
  id: string;
  label: string;
  tone?: "neutral" | "accent" | "success" | "warning";
}

export interface ActionListProps extends HTMLAttributes<HTMLElement> {
  title: string;
  items: readonly ActionListItem[];
  tags?: readonly ActionListTag[];
  clearLabel?: string;
  emptyMessage?: string;
  onClear?: () => void;
  onRemoveItem?: (id: string) => void;
  onRemoveTag?: (id: string) => void;
}

export function ActionList({
  className,
  title,
  items,
  tags = [],
  clearLabel = "Clear all",
  emptyMessage = "No recent items.",
  onClear,
  onRemoveItem,
  onRemoveTag,
  ...props
}: ActionListProps) {
  return (
    <section className={cx("brand-action-list", className)} aria-label={title} {...props}>
      <header className="brand-action-list__header">
        <h2>{title}</h2>
        {onClear && items.length ? <Button size="sm" tone="quiet" onClick={onClear}>{clearLabel}</Button> : null}
      </header>
      {items.length ? (
        <ul className="brand-action-list__items">
          {items.map((item) => (
            <li key={item.id}>
              {item.icon ? <span className="brand-action-list__icon" aria-hidden="true">{item.icon}</span> : null}
              <span className="brand-action-list__copy">
                <strong>{item.title}</strong>
                {item.description ? <span>{item.description}</span> : null}
              </span>
              {onRemoveItem ? (
                <Button size="sm" tone="quiet" aria-label={item.removeLabel ?? `Remove ${item.title}`} onClick={() => onRemoveItem(item.id)}>×</Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="brand-action-list__empty">{emptyMessage}</p>}
      {tags.length ? (
        <ul className="brand-action-list__tags" aria-label={`${title} filters`}>
          {tags.map((tag) => (
            <li key={tag.id} data-tone={tag.tone ?? "neutral"}>
              <span>{tag.label}</span>
              {onRemoveTag ? <button type="button" aria-label={`Remove ${tag.label} filter`} onClick={() => onRemoveTag(tag.id)}>×</button> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export interface RangeSliderProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: readonly [number, number];
  histogram?: readonly number[];
  formatValue?: (value: number) => string;
  onValueChange: (value: [number, number]) => void;
}

export function RangeSlider({ className, label, min, max, step = 1, value, histogram = [], formatValue = String, onValueChange, ...props }: RangeSliderProps) {
  const id = useId();
  const [lower, upper] = value;
  const lowerPercent = ((lower - min) / (max - min)) * 100;
  const upperPercent = ((upper - min) / (max - min)) * 100;
  const updateLower = (next: number) => onValueChange([Math.min(next, upper - step), upper]);
  const updateUpper = (next: number) => onValueChange([lower, Math.max(next, lower + step)]);
  return (
    <div className={cx("brand-range-slider", className)} {...props}>
      <fieldset>
        <legend>{label}</legend>
        {histogram.length ? (
          <div className="brand-range-slider__histogram" aria-hidden="true">
            {histogram.map((height, index) => {
              const percent = histogram.length === 1 ? 0 : (index / (histogram.length - 1)) * 100;
              return <span key={index} data-selected={percent >= lowerPercent && percent <= upperPercent || undefined} style={{ blockSize: `${Math.max(4, Math.min(100, height * 100))}%` }} />;
            })}
          </div>
        ) : null}
        <div className="brand-range-slider__controls" style={{ "--brand-range-start": `${lowerPercent}%`, "--brand-range-end": `${upperPercent}%` } as React.CSSProperties}>
          <input id={`${id}-minimum`} type="range" min={min} max={max} step={step} value={lower} aria-label={`Minimum ${label}`} onChange={(event) => updateLower(Number(event.currentTarget.value))} />
          <input id={`${id}-maximum`} type="range" min={min} max={max} step={step} value={upper} aria-label={`Maximum ${label}`} onChange={(event) => updateUpper(Number(event.currentTarget.value))} />
        </div>
        <dl className="brand-range-slider__values">
          <div><dt>Minimum</dt><dd>{formatValue(lower)}</dd></div>
          <div><dt>Maximum</dt><dd>{formatValue(upper)}</dd></div>
        </dl>
      </fieldset>
    </div>
  );
}

export interface MilestoneOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface MilestoneSelectorProps extends Omit<HTMLAttributes<HTMLFieldSetElement>, "onChange"> {
  legend: string;
  options: readonly MilestoneOption[];
  value?: string;
  onValueChange: (value: string) => void;
}

export function MilestoneSelector({ className, legend, options, value, onValueChange, ...props }: MilestoneSelectorProps) {
  const name = useId();
  const selectedIndex = options.findIndex((option) => option.id === value);
  return (
    <fieldset className={cx("brand-milestone-selector", className)} {...props}>
      <legend>{legend}</legend>
      <ol>
        {options.map((option, index) => (
          <li key={option.id} data-complete={selectedIndex >= index || undefined} data-current={selectedIndex === index || undefined}>
            <label>
              <input type="radio" name={name} value={option.id} checked={value === option.id} disabled={option.disabled} onChange={() => onValueChange(option.id)} />
              <span className="brand-milestone-selector__marker" aria-hidden="true" />
              <strong>{option.label}</strong>
              {option.description ? <span>{option.description}</span> : null}
            </label>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}

export interface FilePreview {
  name: string;
  src?: string;
  type?: string;
}

export interface FileDropzoneProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  accept?: string;
  multiple?: boolean;
  preview?: FilePreview;
  status?: "idle" | "uploading" | "complete" | "error";
  statusMessage?: string;
  onFiles: (files: FileList) => void;
  onRemove?: () => void;
}

export function FileDropzone({ className, title, description, accept, multiple = false, preview, status = "idle", statusMessage, onFiles, onRemove, ...props }: FileDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const receive = (files: FileList | null) => { if (files?.length) onFiles(files); };
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); receive(event.dataTransfer.files); };
  const change = (event: ChangeEvent<HTMLInputElement>) => receive(event.currentTarget.files);
  return (
    <section className={cx("brand-file-dropzone", className)} data-dragging={dragging || undefined} data-status={status} {...props}>
      <div className="brand-file-dropzone__target" onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={drop}>
        {preview ? (
          <div className="brand-file-dropzone__preview">
            {preview.src && preview.type?.startsWith("video/") ? <video src={preview.src} controls preload="metadata" aria-label={`Preview of ${preview.name}`} /> : preview.src ? <img src={preview.src} alt={`Preview of ${preview.name}`} /> : null}
            <span>{preview.name}</span>
            {onRemove ? <Button size="sm" tone="quiet" onClick={onRemove} aria-label={`Remove ${preview.name}`}>Remove</Button> : null}
          </div>
        ) : (
          <label htmlFor={inputId}>
            <span className="brand-file-dropzone__upload-mark" aria-hidden="true">↑</span>
            <span className="brand-file-dropzone__browse">Choose file</span>
          </label>
        )}
        <input id={inputId} className="brand-file-dropzone__input" type="file" accept={accept} multiple={multiple} onChange={change} disabled={status === "uploading"} aria-label={title} />
      </div>
      <header className="brand-file-dropzone__header">
        <strong>{title}</strong>
        <span>{description}</span>
      </header>
      {statusMessage ? <p className="brand-file-dropzone__status" role={status === "error" ? "alert" : "status"}>{statusMessage}</p> : null}
    </section>
  );
}
