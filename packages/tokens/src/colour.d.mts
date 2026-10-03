/** Colour helpers used by the brand builder and the lint (sRGB and OKLCH, WCAG 2.2 contrast). */
export interface Rgba { r: number; g: number; b: number; alpha: number }
export function parseColour(value: string): Rgba | undefined;
export function isColour(value: string): boolean;
export function toHex(colour: Rgba): string;
export function withAlpha(colour: string, alpha: number): string;
export function composite(foreground: Rgba, backdrop: Rgba): Rgba;
export function relativeLuminance(colour: string): number;
/** WCAG 2.2 contrast ratio; translucent colours are composited on `backdrop` first. */
export function contrastRatio(foreground: string, background: string, backdrop?: string): number | undefined;
export function toOklch(colour: string | Rgba): { l: number; c: number; h: number } | undefined;
export function fromOklch(oklch: { l: number; c: number; h: number }): string;
export function shiftLightness(colour: string, delta: number): string;
export function mix(a: string, b: string, amount: number): string;
export function hslHue(colour: string): number | undefined;
export function hueSpan(colours: readonly string[]): number;
export function colourLiterals(cssValue: string): string[];
