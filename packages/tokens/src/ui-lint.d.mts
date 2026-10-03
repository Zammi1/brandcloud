export interface Violation {
  rule: string;
  line: number;
  excerpt: string;
}

export type RuleSetting = boolean | { max?: number; maxHueSpan?: number };

export interface UiLintConfig {
  include?: string[];
  exclude?: string[];
  tokenFiles?: string[];
  baseline?: string;
  extensions?: string[];
  rules?: { [rule: string]: RuleSetting };
  maxLineLength?: number;
  maxHueSpan?: number;
  tokens?: boolean | { brand?: string; mode?: string };
  vars?: { [name: string]: string };
}

export type UiLintCheck = (root: string, config: UiLintConfig) => Promise<{ [file: string]: Violation[] }> | { [file: string]: Violation[] };

export interface UiLintSetup {
  defaults?: UiLintConfig;
  checks?: UiLintCheck[];
  rules?: string[];
  description?: string;
  cwd?: string;
}

export declare const CORE_RULES: string[];
export declare const DEFAULT_CONFIG: UiLintConfig;
export declare const DEFAULT_MAX_LINE_LENGTH: number;
export declare const DEFAULT_MAX_HUE_SPAN: number;
export declare function resolveConfig(input?: UiLintConfig): UiLintConfig & { maxLineLength: number; maxHueSpan: number };
export declare function gradientHueSpan(body: string): number;
export declare function lintText(text: string, relativePath: string, options?: UiLintConfig & { tokenFile?: boolean }): Violation[];
export declare function collect(root: string, config?: UiLintConfig, checks?: UiLintCheck[]): Promise<{ [file: string]: Violation[] }>;
export declare function countByRule(results: { [file: string]: Violation[] }): { [file: string]: { [rule: string]: number } };
export declare function compareWithBaseline(
  counts: { [file: string]: { [rule: string]: number } },
  baselineFiles: { [file: string]: { [rule: string]: number } },
  rules?: string[],
): {
  regressions: { file: string; rule: string; now: number; allowed: number }[];
  improvements: { file: string; rule: string; now: number; allowed: number }[];
};
export declare function loadConfig(root: string, configPath?: string, defaults?: UiLintConfig): UiLintConfig;
export declare function parseArgs(argv: string[], cwd?: string): { root: string; config?: string; baseline?: string; update: boolean; allowIncrease: boolean; json: boolean };
export declare function main(argv?: string[], log?: (line: string) => void, setup?: UiLintSetup): Promise<number>;
export declare function resolveVars(body: string, vars?: { [name: string]: string }): string;
export declare function tokenVars(manifest: unknown, selection?: { brand?: string; mode?: string }): { [name: string]: string };
