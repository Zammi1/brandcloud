#!/usr/bin/env node
// `brand-ui-lint`: the BrandCloud lint for any project. See ui-lint.mjs for rules and config.
import { main } from "./ui-lint.mjs";

main().then((code) => { process.exitCode = code; }, (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
