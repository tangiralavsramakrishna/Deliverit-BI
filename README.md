# DeliverIt BI — independent sales analytics prototype

**A fully coded, responsive React + TypeScript portfolio prototype for DeliverIt by Urban Harvest.** It demonstrates the difference between reporting a metric and proposing a decision. All customer, order, region, SKU, price, performance and recommendation values are **entirely synthetic and illustrative**. This project is **independent** and does **not** represent real Urban Harvest operations, data, views or an official DeliverIt product.

## Quick start

Requires Node.js **22+** and npm with internet access for the initial dependency installation.

```bash
npm install
npm run generate-data
npm run dev
```

Open the local URL printed by Vite (normally **http://localhost:5173**). The repository ships with the generated, reproducible JSON already included, so running the generator is optional.

To build and preview the production bundle:

```bash
npm run build
npm run preview
```

All runtime calculations use local data. **No backend, API keys, credentials, paid services, external analytics platforms or database are needed.** Node/npm and internet connectivity are only needed to install build dependencies.

## Four fully implemented views

| View | Capabilities |
|---|---|
| **Sales overview** | Six KPIs (GMV, unique orders, AOV, active customers, repeat customer rate and GMV growth), actionable management narrative, revenue and order trends, category contribution, region donut, new/returning purchasing customers, top SKUs. |
| **Product performance** | Product and category KPIs, top 10 SKUs by GMV and units, filtered product trends, sortable/searchable/paginated 100-SKU table, status filter and clickable product-detail drawer with individual trend, regional share, recent order lines and CSV. |
| **Customer insights** | As-of customer base, period-active customers, repeat rate, period GMV per active customer, prior-cohort retention, acquisition/return trends, frequency distribution, six rule-based RFM segments, customer GMV concentration, sortable/searchable/segment-filtered customer table, segment-detail drawers and CSV. |
| **Growth opportunities** | Seven deterministic rule types: product decline, slowing accounts, basket cross-sell, category concentration, regional weakness, customer reactivation, basket-size improvement. Cards show observed problem, exact synthetic evidence, a separately labeled assumption-based scenario and recommended next action. Includes priority/search filters, review toggles, methodology and CSV. |

Global controls on **every view**: date presets (30 days, 90 days, 180 days, all history), custom start/end date, category, region, daily/weekly/monthly trend grouping, reset, methodology drawer, page-relevant report export. Sidebar uses hash routes (`#overview`, `#products`, `#customers`, `#opportunities`); browser history and direct-link navigation work, including on static hosts. Mobile navigation is collapsible.

### What is actually calculated

Source-of-truth relationships:

```text
Customer (CUST-XXXX) ─┐
                      ├── Order (ORD-XXXXXX) ── OrderItem (LINE-XXXXXXX) ── Product (SKU-XXX)
Region (North/South/  │             date              quantity × unitPriceCents
East/West) ──────────┘
```

The synthetic data contains:

- **1,000** fictional customers with anonymous customer IDs;
- **100** products, exactly 20 in each of 5 categories;
- **4** geographic regions (North, South, East, West); 
- **13,496** orders containing **46,096** order lines;
- **12 months**, from **2025-11-01 to 2026-10-31** inclusive;
- synthetic seasons, different customer order-frequency profiles, diverse SKU demand, repeated orders, cross-category baskets, weakening and strengthening SKUs;
- deterministic seed **24112026**, reproducible with `npm run generate-data`.

**Currency:** Synthetic Indian rupees (₹ / INR). Stored prices are integral paise (cents); UI formatting converts to INR at the last step. No genuine product pricing is implied.

### Metric definitions / caveats

| Metric | Definition |
|---|---|
| GMV | `Σ (order line quantity × order line price in paise)`, over matching lines. Excludes taxes, discounts, shipping and refunds by construction. |
| Orders | Distinct order IDs having ≥1 selected line; on category filters, only the selected lines' GMV is included. |
| AOV | Matching-line GMV ÷ matching distinct order IDs. |
| Active customers | Distinct customer IDs having ≥1 matching order in the selected window. |
| Repeat customer rate | Active IDs with ≥2 distinct matching order IDs in the window ÷ active IDs in the window. |
| Revenue growth | `(current GMV − preceding window GMV) / preceding window GMV`; windows have equal numbers of inclusive days, do not overlap, and must both be supported by the 12-month dataset. No fabricated baseline for the full-history selection. |
| Customer retention | IDs from the *previous equal-length cohort* that repurchase in the current period ÷ customers in the previous cohort. A zero previous cohort produces N/A. |
| New customer | The customer's first matching historical order falls in the selected bucket/window, scoped by category and region. An account can count as new to one category even if it purchased a different category earlier. |
| RFM / customer base | Snapshot as of selected **end date**, on historical matching order lines from dataset start through that date. Customer table **order count, period GMV and period AOV** are based on the selected date window; the segment and last-purchase date are as-of snapshot properties. |
| Recency | Days between latest historical matching order and selected date-range end. Score 5 for ≤14 days, 4 for ≤30, 3 for ≤60, 2 for ≤120, otherwise 1. |
| Frequency / monetary | Historical distinct-order frequency and GMV ranked into quintile-based 1–5 scores (ties are assigned by threshold comparison). |
| Segments | Champions: R≥4,F≥4,M≥4; Loyal: R≥3,F≥4; New: R≥4,F≤2; Potential Loyalists: R≥4,F≥3; At Risk: R≤2 and (F≥3 or M≥4); remaining: Hibernating. Rules are evaluated in that priority order. |
| Contributions | Exact category/region GMV ÷ total matching GMV, ensuring 100% before 1-decimal UI rounding. |

The methodology is also accessible through **Definitions** inside the application.

### Insights are not an AI claim

The opportunities engine in `src/lib/analytics.ts` uses deterministic rules. It reports observations from generated records; future *impacts* are **scenario arithmetic only**, based on explicitly stated hypothetical rates (e.g. 10% recovery, 3% AOV uplift). **Do not add impact scenarios together**: they can overlap. No correlation is presented as proven causation, and there is no underlying predictive model or claimed AI.

## Project structure

```text
├── .github/workflows/ci.yml       # Data tests and production build (when dependencies available)
├── e2e/dashboard.spec.ts           # Optional Playwright browser tests
├── scripts/generate-data.mjs       # Fixed-seed B2B data generator
├── src/
│   ├── data/synthetic.json         # Pre-generated connected source dataset
│   ├── lib/analytics.ts            # Typed, pure calculation and rule engine
│   ├── components/
│   │   ├── Layout.tsx              # Sidebar, navigation, global filters, methodology
│   │   ├── Viz.tsx                 # Recharts, KPI cards and chart widgets
│   │   └── TableTools.tsx          # Table sorting, search and pagination controls
│   ├── pages/
│   │   ├── Overview.tsx
│   │   ├── Products.tsx
│   │   ├── Customers.tsx
│   │   └── Opportunities.tsx
│   ├── App.tsx                      # Routing, shared state, cross-page exports
│   ├── main.tsx
│   └── index.css                   # Tailwind + design tokens
├── tests/analytics.test.mjs        # 13 executable integrity and analytics tests
├── playwright.config.ts
├── index.html
├── vite.config.ts
├── tsconfig*.json
└── package.json
```

## Testing / quality assurance

**Pure data and calculation tests (Node 22, no npm packages required):**

```bash
npm run test:data
```

The suite tests deterministic generation, required dimensions, relational keys, exact GMV/AOV/unique-order arithmetic, repeat denominators, 100% contributions, category/region filtering, comparison-window boundaries, chart bucketing, product/customer GMV reconciliation, RFM scores, exclusive new/returning classifications per bucket, customer order-frequency histograms, opportunity-rule evidence, empty selections, and correctly escaped UTF-8 CSV export. A successful run should show `13` tests passed.

**Build/type-check:**

```bash
npm run build
```

**Browser interaction checks (optional Playwright):**

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright suite exercises all four routes and browser history, category/region filtering, reset, all trend groupings, product search and sorting, product drawer and status filter, segment details, review marks, CSV downloads, definitions modal, mobile navigation and uncaught page exceptions. You can also manually verify charts and table values before sharing the demo.

> **Environment note for this deliverable:** The generator and 13 calculation tests ran successfully, and the TS/TSX files passed a syntax-transpilation and structural audit with temporary interface stubs. This creation environment could not resolve `registry.npmjs.org`, so actual dependency installation, Vite production build, Playwright browser interaction tests and browser-console validation **could not be completed here**. The code is provided as an install-ready project, **not as a browser-verified build**. Run the build and browser tests on a network-connected machine before presenting it as a completed deployment.

## Publish to Vercel

1. Upload the directory to a GitHub repository (keep `src/data/synthetic.json` committed).
2. Import the repository into [Vercel](https://vercel.com/new).
3. Set **Framework preset: Vite**, **Root directory: repository root**, **Build command: `npm run build`**, and **Output directory: `dist`**.
4. Set **Node.js version to 22**, if not already selected.
5. Do **not** add secrets, API keys or server-side environment variables. Deploy.
6. Test all hash links, filters, chart hovers, drawers and CSV exports on the public URL. Because navigation uses hash routes, no server-side rewrite rule is required.

## Publish to Netlify

1. Push the directory to a GitHub repository, then **Add new site → Import an existing project** in [Netlify](https://app.netlify.com/).
2. Set **Build command: `npm run build`** and **Publish directory: `dist`**. Use Node 22 (`NODE_VERSION=22`, if necessary).
3. Deploy; no backend configuration or environment variables are needed.
4. Check all four hash routes and sample download actions after deployment.

You can also run `npm run build` locally and manually upload `dist/` to Netlify's deploy area.

## Responsible presentation

Include the note **“Independent prototype; all data is synthetic, not Urban Harvest performance”** whenever you share a preview with a recruiter or hiring manager. Do not use an official company logo, private customer information or unsourced operational claims. This work illustrates analytics implementation and business reasoning, not access to internal systems.
