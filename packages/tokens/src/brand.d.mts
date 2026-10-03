/** Brand derivation, browser-safe (Node built-ins load only inside loadBrandFiles). */
export type TokenSet = Record<string, string>;
export interface BrandInput {
  name: string;
  label?: string;
  accent: string;
  ink: string;
  paper: string;
  fonts?: { body?: string; display?: string };
  appearance?: "depth" | "solid";
  overrides?: { shared?: TokenSet; light?: TokenSet; dark?: TokenSet };
}
export interface ContrastCheck { fg: string; bg: string; ratio: number; need: number; pass: boolean; required: boolean }
export const DEFAULT_BRAND: "brandui";
export const BRAND_MODES: readonly ["light", "dark"];
export const LEVELS: readonly ["sky", "blue", "navy", "pearl", "obsidian"];
export const APPEARANCES: readonly ["solid", "depth"];
export const MAX_GRADIENT_HUE_SPAN: number;
export const REQUIRED_TEXT_PAIRS: ReadonlyArray<readonly [string, string, number?]>;
export const ADVISORY_PAIRS: ReadonlyArray<readonly [string, string, number?]>;
export function normaliseBrandInput(input: unknown, source?: string): BrandInput;
export function deriveBrandModes(input: BrandInput, baseModes: { light: TokenSet; dark: TokenSet }): { brand: BrandInput; modes: { light: TokenSet; dark: TokenSet } };
export function checkTokens(tokens: TokenSet, label: string): { errors: string[]; advisories: string[]; checks: ContrastCheck[] };
export function depthLabelContrast(tokens: TokenSet, size?: { height?: number; fontSize?: number; inset?: number }): { ratio: number; background: string };
export function ensureContrast(colour: string, backgrounds: string[], target: number, towards: string): string;
export function loadBrandFiles(directory: string): Promise<BrandInput[]>;
export function gradientLiterals(value: string): string[];
