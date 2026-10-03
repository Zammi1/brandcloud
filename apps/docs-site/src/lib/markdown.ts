/** A deliberately small Markdown renderer for the changelog: headings, paragraphs, lists, inline code and links. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

export function renderMarkdown(md: string, headingOffset = 1): string {
  const out: string[] = [];
  let list: string[] | null = null;
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
    if (list) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
    list = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (h) { flush(); const level = Math.min(6, h[1].length + headingOffset); out.push(`<h${level}>${inline(h[2])}</h${level}>`); }
    else if (li) { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } (list ??= []).push(li[1]); }
    else if (!line.trim()) flush();
    else if (list) list[list.length - 1] += ` ${line.trim()}`;
    else para.push(line.trim());
  }
  flush();
  return out.join("\n");
}

/** Splits YAML-ish frontmatter of a changeset: { "@scope/pkg": "major" } and the body. */
export function parseChangeset(text: string): { bumps: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return { bumps: {}, body: text };
  const bumps: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = /^\s*"?([^":]+)"?\s*:\s*(\w+)/.exec(line);
    if (kv) bumps[kv[1].trim()] = kv[2];
  }
  return { bumps, body: m[2] };
}
