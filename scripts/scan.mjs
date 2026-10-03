#!/usr/bin/env node
/**
 * Secret and personal-data scan for this repository (run in CI and before every release).
 * Complements gitleaks/trufflehog: it also catches personal data and machine-specific details
 * that secret scanners ignore. Exits 1 on any finding.
 *
 *   node scripts/scan.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipDirs = new Set(["node_modules", "dist", ".astro", ".git", "coverage", ".vercel", "test-results", "playwright-report"]);
const binary = /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|tgz|zip|pdf|mp4|webm)$/i;
const self = new Set(["scripts/scan.mjs", "scripts/scan.test.mjs"]);

// Reserved example domains and addresses (RFC 2606, RFC 5737, Ofcom drama numbers) are allowed.
const exampleEmail = /@(?:example\.(?:com|org|net)|[a-z0-9-]+\.(?:example|invalid|test))$/i;
const rules = [
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { id: "aws-key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: "github-token", re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { id: "npm-token", re: /\bnpm_[A-Za-z0-9]{30,}\b/g },
  { id: "slack-token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "stripe-key", re: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { id: "google-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "openai-key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g },
  { id: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { id: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id: "assigned-secret", re: /\b(?:api[_-]?key|secret|token|password|passwd)\b\s*[:=]\s*["'][^"'\s]{12,}["']/gi },
  { id: "url-credentials", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@"']+:[^\s/@"']+@[^\s"']+/gi },
  { id: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, allow: (m) => exampleEmail.test(m) },
  { id: "uk-phone", re: /(?<![\w.#-])(?:\+44\s?7\d{3}|07\d{3})\s?\d{3}\s?\d{3}(?![\w-])/g, allow: (m) => /7700\s?900/.test(m) },
  { id: "tailnet-ip", re: /\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/g },
  { id: "private-ip", re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g },
  { id: "tailnet-host", re: /\b[a-z0-9-]+\.[a-z0-9-]+\.ts\.net\b/gi },
  { id: "home-path", re: /(?:\/home\/[a-z][a-z0-9_-]*\/|\/Users\/[A-Za-z][A-Za-z0-9_-]*\/|C:\\Users\\)/g },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (!binary.test(name)) yield full;
  }
}

const findings = [];
let files = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (self.has(rel)) continue;
  files++;
  const text = readFileSync(file, "utf8");
  for (const rule of rules) {
    for (const m of text.matchAll(rule.re)) {
      if (rule.allow?.(m[0])) continue;
      findings.push({ rule: rule.id, file: rel, line: text.slice(0, m.index).split("\n").length, match: m[0].slice(0, 12) + (m[0].length > 12 ? "..." : "") });
    }
  }
}

if (process.argv.includes("--json")) console.log(JSON.stringify({ files, findings }, null, 2));
else if (findings.length) console.error(findings.map((f) => `${f.file}:${f.line}  ${f.rule}  ${f.match}`).join("\n"));
console.log(`scan: ${files} text files, ${findings.length} finding(s)`);
process.exit(findings.length ? 1 : 0);
