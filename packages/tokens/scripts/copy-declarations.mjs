// Copies the hand-written declarations for the browser-safe brand and colour modules into dist.
import { copyFileSync } from "node:fs";
for (const name of ["brand.d.mts", "colour.d.mts"]) copyFileSync(new URL(`../src/${name}`, import.meta.url), new URL(`../dist/${name}`, import.meta.url));
