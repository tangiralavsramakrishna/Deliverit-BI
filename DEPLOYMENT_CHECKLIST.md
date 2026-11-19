# Deployment and acceptance checklist

## Before publishing

- [ ] Node 22/npm dependencies install cleanly: `npm install`.
- [ ] Re-run fixed seed generator: `npm run generate-data`.
- [ ] All 13 analytical integrity tests pass: `npm run test:data`.
- [ ] Production build compiles: `npm run build`.
- [ ] Browser tests pass: `npx playwright install chromium && npm run test:e2e`.
- [ ] Verify no uncaught JS errors / warnings in the browser console.
- [ ] Check pages at 1440px, 768px and 390px widths.

## Each page

- [ ] Sidebar navigates to each view; back/forward and reloaded hash URLs work.
- [ ] Dates, category and region filters visibly change relevant KPIs, charts and tables.
- [ ] Presets (30/90/180/all), custom dates and Reset all work.
- [ ] Daily/weekly/monthly groupings work without missing selected GMV.
- [ ] Revenue and repeat metrics match the Definitions panel.
- [ ] Product search, sort, status filter, pagination and details panel work.
- [ ] Customer search, sort, segment filter, pagination and segment drawer work.
- [ ] Opportunity priority/search/review controls update immediately.
- [ ] Chart tooltips and interactive chart drill-downs respond.
- [ ] Global report, table, product-detail and opportunities CSV downloads contain matching values.
- [ ] No live metrics, private user records or real company claims appear.

## External hand-off

- [ ] Hosting URL uses HTTPS, served from `dist`.
- [ ] Footer and header display synthetic-data notices.
- [ ] README documents dataset, reproducible seed, metrics and scenarios.
- [ ] All feature claims are backed by completed tests (do not claim browser QA passed without running it).
