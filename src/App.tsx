import { useCallback, useEffect, useMemo, useState } from 'react';
import rawData from './data/synthetic.json';
import { DefinitionModal, FilterBar, Footer, Sidebar, TopHeader } from './components/Layout';
import Overview from './pages/Overview';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Opportunities from './pages/Opportunities';
import { addDays, calculateOverview, canCompare, csvDownload, customerStats, discoverInsights, filterRows, groupSums, prepareRows, previousWindow, productStats, scopedHistory, type Dataset, type Filters, type PageKey } from './lib/analytics';
const data=rawData as Dataset;
const allRows=prepareRows(data);
const initialFilters:Filters={from:addDays(data.meta.endDate,-89),to:data.meta.endDate,category:'All',region:'All',granularity:'week'};
const VALID_ROUTES:PageKey[]=['overview','products','customers','opportunities'];
function routeFromHash():PageKey{const key=window.location.hash.replace(/^#\/?/,'') as PageKey;return VALID_ROUTES.includes(key)?key:'overview'}
export default function App(){
 const [page,setPage]=useState<PageKey>(routeFromHash);
 const [filters,setFilters]=useState<Filters>(initialFilters);
 const [navOpen,setNavOpen]=useState(false);
 const [helpOpen,setHelpOpen]=useState(false);
 useEffect(()=>{const handler=()=>setPage(routeFromHash());window.addEventListener('hashchange',handler);return()=>window.removeEventListener('hashchange',handler)},[]);
 const navigate=useCallback((to:PageKey)=>{if(window.location.hash!==`#${to}`)window.location.hash=to;setPage(to);window.scrollTo({top:0,behavior:'smooth'})},[]);
 const rows=useMemo(()=>filterRows(allRows,filters),[filters]);
 const history=useMemo(()=>scopedHistory(allRows,filters),[filters]);
 const comparable=canCompare(filters,data);
 const previous=useMemo(()=>comparable?filterRows(allRows,previousWindow(filters)):[],[filters,comparable]);
 const stats=useMemo(()=>customerStats(history,rows,filters.to),[history,rows,filters.to]);
 function exportCurrent(){const stamp=`${filters.from}_to_${filters.to}`;const file=`deliverit_${page}_${stamp}_synthetic.csv`;
   if(page==='products'){const p=productStats(rows,previous,data.products,comparable);csvDownload(file,['SKU','Product name','Category','Units sold','GMV INR','Selling price INR','Growth %','Status'],p.map(x=>[x.id,x.name,x.category,x.units,(x.revenue/100).toFixed(2),(x.asp/100).toFixed(2),x.growth===null?'N/A':x.growth.toFixed(2),x.status]));return}
   if(page==='customers'){csvDownload(file,['Customer ID','Region','RFM segment','Historical orders','Historic GMV INR','Period orders','Period GMV INR','Last purchase','Average order INR','R score','F score','M score'],stats.map(x=>[x.id,x.region,x.segment,x.orders,(x.revenue/100).toFixed(2),x.periodOrders,(x.periodRevenue/100).toFixed(2),x.lastDate,(x.aov/100).toFixed(2),x.rfm.r,x.rfm.f,x.rfm.m]));return}
   if(page==='opportunities'){const insights=discoverInsights(rows,previous,history,stats,filters,data.products,comparable);csvDownload(file,['Priority','Type','Title','Problem','Evidence from synthetic transactions','Scenario estimate','Recommended action'],insights.map(i=>[i.priority,i.type,i.title,i.problem,i.evidence,i.impact,i.action]));return}
   const k=calculateOverview(rows,history,filters.from),p=calculateOverview(previous,history,previousWindow(filters).from);
   const lines:(string|number)[][]=[['Meta','Data source','SYNTHETIC DEMONSTRATION ONLY'],['Meta','From date',filters.from],['Meta','To date',filters.to],['Meta','Category',filters.category],['Meta','Region',filters.region],['Meta','Comparable',comparable?'Yes':'No'],...([['GMV INR',(k.gmv/100).toFixed(2)],['Total orders',k.orders],['Average order INR',(k.aov/100).toFixed(2)],['Active customers',k.customers],['Repeat customer rate %',k.repeatCustomerRate.toFixed(2)],['New customers',k.newCustomers],['Returning customers',k.returningCustomers]] as [string,string|number][]).map(([key,value])=>['KPI',key,value]),...groupSums(rows,r=>r.category).map(g=>['Category GMV INR',g.name,(g.revenue/100).toFixed(2)]),...groupSums(rows,r=>r.region).map(g=>['Region GMV INR',g.name,(g.revenue/100).toFixed(2)])];
   if(comparable)lines.push(['Prior period','GMV INR',(p.gmv/100).toFixed(2)],['Prior period','Orders',p.orders]);
   csvDownload(file,['Section','Metric','Value'],lines);
 }
 return <div className="min-h-screen bg-surface"><Sidebar page={page} onNavigate={navigate} open={navOpen} onClose={()=>setNavOpen(false)}/><div className="lg:pl-[252px] min-h-screen"><main className="max-w-[1660px] mx-auto px-4 sm:px-7 xl:px-9 pt-6"><TopHeader page={page} onMenu={()=>setNavOpen(true)} onExport={exportCurrent} onHelp={()=>setHelpOpen(true)}/><FilterBar filters={filters} onChange={setFilters} onReset={()=>setFilters(initialFilters)} data={data}/>
    {page==='overview'&&<Overview data={data} filters={filters} rows={rows} previous={previous} history={history} comparable={comparable} onFilter={setFilters} go={navigate}/>}
    {page==='products'&&<Products data={data} filters={filters} rows={rows} previous={previous} comparable={comparable}/>}
    {page==='customers'&&<Customers filters={filters} rows={rows} previous={previous} history={history} stats={stats} comparable={comparable}/>}
    {page==='opportunities'&&<Opportunities data={data} filters={filters} rows={rows} previous={previous} history={history} stats={stats} comparable={comparable} go={navigate}/>}
    <Footer/></main></div>{helpOpen&&<DefinitionModal onClose={()=>setHelpOpen(false)}/>}</div>
}
