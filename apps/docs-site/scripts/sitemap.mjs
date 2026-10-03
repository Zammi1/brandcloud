// Writes dist/sitemap.xml and dist/robots.txt after the build, from the pages that were actually built.
// The site URL comes from project.json (docsUrl). Example pair pages under /pairs/ are left out on purpose:
// half of them show the mistakes the rules describe.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "..", "dist");
const project = JSON.parse(readFileSync(path.join(here, "..", "..", "..", "project.json"), "utf8"));
const site = project.docsUrl.replace(/\/$/, "");
const skip = new Set(["_astro", "pairs"]);

const urls = [];
function walk(dir, rel) {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (rel === "" && skip.has(name)) continue;
      walk(full, `${rel}${name}/`);
    } else if (name === "index.html") {
      urls.push(`${site}/${rel}`);
    }
  }
}
walk(dist, "");
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
writeFileSync(path.join(dist, "sitemap.xml"), xml);
writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /pairs/\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`sitemap: ${urls.length} pages, robots.txt written for ${site}`);
