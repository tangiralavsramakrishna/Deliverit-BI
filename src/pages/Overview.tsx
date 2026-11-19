import { useMemo } from 'react';
import { Activity, ArrowRight, CircleDollarSign, CreditCard, Repeat2, ShoppingBag, TrendingUp, UsersRound } from 'lucide-react';
import { AcquisitionChart, CategoryBreakdown, Kpi, OrdersChart, RegionDonut, RevenueChart, PALETTE } from '../components/Viz';
import { DataFootnote, Empty, Section, ViewLink } from '../components/Layout';
import { acquisitionTrend, calculateOverview, change, groupSums, int, money, pct, productStats, shortMoney, type Category, type Dataset, type Filters, type PageKey, type Region, type SalesRow } from '../lib/analytics';
interface Props { data:Dataset;filters:Filters;rows:SalesRow[];previous:SalesRow[];history:SalesRow[];comparable:boolean;onFilter:(f:Filters)=>void;go:(p:PageKey)=>void }
export default function Overview({data,filters,rows,previous,history,comparable,onFilter,go}:Props){
 const summary=useMemo(()=>calculateOverview(rows,history,filters.from),[rows,history,filters.from]);
 const prevSummary=useMemo(()=>calculateOverview(previous,history,filters.from),[previous,history,filters.from]);
 const diff=(a:number,b:number)=>comparable?change(a,b):null;
 const growth=diff(summary.gmv,prevSummary.gmv);
 const categoryCur=groupSums(rows,r=>r.category),categoryPrev=groupSums(previous,r=>r.category);
 const prevCats=new Map(categoryPrev.map(c=>[c.name,c.revenue]));
 const drivers=categoryCur.map(x=>({name:x.name,delta:x.revenue-(prevCats.get(x.name)||0)})).sort((a,b)=>b.delta-a.delta);
 const driver=drivers[0];
 const narrative=summary.gmv===0?'No transactions match this selection. Try a wider date range or reset the filters.':!comparable?`The selection generated ${shortMoney(summary.gmv)} across ${int(summary.orders)} orders. Prior-period growth cannot be calculated with the available history.`:growth===null?`The selection generated ${shortMoney(summary.gmv)} of GMV. The preceding period contains no matching GMV, so percentage growth is unavailable.`:`GMV ${growth>=0?'increased':'decreased'} ${Math.abs(growth).toFixed(1)}% versus the previous equal-length period. ${driver&&driver.delta>0?`${driver.name} showed the largest positive absolute category change (${shortMoney(driver.delta)}).`:`No category recorded a positive absolute contribution to the change.`} This is a transaction-level observation, not a causal attribution.`;
 const products=productStats(rows,previous,data.products,comparable).filter(x=>x.revenue>0).slice(0,5);
 const acquisitions=acquisitionTrend(rows,history,filters.granularity,filters.from);
 return <div className="space-y-6">
   <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3.5">
     <Kpi title="Gross Merchandise Value" value={shortMoney(summary.gmv)} delta={diff(summary.gmv,prevSummary.gmv)} context="vs prior period" icon={<CircleDollarSign size={18}/>} />
     <Kpi title="Total orders" value={int(summary.orders)} delta={diff(summary.orders,prevSummary.orders)} context="vs prior period" icon={<ShoppingBag size={18}/>} color="blue"/>
     <Kpi title="Average order value" value={money(summary.aov)} delta={diff(summary.aov,prevSummary.aov)} context="vs prior period" icon={<CreditCard size={18}/>} color="green"/>
     <Kpi title="Active customers" value={int(summary.customers)} delta={diff(summary.customers,prevSummary.customers)} context="vs prior period" icon={<UsersRound size={18}/>} color="amber"/>
     <Kpi title="Repeat customer rate" value={`${summary.repeatCustomerRate.toFixed(1)}%`} context="≥2 orders in period" icon={<Repeat2 size={18}/>} color="rose"/>
     <Kpi title="Revenue growth" value={comparable?pct(growth):'N/A'} context="equal-length baseline" icon={<TrendingUp size={18}/>} color="navy"/>
   </div>
   <div className="rounded-2xl px-4 py-4 sm:px-5 bg-[#EEEDFC] border border-accent-100 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-accent-600"><Activity size={19}/></span><div><div className="text-[12px] font-bold text-accent-700">Management readout</div><p className="text-[13px] leading-relaxed text-[#4A4775] mt-1">{narrative}</p></div><button onClick={()=>go('opportunities')} className="ml-auto self-center hidden sm:flex gap-1 items-center text-xs font-bold whitespace-nowrap text-accent-700 hover:underline">View actions <ArrowRight size={14}/></button></div>
   <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
     <Section title="GMV over time" subtitle={`Illustrative INR · Grouped by ${filters.granularity} · All matching order lines`} className="xl:col-span-3" actions={<span className="text-[11px] font-semibold text-accent-600 rounded-lg bg-accent-50 px-2.5 py-1.5">{shortMoney(summary.gmv)} total</span>}><RevenueChart rows={rows} granularity={filters.granularity} from={filters.from} to={filters.to}/></Section>
     <Section title="Revenue by category" subtitle="Contribution to selected GMV · Click to drill down" className="xl:col-span-2"><CategoryBreakdown rows={rows} onCategory={(c:Category)=>onFilter({...filters,category:c})}/><DataFootnote text="Category contributions are measured from the same selected order lines and sum to 100% before rounding."/></Section>
   </div>
   <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Section title="Order volume" subtitle="Distinct orders placed in each period"><OrdersChart rows={rows} granularity={filters.granularity} from={filters.from} to={filters.to}/></Section>
      <Section title="Regional mix" subtitle="GMV distribution · Click a region to filter"><RegionDonut rows={rows} onRegion={(r:Region)=>onFilter({...filters,region:r})}/></Section>
   </div>
   <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
     <Section title="New vs. returning customers" subtitle="Unique purchasing customer IDs per time bucket; a customer may appear in multiple buckets"><AcquisitionChart data={acquisitions}/><DataFootnote text={`${int(summary.newCustomers)} first-time purchasers in this scoped window; ${int(summary.returningCustomers)} had qualifying earlier purchases.`}/></Section>
     <Section title="Top performing products" subtitle="Highest GMV in the current selection" actions={<ViewLink onClick={()=>go('products')}>All products</ViewLink>}>
       {!products.length?<Empty/>:<div className="space-y-1">{products.map((p,i)=><div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0"><span className="h-8 w-8 flex items-center justify-center bg-slate-50 rounded-lg text-xs font-semibold text-slate-500">{String(i+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><div className="text-xs font-bold text-ink truncate">{p.name}</div><p className="text-[11px] text-muted mt-0.5">{p.category}</p></div><div className="text-right"><div className="text-[13px] font-semibold">{shortMoney(p.revenue)}</div><div className="text-[11px] text-slate-400">{int(p.units)} units</div></div><span className="w-1.5 h-7 rounded-full" style={{background:PALETTE[i]}}/></div>)}</div>}
     </Section>
   </div>
 </div>
}
