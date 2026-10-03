# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 1.x (once released) | Yes |
| 0.9.x (pre-release) | No |

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability reporting on this repository ("Report a
vulnerability" under the Security tab). Include what you found, how to reproduce it, and the impact you expect.

We aim to acknowledge a report within 3 working days and to give a status update at least every 7 days until it is
resolved. We will credit you in the release notes unless you ask us not to.

## What is in scope

The packages (`@brandcloud/tokens`, `@brandcloud/ui`, `@brandcloud/astro`, `@brandcloud/motion`, `@brandcloud/antipatterns`), their
build scripts and the documentation site. The detector renders pages you give it in headless Chromium: run it only on
pages you trust or inside a sandbox.

## Supply chain

From 1.0.0, releases will be published from CI with npm provenance, and maintainers will use two-factor authentication on npm and GitHub.
