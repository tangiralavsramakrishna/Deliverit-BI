import {test,expect,type Page} from '@playwright/test';
const nav=(page:Page)=>page.getByRole('navigation',{name:'Main navigation'});
test.beforeEach(async({page})=>{await page.goto('/');});

test('four functional pages and browser history navigation',async({page})=>{
 await expect(page.getByRole('heading',{name:'Sales overview'})).toBeVisible();
 for(const [label,heading] of [['Product performance','Product performance'],['Customer insights','Customer insights'],['Growth opportunities','Growth opportunities'],['Sales overview','Sales overview']]){
   await nav(page).getByRole('button',{name:new RegExp(label)}).click();
   await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
 }
 await page.goBack();
 await expect(page.getByRole('heading',{name:'Growth opportunities'})).toBeVisible();
});
test('global category and region filters update GMV and reset works',async({page})=>{
 const kpi=page.getByText('Gross Merchandise Value',{exact:true}).locator('xpath=../following-sibling::div[1]');
 const first=await kpi.textContent();
 await page.getByLabel('Category filter').selectOption('Staples');
 await page.getByLabel('Region filter').selectOption('South');
 await expect(page.getByLabel('Category filter')).toHaveValue('Staples');
 await expect(page.getByLabel('Region filter')).toHaveValue('South');
 await expect(kpi).not.toHaveText(first??'');
 await page.getByRole('button',{name:/Reset/}).click();
 await expect(page.getByLabel('Category filter')).toHaveValue('All');
 await expect(page.getByLabel('Region filter')).toHaveValue('All');
 await expect(page.getByLabel('From date')).toHaveValue('2026-08-03');
});
test('daily weekly and monthly grouping is selectable',async({page})=>{
 for(const grouping of ['day','week','month']){
   await page.getByRole('button',{name:`${grouping} trend grouping`}).click();
   await expect(page.getByRole('button',{name:`${grouping} trend grouping`})).toHaveClass(/bg-white/);
 }
});
test('product search, sorting, detail panel, status filter and export',async({page})=>{
 await nav(page).getByRole('button',{name:/Product performance/}).click();
 await page.getByPlaceholder('Search product or SKU...').fill('Arabica Coffee');
 await expect(page.getByRole('table').getByText('Arabica Coffee')).toBeVisible();
 await page.getByRole('button',{name:'Sort by Revenue'}).click();
 await page.getByRole('table').getByText('Arabica Coffee').click();
 await expect(page.getByRole('dialog',{name:/Arabica Coffee detail/})).toBeVisible();
 await page.getByRole('button',{name:'Close product panel'}).click();
 await page.getByPlaceholder('Search product or SKU...').fill('');
 await page.getByLabel('Product performance status').selectOption('Declining');
 await expect(page.getByLabel('Product performance status')).toHaveValue('Declining');
 const dl=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export table CSV'}).click();
 expect((await dl).suggestedFilename()).toContain('products_synthetic.csv');
});
test('customer segments drill down, table search and export',async({page})=>{
 await nav(page).getByRole('button',{name:/Customer insights/}).click();
 await expect(page.getByText('RFM customer segments')).toBeVisible();
 await page.getByRole('button',{name:/Champions.*customers/}).first().click();
 await expect(page.getByRole('dialog',{name:'Champions segment detail'})).toBeVisible();
 await page.getByRole('button',{name:'Filter customer table to this segment'}).click();
 await expect(page.getByLabel('Customer segment filter')).toHaveValue('Champions');
 await page.getByPlaceholder('Search customer ID...').fill('CUST-0001');
 const dl=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export CSV'}).click();
 expect((await dl).suggestedFilename()).toContain('customers_synthetic.csv');
});
test('opportunity rules, prioritisation, review action and CSV',async({page})=>{
 await nav(page).getByRole('button',{name:/Growth opportunities/}).click();
 await expect(page.getByText('From analytics to next actions.')).toBeVisible();
 await page.getByRole('button',{name:'How rules work'}).click();
 await expect(page.getByText('Deterministic opportunity engine')).toBeVisible();
 await page.getByRole('button',{name:/High priority/}).click();
 await expect(page.getByText('High priority').first()).toBeVisible();
 await page.getByRole('button',{name:'Mark for review'}).first().click();
 await expect(page.getByRole('button',{name:'Marked for review'}).first()).toBeVisible();
 const dl=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export actions'}).click();
 expect((await dl).suggestedFilename()).toContain('growth_opportunities_synthetic.csv');
});
test('methodology panel, global export and no console exceptions',async({page})=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.getByRole('button',{name:/Definitions/}).click();
 await expect(page.getByRole('dialog',{name:'How metrics are calculated'})).toBeVisible();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 const dl=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export report'}).click();
 expect((await dl).suggestedFilename()).toMatch(/overview.*synthetic\.csv$/);
 expect(errors).toEqual([]);
});
test('mobile navigation and page accessibility at 390px',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.reload();
 await expect(page.getByRole('heading',{name:'Sales overview'})).toBeVisible();
 await page.getByRole('button',{name:'Open navigation'}).click();
 await nav(page).getByRole('button',{name:/Customer insights/}).click();
 await expect(page.getByRole('heading',{name:'Customer insights'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open navigation'})).toBeVisible();
});
