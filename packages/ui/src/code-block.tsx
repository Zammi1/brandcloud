"use client";

import { forwardRef, useEffect, useId, useRef, useState, type HTMLAttributes } from "react";
import { cx } from "./utils";

export type CodeBlockCopyResult = "copied" | "failed";

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  /** The exact text that is shown and copied. */
  code: string;
  /** Visible heading for the block, for example "Embed code". */
  title?: string | undefined;
  /** Short language label, for example "HTML". */
  language?: string | undefined;
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean | undefined;
  copyLabel?: string | undefined;
  copiedLabel?: string | undefined;
  copyFailedLabel?: string | undefined;
  /** Called after each copy attempt. */
  onCopy?: ((result: CodeBlockCopyResult) => void) | undefined;
  /** How long the copied confirmation stays, in milliseconds. */
  resetAfterMs?: number | undefined;
}

function selectContents(element: HTMLElement | null) {
  if (!element) return;
  const selection = element.ownerDocument.defaultView?.getSelection();
  if (!selection) return;
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    className,
    code,
    copiedLabel = "Copied",
    copyFailedLabel = "Copy failed. Select the code and copy it manually.",
    copyLabel = "Copy",
    language,
    onCopy,
    resetAfterMs = 2000,
    title,
    wrap = false,
    ...props
  },
  ref,
) {
  const titleId = useId();
  const codeRef = useRef<HTMLElement>(null);
  const [result, setResult] = useState<CodeBlockCopyResult | null>(null);

  useEffect(() => {
    if (result !== "copied") return undefined;
    const timer = setTimeout(() => setResult(null), resetAfterMs);
    return () => clearTimeout(timer);
  }, [result, resetAfterMs]);

  async function copy() {
    let next: CodeBlockCopyResult = "failed";
    try {
      const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === "function") {
        await clipboard.writeText(code);
        next = "copied";
      }
    } catch {
      next = "failed";
    }
    if (next === "failed") selectContents(codeRef.current);
    setResult(next);
    onCopy?.(next);
  }

  const name = title ?? (language ? `${language} code` : "Code");

  return (
    <div ref={ref} className={cx("brand-code-block", className)} data-wrap={wrap || undefined} {...props}>
      <div className="brand-code-block__header">
        <div className="brand-code-block__heading">
          {title !== undefined ? <span id={titleId} className="brand-code-block__title">{title}</span> : null}
          {language !== undefined ? <span className="brand-code-block__language">{language}</span> : null}
        </div>
        <button
          type="button"
          className="brand-code-block__copy"
          onClick={copy}
          aria-label={result === "copied" ? `${copiedLabel}: ${name}` : `${copyLabel} ${name}`}
          data-result={result ?? undefined}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {result === "copied" ? (
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            ) : (
              <>
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2" />
              </>
            )}
          </svg>
          <span aria-hidden="true">{result === "copied" ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <pre
        className="brand-code-block__pre"
        role="region"
        tabIndex={0}
        aria-label={title !== undefined ? undefined : name}
        aria-labelledby={title !== undefined ? titleId : undefined}
      >
        <code ref={codeRef}>{code}</code>
      </pre>
      <p className="brand-code-block__status" role="status" aria-live="polite" data-result={result ?? undefined}>
        {result === "copied" ? copiedLabel : result === "failed" ? copyFailedLabel : ""}
      </p>
    </div>
  );
});
