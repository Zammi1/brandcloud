import {
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export type StableReactNode =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ReactElement
  | readonly StableReactNode[]
  | ReadonlySet<StableReactNode>;

export type IntrinsicReactNode =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ReactElement<{ children?: IntrinsicReactNode }, string | typeof Fragment>
  | readonly IntrinsicReactNode[]
  | ReadonlySet<IntrinsicReactNode>;

export type AccessibleTitleNode = Exclude<IntrinsicReactNode, boolean | null | undefined>;

export interface ResolvedAccessibleTitle {
  accessibleLabel: string;
  content: ReactNode;
}

export type ReactNodePolicy = "composite" | "intrinsic" | "noninteractive-intrinsic";

export interface NormalizeReactNodeOptions {
  name: string;
  policy?: ReactNodePolicy;
}

const REACT_PORTAL_TYPE = Symbol.for("react.portal");
const REACT_MEMO_TYPE = Symbol.for("react.memo");
const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
const REACT_LAZY_TYPE = Symbol.for("react.lazy");
const INTERACTIVE_ELEMENTS = new Set([
  "button",
  "details",
  "embed",
  "iframe",
  "input",
  "object",
  "select",
  "summary",
  "textarea",
]);

function fail(name: string, message: string): never {
  throw new TypeError(`${name} ${message}`);
}

function compositeKind(type: unknown): string {
  if (typeof type !== "object" || type === null) return "custom components";
  const marker = (type as { $$typeof?: unknown }).$$typeof;
  if (marker === REACT_MEMO_TYPE) return "memo components";
  if (marker === REACT_FORWARD_REF_TYPE) return "forwardRef components";
  if (marker === REACT_LAZY_TYPE) return "lazy components";
  return "custom components";
}

function assertNoninteractive(
  element: ReactElement<Record<string, unknown>, string>,
  name: string,
): void {
  const props = element.props;
  const rawTabIndex = props.tabIndex;
  const tabIndex = typeof rawTabIndex === "string" ? Number(rawTabIndex) : rawTabIndex;
  const editable = props.contentEditable;
  const interactive =
    INTERACTIVE_ELEMENTS.has(element.type)
    || (element.type === "a" && typeof props.href === "string")
    || ((element.type === "audio" || element.type === "video") && props.controls === true)
    || editable === true
    || editable === ""
    || editable === "true"
    || (typeof tabIndex === "number" && Number.isFinite(tabIndex) && tabIndex >= 0);

  if (interactive) fail(name, `must be noninteractive; found <${element.type}>.`);
}

/**
 * Captures one stable authored React tree for validation and rendering.
 * Arrays and Sets are materialized into fresh arrays. One-shot iterators are
 * rejected before `.next()` is called, so validation can never consume output.
 */
export function normalizeReactNode(
  value: StableReactNode,
  { name, policy = "composite" }: NormalizeReactNodeOptions,
): ReactNode {
  // React 18 silently omits bigint children while React 19 renders them. Capture
  // one renderer-independent scalar so the declared peer range sees one tree.
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object" || value === null) return value as ReactNode;

  if ((value as { $$typeof?: unknown }).$$typeof === REACT_PORTAL_TYPE) {
    fail(name, "must not contain a direct React portal.");
  }

  if (Array.isArray(value)) {
    let changed = false;
    const normalized = value.map((child) => {
      const next = normalizeReactNode(child, { name, policy });
      if (next !== child) changed = true;
      return next;
    });
    return changed ? normalized : value;
  }

  if (value instanceof Set) {
    return Array.from(value, (child) => normalizeReactNode(child, { name, policy }));
  }

  if (isValidElement(value)) {
    const intrinsic = value.type === Fragment || typeof value.type === "string";
    if (policy !== "composite" && !intrinsic) {
      fail(name, `must be an intrinsic authored tree; ${compositeKind(value.type)} are not supported.`);
    }
    if (policy === "noninteractive-intrinsic" && typeof value.type === "string") {
      assertNoninteractive(value as ReactElement<Record<string, unknown>, string>, name);
    }

    const props = value.props as { children?: StableReactNode };
    if (!Object.prototype.hasOwnProperty.call(props, "children")) return value;
    const children = normalizeReactNode(props.children, { name, policy });
    // Keep JSX's static-children marker intact when normalization made no
    // change. Re-cloning static siblings as one dynamic array makes React ask
    // for explicit keys even though the authored JSX is already valid.
    if (children === props.children) return value;
    return cloneElement(value, undefined, children);
  }

  const iteratorMethod = (value as { [Symbol.iterator]?: unknown })[Symbol.iterator];
  if (typeof iteratorMethod === "function") {
    const iterator = iteratorMethod.call(value) as unknown;
    if (iterator === value) {
      fail(name, "must not contain a one-shot iterator or generator; use an array or Set.");
    }
    fail(name, "must use an array or Set for collections; custom iterables are not supported.");
  }

  return value as ReactNode;
}

export function reactNodeHasVisibleText(value: ReactNode): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "bigint") return true;
  if (Array.isArray(value)) return value.some(reactNodeHasVisibleText);
  if (!isValidElement<{ children?: ReactNode }>(value)) return false;
  return reactNodeHasVisibleText(value.props.children);
}

/**
 * Resolves visible title presentation separately from its programmatic name.
 * Plain string/number titles name themselves. Rich intrinsic trees require an
 * independent scalar because authored attributes and CSS can remove their
 * descendants from the accessibility tree in ways source inspection cannot
 * prove safe.
 */
export function resolveAccessibleTitle(
  value: AccessibleTitleNode,
  accessibleLabel: string | undefined,
  name: string,
): ResolvedAccessibleTitle {
  const content = normalizeReactNode(value, { name, policy: "intrinsic" });
  if (!reactNodeHasVisibleText(content)) {
    throw new TypeError(`${name} must contain visible text.`);
  }

  if (accessibleLabel !== undefined) {
    if (typeof accessibleLabel !== "string" || accessibleLabel.trim().length === 0) {
      throw new TypeError(`${name} accessible label must be a nonempty string.`);
    }
    return { accessibleLabel: accessibleLabel.trim(), content };
  }

  if (typeof content === "string") {
    return { accessibleLabel: content.trim(), content };
  }
  if (typeof content === "number" && Number.isFinite(content)) {
    return { accessibleLabel: String(content), content };
  }

  throw new TypeError(`${name} accessible label is required for rich title content.`);
}
