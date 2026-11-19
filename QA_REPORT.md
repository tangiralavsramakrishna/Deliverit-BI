# DeliverIt BI — validation report

**Validation date:** 19 November 2026  
**Environment:** Node.js 22.16.0; local creation sandbox, no access to npm registry

## Completed and passed

- Generator executed successfully: 1,000 fictional customers, 100 products, 13,496 distinct orders, 46,096 lines, 5 categories, 4 regions and 12 months.
- Data is deterministic: a repeated generation gave the exact same file hash.
- All 13 Node analytical integrity tests passed (`npm run test:data`).
- GMV reconciles precisely with selected order line arithmetic; AOV denominator counts unique matching order IDs.
- Regional/category contribution sums reconcile to 100% without pre-rounded totals.
- Period comparisons use adjacent windows with identical numbers of inclusive days.
- RFM segment scores come from qualifying historical orders and all six illustrative segments are present in the baseline dataset.
- New/returning customer chart buckets contain no duplicate classifications within the same bucket.
- Zero-result windows are handled without divide-by-zero errors.
- CSV escaping, formula guards and UTF-8 BOM behavior tested with a simulated browser download.
- All 10 application TypeScript/TSX modules transpile without syntax diagnostics.
- A structural TypeScript check with temporary external-library declaration stubs passed, including unused identifier checks.
- Checked that all relative source imports point to existing modules.

## Not verified in this environment

- `npm install` failed due to DNS resolution failure for `registry.npmjs.org`.
- Consequently, the real third-party TypeScript definitions, Vite build, actual React/Recharts runtime and Playwright Chromium e2e tests were **not** executed.
- UI screenshots, browser-console errors, hover behavior, touch responsiveness and actual CSV download interaction **cannot be certified** until a network-connected machine runs the provided browser tests.

## Mandatory final acceptance on a network-connected machine

```bash
npm install
npm run test:data
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

Afterwards, manually review desktop and mobile screens, console errors, exported spreadsheet values and every control listed in `DEPLOYMENT_CHECKLIST.md` before publicly sharing the prototype. **The hand-off is install-ready source, not a fully browser-validated deployed build.**
