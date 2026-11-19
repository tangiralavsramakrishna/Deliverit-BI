/** Pure functions: all dashboard values trace back to the same synthetic source rows. */
export type Category = 'Fruits & Vegetables' | 'Dairy & Bakery' | 'Staples' | 'Beverages' | 'Snacks';
export type Region = 'North' | 'South' | 'East' | 'West';
export type Granularity = 'day' | 'week' | 'month';
export type PageKey = 'overview' | 'products' | 'customers' | 'opportunities';
export type Segment = 'Champions' | 'Loyal Customers' | 'Potential Loyalists' | 'New Customers' | 'At Risk' | 'Hibernating';
export interface Product { id:string; name:string; category:Category; basePriceCents:number; unit:string; activity:number }
export interface Customer { id:string; region:Region; joinedAt:string }
export interface Order { id:string; customerId:string; region:Region; date:string }
export interface OrderItem { id:string; orderId:string; productId:string; quantity:number; unitPriceCents:number }
export interface Dataset { meta:{label:string;seed:number;startDate:string;endDate:string;currency:string;orderCount:number;customerCount:number;productCount:number;generatedBy:string};customers:Customer[];products:Product[];orders:Order[];items:OrderItem[] }
export interface Filters { from:string;to:string;category:string;region:string;granularity:Granularity }
export interface SalesRow { itemId:string;orderId:string;customerId:string;date:string;region:Region;productId:string;productName:string;category:Category;quantity:number;priceCents:number;revenueCents:number }
export interface OverviewKpis { gmv:number;orders:number;aov:number;customers:number;repeatCustomerRate:number;newCustomers:number;returningCustomers:number }
export interface ProductStat { id:string;name:string;category:Category;units:number;revenue:number;asp:number;growth:number|null;status:'Growing'|'Stable'|'Declining'|'New'|'No baseline';orderCount:number;share:number }
export interface CustomerStat { id:string;region:Region;segment:Segment;orders:number;revenue:number;lastDate:string;recencyDays:number;aov:number;rfm:{r:number;f:number;m:number};periodOrders:number;periodRevenue:number }
export interface Insight { id:string;type:string;title:string;problem:string;evidence:string;impact:string;action:string;priority:'High'|'Medium'|'Low';estimatedCents?:number;icon:'trend'|'users'|'basket'|'alert'|'region'|'reengage'|'target' }
export const CATEGORIES:Category[]=['Fruits & Vegetables','Dairy & Bakery','Staples','Beverages','Snacks'];
export const REGIONS:Region[]=['North','South','East','West'];
export const SEGMENTS:Segment[]=['Champions','Loyal Customers','Potential Loyalists','New Customers','At Risk','Hibernating'];
const DAY=86400000;
const time=(date:string)=>Date.parse(`${date}T00:00:00Z`);
export const addDays=(date:string,offset:number)=>new Date(time(date)+offset*DAY).toISOString().slice(0,10);
export const daysBetween=(from:string,to:string)=>Math.round((time(to)-time(from))/DAY);
export function previousWindow(f:Filters):Filters { const count=daysBetween(f.from,f.to)+1;return {...f,from:addDays(f.from,-count),to:addDays(f.from,-1)} }
export function canCompare(f:Filters,data:Dataset):boolean {return previousWindow(f).from>=data.meta.startDate }
export function dateLabel(date:string):string{return new Date(time(date)).toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'UTC'})}
export function money(cents:number,digits=0):string {return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:digits,minimumFractionDigits:digits}).format(cents/100)}
export function shortMoney(cents:number):string {const v=cents/100;if(Math.abs(v)>=1e7)return `₹${(v/1e7).toFixed(2)}Cr`;if(Math.abs(v)>=1e5)return `₹${(v/1e5).toFixed(2)}L`;if(Math.abs(v)>=1e3)return `₹${(v/1e3).toFixed(1)}k`;return money(cents)}
export const int=(x:number)=>new Intl.NumberFormat('en-IN').format(x);
export const pct=(x:number|null,digits=1)=>x===null?'N/A':`${x>=0?'+':''}${x.toFixed(digits)}%`;
export function change(curr:number,prev:number):number|null{return prev===0?null:(curr-prev)/prev*100}
export function prepareRows(data:Dataset):SalesRow[] {
  const orderById=new Map(data.orders.map(o=>[o.id,o]));
  const productById=new Map(data.products.map(p=>[p.id,p]));
  return data.items.map(item=>{
    const order=orderById.get(item.orderId);const product=productById.get(item.productId);
    if(!order||!product)throw new Error(`Broken foreign key ${item.orderId}/${item.productId}`);
    return {itemId:item.id,orderId:order.id,customerId:order.customerId,date:order.date,region:order.region,productId:product.id,productName:product.name,category:product.category,quantity:item.quantity,priceCents:item.unitPriceCents,revenueCents:item.quantity*item.unitPriceCents};
  });
}
export function filterRows(rows:SalesRow[],f:Filters):SalesRow[] {
  return rows.filter(r=>r.date>=f.from&&r.date<=f.to&&(f.category==='All'||r.category===f.category)&&(f.region==='All'||r.region===f.region));
}
export function scopedHistory(rows:SalesRow[],f:Filters):SalesRow[] {
  return rows.filter(r=>r.date<=f.to&&(f.category==='All'||r.category===f.category)&&(f.region==='All'||r.region===f.region));
}
export function sumRevenue(rows:SalesRow[]):number{return rows.reduce((s,r)=>s+r.revenueCents,0)}
export function groupSums<K extends string>(rows:SalesRow[], key:(r:SalesRow)=>K):{name:K;revenue:number;units:number;orders:number;share:number}[] {
  const groups=new Map<K,{revenue:number;units:number;ids:Set<string>}>();
  for(const r of rows){let val=groups.get(key(r));if(!val){val={revenue:0,units:0,ids:new Set()};groups.set(key(r),val)}val.revenue+=r.revenueCents;val.units+=r.quantity;val.ids.add(r.orderId)}
  const total=sumRevenue(rows);
  return [...groups].map(([name,v])=>({name,revenue:v.revenue,units:v.units,orders:v.ids.size,share:total?100*v.revenue/total:0})).sort((a,b)=>b.revenue-a.revenue);
}
export function calculateOverview(rows:SalesRow[],history:SalesRow[],from:string):OverviewKpis {
  const orders=new Set<string>();const counts=new Map<string,Set<string>>();
  for(const r of rows){orders.add(r.orderId);if(!counts.has(r.customerId))counts.set(r.customerId,new Set());counts.get(r.customerId)!.add(r.orderId)}
  const uniqueCustomers=counts.size;
  const repeat=[...counts.values()].filter(v=>v.size>=2).length;
  const first=new Map<string,string>();
  for(const r of history)if(!first.has(r.customerId)||r.date<first.get(r.customerId)!)first.set(r.customerId,r.date);
  const newCustomers=[...counts.keys()].filter(id=>(first.get(id)??'9999')>=from).length;
  return {gmv:sumRevenue(rows),orders:orders.size,aov:orders.size?sumRevenue(rows)/orders.size:0,customers:uniqueCustomers,repeatCustomerRate:uniqueCustomers?repeat/uniqueCustomers*100:0,newCustomers,returningCustomers:uniqueCustomers-newCustomers};
}
function weekStart(date:string):string {const dow=new Date(time(date)).getUTCDay();return addDays(date,-((dow+6)%7))}
export function bucketKey(date:string,g:Granularity):string{return g==='day'?date:g==='week'?weekStart(date):date.slice(0,7)}
export function trend(rows:SalesRow[],g:Granularity,from?:string,to?:string):{key:string;label:string;revenue:number;orders:number;customers:number;units:number}[] {
  const buckets=new Map<string,{revenue:number;ids:Set<string>;customers:Set<string>;units:number}>();
  for(const r of rows){const k=bucketKey(r.date,g);let b=buckets.get(k);if(!b){b={revenue:0,ids:new Set(),customers:new Set(),units:0};buckets.set(k,b)}b.revenue+=r.revenueCents;b.ids.add(r.orderId);b.customers.add(r.customerId);b.units+=r.quantity}
  if(from&&to){
    let date=from;
    while(date<=to){const k=bucketKey(date,g);if(!buckets.has(k))buckets.set(k,{revenue:0,ids:new Set(),customers:new Set(),units:0});date=addDays(date,1)}
  }
  return [...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>({key,label:g==='month'?new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN',{month:'short',year:'2-digit',timeZone:'UTC'}):dateLabel(key),revenue:v.revenue/100,orders:v.ids.size,customers:v.customers.size,units:v.units}));
}
export function productStats(rows:SalesRow[],previous:SalesRow[],allProducts:Product[],comparable=true):ProductStat[] {
  const previousSums=new Map<string,number>();
  for(const r of previous)previousSums.set(r.productId,(previousSums.get(r.productId)||0)+r.revenueCents);
  const cur=new Map<string,{revenue:number;units:number;orders:Set<string>}>();
  for(const r of rows){let v=cur.get(r.productId);if(!v){v={revenue:0,units:0,orders:new Set()};cur.set(r.productId,v)}v.revenue+=r.revenueCents;v.units+=r.quantity;v.orders.add(r.orderId)}
  const total=sumRevenue(rows);
  return allProducts.map(p=>{
    const now=cur.get(p.id),revenue=now?.revenue||0,prev=previousSums.get(p.id)||0,growth=comparable?change(revenue,prev):null;
    const status:ProductStat['status']=!comparable?'No baseline':prev===0&&revenue>0?'New':growth!==null&&growth>=10?'Growing':growth!==null&&growth<=-10?'Declining':'Stable';
    return {id:p.id,name:p.name,category:p.category,units:now?.units||0,revenue,asp:now?.units?revenue/now.units:0,growth,status,orderCount:now?.orders.size||0,share:total?100*revenue/total:0};
  }).sort((a,b)=>b.revenue-a.revenue);
}
function quantile(values:number[],q:number):number {const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*q)]||0}
function score(value:number, thresholds:number[]):number {return 1+thresholds.reduce((s,t)=>s+Number(value>t),0)}
export function customerStats(history:SalesRow[],period:SalesRow[],asOf:string):CustomerStat[] {
  const historic=new Map<string,{orders:Map<string,string>;revenue:number;region:Region}>();
  for(const r of history){let v=historic.get(r.customerId);if(!v){v={orders:new Map(),revenue:0,region:r.region};historic.set(r.customerId,v)}v.orders.set(r.orderId,r.date);v.revenue+=r.revenueCents}
  const active=new Map<string,{orders:Set<string>;revenue:number}>();
  for(const r of period){let v=active.get(r.customerId);if(!v){v={orders:new Set(),revenue:0};active.set(r.customerId,v)}v.orders.add(r.orderId);v.revenue+=r.revenueCents}
  const fBound=[.2,.4,.6,.8].map(q=>quantile([...historic.values()].map(v=>v.orders.size),q));
  const mBound=[.2,.4,.6,.8].map(q=>quantile([...historic.values()].map(v=>v.revenue),q));
  return [...historic].map(([id,v])=>{
    const dates=[...v.orders.values()];const lastDate=dates.sort().at(-1)!;
    const recencyDays=daysBetween(lastDate,asOf);
    const r=recencyDays<=14?5:recencyDays<=30?4:recencyDays<=60?3:recencyDays<=120?2:1;
    const f=score(v.orders.size,fBound),m=score(v.revenue,mBound);
    let segment:Segment;
    if(r>=4&&f>=4&&m>=4)segment='Champions';
    else if(r>=3&&f>=4)segment='Loyal Customers';
    else if(r>=4&&f<=2)segment='New Customers';
    else if(r>=4&&f>=3)segment='Potential Loyalists';
    else if(r<=2&&(f>=3||m>=4))segment='At Risk';
    else segment='Hibernating';
    return {id,region:v.region,segment,orders:v.orders.size,revenue:v.revenue,lastDate,recencyDays,aov:v.revenue/v.orders.size,rfm:{r,f,m},periodOrders:active.get(id)?.orders.size||0,periodRevenue:active.get(id)?.revenue||0};
  }).sort((a,b)=>b.revenue-a.revenue);
}
export function acquisitionTrend(period:SalesRow[],history:SalesRow[],g:Granularity,from?:string):{key:string;label:string;new:number;returning:number}[] {
  const first=new Map<string,string>();for(const r of history)if(!first.has(r.customerId)||r.date<first.get(r.customerId)!)first.set(r.customerId,r.date);
  const ordersByCustomer=new Map<string,Map<string,string>>();
  for(const r of period){let orders=ordersByCustomer.get(r.customerId);if(!orders){orders=new Map();ordersByCustomer.set(r.customerId,orders)}orders.set(r.orderId,r.date)}
  const buckets=new Map<string,{new:Set<string>;returning:Set<string>}>();
  for(const [id,orders] of ordersByCustomer){
    for(const key of new Set([...orders.values()].map(d=>bucketKey(d,g)))){
      if(!buckets.has(key))buckets.set(key,{new:new Set(),returning:new Set()});
      const b=buckets.get(key)!;
      if((!from||first.get(id)!>=from)&&bucketKey(first.get(id)!,g)===key)b.new.add(id);else b.returning.add(id);
    }
  }
  return [...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>({key,label:g==='month'?new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN',{month:'short',year:'2-digit',timeZone:'UTC'}):dateLabel(key),new:v.new.size,returning:v.returning.size}));
}
export function frequencyDistribution(rows:SalesRow[]):{name:string;customers:number}[] {
  const byCustomer=new Map<string,Set<string>>();for(const r of rows){if(!byCustomer.has(r.customerId))byCustomer.set(r.customerId,new Set());byCustomer.get(r.customerId)!.add(r.orderId)}
  const values=[{name:'1 order',customers:0},{name:'2–3 orders',customers:0},{name:'4–7 orders',customers:0},{name:'8+ orders',customers:0}];
  for(const v of byCustomer.values()){const n=v.size;values[n===1?0:n<=3?1:n<=7?2:3].customers++}return values;
}
export function segmentSummary(stats:CustomerStat[]):{name:Segment;count:number;revenue:number;active:number;share:number}[] {
  const total=stats.reduce((s,x)=>s+x.revenue,0);
  return SEGMENTS.map(name=>{const group=stats.filter(s=>s.segment===name);const revenue=group.reduce((s,x)=>s+x.revenue,0);return {name,count:group.length,revenue,active:group.filter(s=>s.periodOrders>0).length,share:total?revenue/total*100:0}});
}
export function discoverInsights(cur:SalesRow[],prev:SalesRow[],history:SalesRow[],stats:CustomerStat[],f:Filters,allProducts:Product[],comparable=true):Insight[] {
  const insights:Insight[]=[];
  const revenue=sumRevenue(cur),priorRevenue=sumRevenue(prev);
  const products=productStats(cur,prev,allProducts,comparable);
  const priorByProduct=new Map(groupSums(prev,r=>r.productId).map(p=>[p.name,p.revenue]));
  const declining=products.filter(p=>p.growth!==null&&p.growth<=-20).sort((a,b)=>(priorByProduct.get(b.id)!-b.revenue)-(priorByProduct.get(a.id)!-a.revenue)).slice(0,3);
  if(comparable&&declining.length){const p=declining[0];const old=prev.filter(r=>r.productId===p.id).reduce((s,r)=>s+r.revenueCents,0);const lost=Math.max(0,old-p.revenue);
    insights.push({id:'declining',type:'Product performance',title:`Investigate ${p.name} decline`,problem:'A previously selling SKU is materially underperforming its comparable prior window.',evidence:`${p.name}: ${money(p.revenue)} vs ${money(old)} previously (${pct(p.growth)}); ${declining.length} SKU(s) down at least 20%.`,impact:`Scenario only: recovering 25% of this SKU's observed revenue shortfall equals ${shortMoney(lost*.25)}.`,estimatedCents:lost*.25,action:'Check stock availability, pricing, substitutions and account-level reorder patterns.',priority:'High',icon:'trend'});
  }
  const currentByCustomer=new Map<string,{revenue:number;orders:Set<string>}>(), previousByCustomer=new Map<string,{revenue:number;orders:Set<string>}>();
  const accumulate=(rows:SalesRow[],map:Map<string,{revenue:number;orders:Set<string>}>)=>{for(const r of rows){let v=map.get(r.customerId);if(!v){v={revenue:0,orders:new Set()};map.set(r.customerId,v)}v.revenue+=r.revenueCents;v.orders.add(r.orderId)}};
  accumulate(cur,currentByCustomer);accumulate(prev,previousByCustomer);
  const slipping=[...previousByCustomer].map(([id,p])=>({id,prev:p.orders.size,now:currentByCustomer.get(id)?.orders.size||0,rev:p.revenue})).filter(x=>x.prev>=3&&x.now<=x.prev*.5).sort((a,b)=>b.rev-a.rev);
  if(comparable&&slipping.length){const slice=slipping.slice(0,10);const atRiskValue=slice.reduce((s,x)=>s+x.rev,0);
    insights.push({id:'retention',type:'Account health',title:`Prioritise ${slipping.length} slowing accounts`,problem:'Previously active customers placed materially fewer orders than in the equal-length prior period.',evidence:`${slipping.length} customer IDs with ≥3 previous orders are now at ≤50% of their former order frequency. Top 10 represented ${shortMoney(atRiskValue)} of prior-window GMV.`,impact:`Scenario only: regaining 10% of those top accounts' previous GMV would represent ${shortMoney(atRiskValue*.1)}.`,estimatedCents:atRiskValue*.1,action:'Build a relationship-manager call list; investigate service issues before offering targeted reorder incentives.',priority:'High',icon:'users'});
  }
  const byOrder=new Map<string,Set<string>>();for(const r of cur){if(!byOrder.has(r.orderId))byOrder.set(r.orderId,new Set());byOrder.get(r.orderId)!.add(r.category)}
  const pairs=new Map<string,number>();for(const values of byOrder.values()){const list=[...values].sort();for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const key=`${list[i]}|${list[j]}`;pairs.set(key,(pairs.get(key)||0)+1)}}
  const pair=[...pairs].sort((a,b)=>b[1]-a[1])[0];
  if(pair){const [a,b]=pair[0].split('|');const [co]=[pair[1]];
    const exclusive=[...byOrder.values()].filter(v=>v.has(a)&&!v.has(b)).length;
    insights.push({id:'crosssell',type:'Basket association',title:`Test a ${a} + ${b} bundle`,problem:'Related categories frequently appear in the same order, while some baskets contain only one side of the pair.',evidence:`${int(co)} of ${int(byOrder.size)} orders contained both categories; ${int(exclusive)} included ${a} but not ${b}. This is co-occurrence, not proof of uplift.`,impact:`Scenario only: if 5% of those ${int(exclusive)} baskets added ${money(revenue/Math.max(1,byOrder.size)*.2)} each, added GMV ≈ ${shortMoney(exclusive*.05*(revenue/Math.max(1,byOrder.size))*.2)}.`,estimatedCents:exclusive*.05*(revenue/Math.max(1,byOrder.size))*.2,action:'Pilot a complementary category suggestion at ordering; compare against an unaffected control cohort.',priority:'Medium',icon:'basket'});
  }
  const category=groupSums(cur,r=>r.category)[0];
  if(f.category==='All'&&category&&category.share>=25){insights.push({id:'concentration',type:'Revenue concentration',title:`Monitor exposure to ${category.name}`,problem:'A single category accounts for a significant portion of selected GMV.',evidence:`${category.name} contributed ${category.share.toFixed(1)}% (${shortMoney(category.revenue)}) of selected GMV.`,impact:`Sensitivity estimate: a hypothetical 10% dip in this category would reduce current-window GMV by ${shortMoney(category.revenue*.1)}.`,estimatedCents:category.revenue*.1,action:'Track category-level supplier concentration and test adjacent-product diversification.',priority:category.share>=40?'High':'Medium',icon:'alert'});
  }
  const regions=groupSums(cur,r=>r.region);const pRegions=new Map(groupSums(prev,r=>r.region).map(x=>[x.name,x.revenue]));
  const weak=regions.filter(x=>(pRegions.get(x.name)||0)>0).map(x=>({...x,growth:change(x.revenue,pRegions.get(x.name)!)!})).sort((a,b)=>a.growth-b.growth)[0];
  if(comparable&&f.region==='All'&&regions.length>=2&&weak){const baseline=pRegions.get(weak.name)||0;const gap=Math.max(0,baseline-weak.revenue);
    insights.push({id:'region',type:'Regional performance',title:`Review ${weak.name} region momentum`,problem:'One region has the weakest relative sales trend among regions with prior-window activity.',evidence:`${weak.name}: ${shortMoney(weak.revenue)}, ${pct(weak.growth)} vs the previous equal-length period.`,impact:gap?`Scenario only: recovering 20% of the gap would equal ${shortMoney(gap*.2)}.`:'No incremental revenue can be inferred from growth alone; review account coverage.',estimatedCents:gap*.2,action:'Review regional customer coverage, delivery consistency, assortment and sales account outreach.',priority:weak.growth < -10?'High':'Medium',icon:'region'});
  }
  const dormant=stats.filter(x=>x.recencyDays>=60&&x.revenue>0).sort((a,b)=>b.revenue-a.revenue);
  if(dormant.length){const high=dormant.slice(0,20);const prior=high.reduce((s,x)=>s+x.revenue,0);
    insights.push({id:'reengagement',type:'Customer reactivation',title:`Re-engage ${int(dormant.length)} dormant customers`,problem:'A segment of customers has not ordered for at least 60 days as of the selected window end.',evidence:`${int(dormant.length)} eligible customer IDs have ≥60-day recency; top 20 lifetime-to-date purchase value ${shortMoney(prior)}.`,impact:`Illustrative scenario: reactivating 10% of the top 20 at 5% of historic spend equals ${shortMoney(prior*.005)}; not a forecast.`,estimatedCents:prior*.005,action:'Send segmented reorder reminders with product-level relevance; measure opt-in conversion and incremental orders.',priority:'Medium',icon:'reengage'});
  }
  const ov=calculateOverview(cur,history,f.from);
  if(ov.orders>0){
    const baskets=new Map<string,{categories:Set<string>;revenue:number}>();
    for(const r of cur){let b=baskets.get(r.orderId);if(!b){b={categories:new Set(),revenue:0};baskets.set(r.orderId,b)}b.categories.add(r.category);b.revenue+=r.revenueCents}
    const single=[...baskets.values()].filter(b=>b.categories.size===1),multi=[...baskets.values()].filter(b=>b.categories.size>1);
    const avgSingle=single.length?single.reduce((s,b)=>s+b.revenue,0)/single.length:0;
    const avgMulti=multi.length?multi.reduce((s,b)=>s+b.revenue,0)/multi.length:0;
    const evidence=`${int(single.length)} of ${int(ov.orders)} orders (${(100*single.length/ov.orders).toFixed(1)}%) contained one category; AOV for those baskets was ${money(avgSingle)}, versus ${money(avgMulti)} for multi-category baskets. This is an association, not a causal effect.`;
    insights.push({id:'aov',type:'Basket growth',title:'Pilot a modest basket-size improvement',problem:'Single-category baskets may be candidates for relevant complementary product suggestions.',evidence,impact:`Scenario only: a 3% uplift in overall AOV at unchanged order count would add ${shortMoney(revenue*.03)} GMV.`,estimatedCents:revenue*.03,action:'Experiment with one relevant add-on for single-category baskets, with a control group; track GMV and gross margin.',priority:'Low',icon:'target'});
  }
  if(!insights.length){insights.push({id:'baseline',type:'Monitoring',title:'Insufficient data for opportunity flags',problem:'No rows are available under the current filters, or comparisons are unavailable.',evidence:`Current selected GMV ${shortMoney(revenue)}; prior GMV ${shortMoney(priorRevenue)}.`,impact:'No defensible impact estimate for this selection.',action:'Expand the date window or reset filters to establish a useful baseline.',priority:'Low',icon:'target'});}
  return insights;
}
export function csvDownload(filename:string,headers:string[],rows:(string|number)[][]):void {
  const escape=(v:string|number)=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s)&& !/^-?\d+(?:\.\d+)?$/.test(s))s="'"+s;return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s};
  const csv='\uFEFF'+[headers,...rows].map(line=>line.map(escape).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
