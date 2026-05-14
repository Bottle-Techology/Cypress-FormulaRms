# Redmine Work Log — FormulaRMS
**Date:** 2026-05-08
**Author:** pranuj@bottle.com.np
**Project:** FormulaRMS – QA Automation & Menu Data Setup

---

## 2026-05-07

Fixed a Cypress regression where a single-use OTP was consumed by an earlier spec, causing R01 to fail. Added a cached-token fallback and stripped the VS Code `ELECTRON_RUN_AS_NODE` flag, bringing the suite to 166/167 tests passing across 8 specs. On the data side, added options to all 20 customization groups (80+ options), applied cover images to 50/51 menu categories via loremflickr, and linked 30 items to variant and customization groups. Linked all 50 categories to menus and 204/214 items to categories. A key bug was found where the API silently ignored the `categories` field — the correct field `category_ids` was discovered by inspecting the compiled frontend JS bundle. Two items (Gyoza, Lasagna) remain unlinked.

---

## 2026-05-08

Built `scripts/assign-printers.js` to route drink categories (Cocktails, Wine, Coffee, Tea, Juices, etc.) to the Main Bar Printer and food categories to the Kitchen Printer. Initial run failed silently because the API returns categories as `{id, name}` objects instead of plain IDs; fixed with nested ID extraction. Regex false positives ("steak" matching `tea`, "chocolate" matching `cola`) were resolved with word boundaries. Final result: 52 items to Bar, 160 to Kitchen. Also fixed six broken item images (Flat White, Cold Brew, Crème Brûlée, etc.) whose loremflickr keywords returned HTTP 500; replaced with working alternatives and added a `DEAD_PATTERNS` detection list.

---

## 2026-05-12

Ran a JMeter 5.6.3 load test on the orders endpoints with 100 concurrent users; all 301 requests completed with 0% errors, 515 ms average response time, and 8.2 req/s throughput. Post-test orders were fully cleared using the bill–delete–cancel fallback chain. Audited `package.json` and added three missing scripts for `31-clear-orders.cy.js`. Registered JMeter as a devDependency via a local `file:` reference and bumped the package version to `1.1.0`. Initialised Git, created the public GitHub repository at `github.com/Pranuj10/Cypress-FormulaRms`, and added a GitHub Actions CI workflow with manual suite selection and OTP secret injection. Ran all 31 specs in full.

---

## 2026-05-13

Implemented an interactive OTP automation pipeline for the Cypress E2E suite. Added `askOtp` and `verifyOtpAndGetToken` tasks to `cypress.config.js`, wired them into the `loginViaApi` command in `commands.js`, and wrote `scripts/automate.js` — a full end-to-end runner that handles OTP login, suite selection, headed/headless Chrome execution, mochawesome report generation, and a colour-coded terminal summary in one command. Added `npm run automate:*` scripts for smoke, functional, profile, and regression suites. Ran full regression across all 34 specs (681 tests): 465 passed, 180 failed, 72% pass rate in 31 minutes. Regenerated the regression PDF report, fixing a blank-output bug caused by mixed old and new mochawesome files.

---

## 2026-05-11

Performed a comprehensive bug audit across all 28 Cypress specs, identifying 9 new application bugs (BUG-13 to BUG-21) in addition to the 12 previously reported. Key findings include: the API silently accepts negative and zero item prices (missing `MinValueValidator`), `PATCH /orders/:id/` applies no enum validation on the `status` field, the `food_type` filter returns mixed results due to a likely ORM or DISTINCT issue, and the `ordering` and `limit` query params are ignored. Unauthenticated API requests return 404 instead of 401 (root cause of 18 permission test failures), and `POST /tables/` fails silently when the undocumented `section` UUID is omitted. Updated `TEST_REPORT.md` and regenerated `TEST_REPORT.pdf` (12 KB → 16.5 KB). Also initialised the Playwright test suite with five spec files covering auth, homepage, dashboard, API health, and responsive viewports.
