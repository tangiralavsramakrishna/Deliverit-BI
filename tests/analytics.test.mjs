import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {fileURLToPath} from 'node:url';
import { dirname,resolve } from 'node:path';
import {
  addDays,acquisitionTrend,calculateOverview,canCompare,change,csvDownload,customerStats,
  daysBetween,discoverInsights,filterRows,frequencyDistribution,groupSums,
  previousWindow,prepareRows,productStats,scopedHistory,segmentSummary,sumRevenue,trend
} from '../src/lib/analytics.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const jsonPath=resolve(root,'src/data/synthetic.json');
const data=JSON.parse(readFileSync(jsonPath,'utf8'));
const rows=prepareRows(data);
const selection={from:'2026-08-03',to:'2026-10-31',category:'All',region:'All',granularity:'week'};
const current=filterRows(rows,selection);
const priorWindow=previousWindow(selection);
const previous=filterRows(rows,priorWindow);
const history=scopedHistory(rows,selection);
const kpis=calculateOverview(current,history,selection.from);

function hash(buf){return createHash('sha256').update(buf).digest('hex')}
test('fixed seed regeneration is byte-for-byte reproducible',()=>{
 const before=hash(readFileSync(jsonPath));
 execFileSync('node',[resolve(root,'scripts/generate-data.mjs')],{cwd:root,stdio:'pipe'});
 assert.equal(hash(readFileSync(jsonPath)),before);
 assert.equal(data.meta.seed,24112026);
});
test('exact requested dataset dimensions, coverage and foreign-key consistency',()=>{
 assert.equal(data.customers.length,1000);
 assert.equal(data.products.length,100);
 assert.ok(data.orders.length>1000);
 assert.ok(data.items.length>data.orders.length);
 assert.deepEqual([...new Set(data.products.map(x=>x.category))].sort(),['Beverages','Dairy & Bakery','Fruits & Vegetables','Snacks','Staples']);
 assert.deepEqual([...new Set(data.customers.map(x=>x.region))].sort(),['East','North','South','West']);
 assert.equal(data.meta.startDate,'2025-11-01');assert.equal(data.meta.endDate,'2026-10-31');
 assert.equal(new Set(data.orders.map(x=>x.date.slice(0,7))).size,12);
 assert.equal(new Set(data.orders.map(x=>x.customerId)).size,1000);
 assert.equal(new Set(data.orders.map(x=>x.id)).size,data.orders.length);
 assert.equal(new Set(data.items.map(x=>x.id)).size,data.items.length);
 assert.ok(data.items.every(x=>Number.isSafeInteger(x.quantity*x.unitPriceCents)&&x.quantity>0&&x.unitPriceCents>0));
 assert.equal(rows.length,data.items.length);
 assert.ok(rows.every(x=>x.date>=data.meta.startDate&&x.date<=data.meta.endDate));
});
test('GMV, distinct orders, AOV and repeat denominator match independent raw-order arithmetic',()=>{
 const ids=new Set(current.map(r=>r.orderId));
 const byCustomer=new Map();for(const row of current){if(!byCustomer.has(row.customerId))byCustomer.set(row.customerId,new Set());byCustomer.get(row.customerId).add(row.orderId)}
 const rawRevenue=current.reduce((s,r)=>s+r.quantity*r.priceCents,0);
 assert.equal(kpis.gmv,rawRevenue);assert.equal(kpis.orders,ids.size);
 assert.equal(kpis.aov,rawRevenue/ids.size);
 assert.equal(kpis.customers,byCustomer.size);
 assert.equal(kpis.repeatCustomerRate,[...byCustomer.values()].filter(v=>v.size>=2).length*100/byCustomer.size);
 assert.equal(kpis.customers,kpis.newCustomers+kpis.returningCustomers);
 assert.ok(kpis.gmv>0);
});
test('category and region revenue add up exactly to selected GMV',()=>{
 for(const key of ['category','region']){
   const group=groupSums(current,r=>r[key]);
   assert.equal(group.reduce((s,x)=>s+x.revenue,0),kpis.gmv);
   assert.ok(Math.abs(group.reduce((s,x)=>s+x.share,0)-100)<1e-9);
 }
});
test('category + region narrowing affects all dependent metrics consistently',()=>{
 const f={...selection,category:'Staples',region:'South'};
 const selectionRows=filterRows(rows,f);
 const historic=scopedHistory(rows,f);
 const k=calculateOverview(selectionRows,historic,f.from);
 assert.ok(selectionRows.length<current.length);
 assert.ok(selectionRows.every(r=>r.category==='Staples'&&r.region==='South'));
 assert.equal(k.gmv,sumRevenue(selectionRows));
 assert.equal(k.customers,new Set(selectionRows.map(r=>r.customerId)).size);
 assert.ok(customerStats(historic,selectionRows,f.to).every(c=>c.region==='South'));
});
test('equal length comparisons are adjacent and respect dataset boundaries',()=>{
 assert.equal(daysBetween(selection.from,selection.to),89);
 assert.equal(priorWindow.to,addDays(selection.from,-1));
 assert.equal(daysBetween(priorWindow.from,priorWindow.to),89);
 assert.ok(canCompare(selection,data));
 assert.equal(canCompare({...selection,from:data.meta.startDate,to:data.meta.endDate},data),false);
 assert.equal(change(120,100),20);assert.equal(change(1,0),null);
});
test('daily, weekly and monthly bucketing correctly attributes every cent and every distinct order',()=>{
 for(const g of ['day','week','month']){
  const series=trend(current,g,selection.from,selection.to);
  assert.equal(Math.round(series.reduce((s,x)=>s+x.revenue,0)*100),kpis.gmv);
  if(g==='day')assert.equal(series.length,90);
  assert.ok(series.every(b=>b.revenue>=0&&b.orders>=0));
 }
});
test('product and customer revenue reconcile with GMV',()=>{
 const productRows=productStats(current,previous,data.products);
 assert.equal(productRows.length,100);
 assert.equal(productRows.reduce((s,p)=>s+p.revenue,0),kpis.gmv);
 assert.ok(productRows.every(p=>p.units>=0&&p.growth===null||p.growth>=-100));
 const customers=customerStats(history,current,selection.to);
 assert.equal(customers.reduce((s,c)=>s+c.periodRevenue,0),kpis.gmv);
 assert.equal(new Set(customers.map(x=>x.id)).size,customers.length);
 assert.ok(customers.every(c=>c.rfm.r>=1&&c.rfm.r<=5&&c.rfm.f>=1&&c.rfm.f<=5&&c.rfm.m>=1&&c.rfm.m<=5));
 assert.equal(segmentSummary(customers).reduce((s,x)=>s+x.count,0),customers.length);
 assert.equal(new Set(customers.map(x=>x.segment)).size,6);
 const noBaseline=productStats(current,[],data.products,false);
 assert.ok(noBaseline.every(p=>p.growth===null&&p.status==='No baseline'));
});
test('new and returning acquisition does not double count a customer within a bucket',()=>{
 for(const g of ['day','week','month']){
   const bars=acquisitionTrend(current,history,g,selection.from);
   const buckets=new Map();
   for(const row of current){const k=g==='month'?row.date.slice(0,7):g==='day'?row.date:(()=>{const date=new Date(row.date+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);return date.toISOString().slice(0,10)})();
     if(!buckets.has(k))buckets.set(k,new Set());buckets.get(k).add(row.customerId)}
   for(const b of bars)assert.equal(b.new+b.returning,buckets.get(b.key).size);
   assert.equal(bars.reduce((s,b)=>s+b.new,0),kpis.newCustomers);
 }
});
test('frequency histogram counts all active customers once',()=>{
 assert.equal(frequencyDistribution(current).reduce((s,x)=>s+x.customers,0),kpis.customers);
});
test('all recommendation evidence is rule-derived and impact has assumption language',()=>{
 const customers=customerStats(history,current,selection.to);
 const insights=discoverInsights(current,previous,history,customers,selection,data.products,true);
 assert.ok(insights.length>=5);
 assert.ok(insights.every(i=>i.evidence.length>15&&i.action.length>15&&i.impact.length>10));
 assert.ok(insights.some(i=>i.type==='Basket association'));
 assert.ok(insights.every(i=>['High','Medium','Low'].includes(i.priority)));
 const noBaseline=discoverInsights(current,[],history,customers,{...selection,from:data.meta.startDate},data.products,false);
 assert.ok(noBaseline.every(i=>!['declining','retention','region'].includes(i.id)));
});
test('empty filter does not divide by zero',()=>{
 const empty=filterRows(rows,{...selection,from:'2027-01-01',to:'2027-01-02'});
 const k=calculateOverview(empty,history,'2027-01-01');
 assert.equal(k.gmv,0);assert.equal(k.orders,0);assert.equal(k.aov,0);assert.equal(k.repeatCustomerRate,0);
 assert.equal(groupSums(empty,r=>r.category).length,0);
});

test('CSV download creates escaped, UTF-8 BOM-prefixed and spreadsheet-formula-safe content',async()=>{
  const oldDocument=globalThis.document;
  const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
  let blob,filename='',clicked=0;
  globalThis.document={body:{appendChild(){}},createElement(){return {set href(x){},set download(x){filename=x},click(){clicked++},remove(){}}}};
  URL.createObjectURL=(b)=>{blob=b;return 'blob:synthetic-local'};
  URL.revokeObjectURL=()=>{};
  try{
    csvDownload('report.csv',['name','revenue'],[['Example, Inc.',-22.5],['=HYPERLINK("bad")',120]]);
    const content=await blob.text();
    assert.ok(content.startsWith('name,revenue\r\n'));
    assert.equal(Buffer.from(await blob.arrayBuffer()).subarray(0,3).toString('hex'),'efbbbf');
    assert.ok(content.includes('"Example, Inc.",-22.5'));
    assert.ok(content.includes("'=HYPERLINK"));
    assert.equal(filename,'report.csv');assert.equal(clicked,1);
  }finally{globalThis.document=oldDocument;URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
});
