import { useEffect, useState, type ReactNode } from 'react';
import { Activity, ArrowUpRight, CalendarDays, ChevronDown, CircleHelp, Download, FilterX, Layers3, LayoutDashboard, Lightbulb, Menu, Package2, ShieldCheck, Sparkles, X, UsersRound } from 'lucide-react';
import { addDays, canCompare, dateLabel, type Dataset, type Filters, type PageKey, type Granularity, CATEGORIES, REGIONS } from '../lib/analytics';

const NAV: {id:PageKey;label:string;description:string;icon:typeof LayoutDashboard}[]=[
  {id:'overview',label:'Sales overview',description:'Executive performance',icon:LayoutDashboard},
  {id:'products',label:'Product performance',description:'SKU intelligence',icon:Package2},
  {id:'customers',label:'Customer insights',description:'Behavior & segments',icon:UsersRound},
  {id:'opportunities',label:'Growth opportunities',description:'Actions from data',icon:Lightbulb}
];
export const titles:Record<PageKey,{title:string;sub:string;eyebrow:string}>={
  overview:{title:'Sales overview',sub:'A clear view of what is driving commercial performance.',eyebrow:'Business performance'},
  products:{title:'Product performance',sub:'Find the best sellers, emerging SKUs and products needing attention.',eyebrow:'Merchandise intelligence'},
  customers:{title:'Customer insights',sub:'Understand purchasing behavior, loyalty and revenue concentration.',eyebrow:'Customer intelligence'},
  opportunities:{title:'Growth opportunities',sub:'Turn transaction patterns into testable, prioritised actions.',eyebrow:'Commercial recommendations'}
};
function Mark({small=false}:{small?:boolean}){return <div className={`shrink-0 bg-accent-500 rounded-xl flex items-center justify-center text-white ${small?'h-8 w-8':'h-10 w-10'}`}><Layers3 size={small?18:22} strokeWidth={2.4}/></div>}
export function Sidebar({page,onNavigate,open,onClose}:{page:PageKey;onNavigate:(p:PageKey)=>void;open:boolean;onClose:()=>void}){
  return <>
    {open&&<button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 bg-navy-950/60 z-30 lg:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-40 w-[252px] bg-navy-950 text-slate-300 flex flex-col transition-transform duration-200 lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
      <div className="px-6 pt-7 pb-8 flex items-center gap-3"><Mark/><div className="min-w-0"><div className="text-white font-bold tracking-tight text-[19px] leading-5">DeliverIt<span className="text-accent-400">.</span></div><div className="text-[11px] mt-1.5 tracking-wide text-slate-400">by Urban Harvest</div></div><button className="ml-auto lg:hidden" aria-label="Close menu" onClick={onClose}><X size={19}/></button></div>
      <div className="px-6 pb-3 text-[10px] tracking-[.18em] font-bold text-slate-500">WORKSPACE</div>
      <nav aria-label="Main navigation" className="px-3 space-y-1.5 flex-1">
        {NAV.map(item=><button key={item.id} onClick={()=>{onNavigate(item.id);onClose()}} className={`group w-full text-left flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors ${page===item.id?'bg-accent-500/20 text-white':'hover:bg-white/5 text-slate-400 hover:text-white'}`} aria-current={page===item.id?'page':undefined}>
          <item.icon size={18} className={page===item.id?'text-[#ACA3FF]':'text-slate-500 group-hover:text-white'} strokeWidth={1.9}/><div className="min-w-0"><div className="text-[13px] font-semibold">{item.label}</div><div className="text-[11px] mt-0.5 opacity-60">{item.description}</div></div>{page===item.id&&<div className="ml-auto w-1.5 h-1.5 bg-[#ABA2FF] rounded-full"/>}
        </button>)}
      </nav>
      <div className="px-4 pb-5 space-y-4"><div className="rounded-xl bg-white/[.055] border border-white/10 p-4"><div className="flex gap-2 items-center text-slate-100 text-[12px] font-semibold"><ShieldCheck size={15} className="text-emerald-400"/> Portfolio prototype</div><p className="mt-2 text-[11px] leading-relaxed text-slate-400">Illustrative data only. No actual Urban Harvest business figures or customer records.</p></div><div className="border-t border-white/10 pt-4 flex items-center gap-3"><Mark small/><div><div className="text-xs font-semibold text-white">Analytics workspace</div><div className="text-[10px] text-slate-500 mt-0.5">Independent demonstration • v1.0</div></div></div></div>
    </aside>
  </>
}
export function TopHeader({page,onMenu,onExport,onHelp}:{page:PageKey;onMenu:()=>void;onExport:()=>void;onHelp:()=>void}){
  const t=titles[page];return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><button onClick={onMenu} className="lg:hidden soft-button !p-2" aria-label="Open navigation"><Menu size={21}/></button><div className="flex items-center gap-2 text-xs text-slate-500"><span>Workspace</span><span className="text-slate-300">/</span><span className="text-accent-600 font-semibold">{t.eyebrow}</span></div></div><div className="flex items-center gap-2"><button onClick={onHelp} className="soft-button border border-slate-200 bg-white" title="Methodology and metric definitions"><CircleHelp size={16}/><span className="hidden sm:inline">Definitions</span></button><button onClick={onExport} className="primary-button"><Download size={16}/><span>Export report</span></button></div></div>
    <div className="mt-7 mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-3"><div><h1 className="text-[27px] sm:text-[31px] font-bold tracking-[-.035em] text-ink leading-tight">{t.title}</h1><p className="text-[13px] sm:text-sm mt-2 text-muted">{t.sub}</p></div><div className="inline-flex items-center gap-2 self-start rounded-full bg-violet-50 text-accent-700 px-3 py-1.5 border border-violet-100 text-[11px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-accent-500"/>SYNTHETIC DATA • DEMONSTRATION ONLY</div></div>
  </>
}
export function FilterBar({filters,onChange,onReset,data}:{filters:Filters;onChange:(f:Filters)=>void;onReset:()=>void;data:Dataset}){
  const [preset,setPreset]=useState('90');
  useEffect(()=>{const range=filters.from===data.meta.startDate&&filters.to===data.meta.endDate?'all':filters.to!==data.meta.endDate?'custom':[30,90,180].find(n=>filters.from===addDays(data.meta.endDate,-n+1))?.toString()||'custom';setPreset(range)},[filters.from,filters.to,data.meta.startDate,data.meta.endDate]);
  function setPeriod(s:string){setPreset(s);if(s==='custom')return;const days=s==='all'?366:Number(s);onChange({...filters,to:data.meta.endDate,from:s==='all'?data.meta.startDate:addDays(data.meta.endDate,-days+1)})}
  function changeDate(field:'from'|'to',val:string){if(!val)return;setPreset('custom');const next={...filters,[field]:val};if(next.from>next.to){if(field==='from')next.to=val;else next.from=val}onChange(next)}
  return <div className="panel px-4 py-3.5 mb-6">
    <div className="flex flex-wrap items-end gap-3 lg:gap-4">
      <label className="flex flex-col gap-1.5 min-w-[142px]"><span className="small-label">Date range</span><span className="relative"><select aria-label="Select date range" className="form-field w-full appearance-none pr-8" value={preset} onChange={e=>setPeriod(e.target.value)}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 180 days</option><option value="all">Full 12 months</option><option value="custom">Custom range</option></select><ChevronDown size={15} className="absolute right-3 top-[13px] text-muted pointer-events-none"/></span></label>
      <label className="flex flex-col gap-1.5"><span className="small-label">From</span><input aria-label="From date" className="form-field w-[143px]" type="date" min={data.meta.startDate} max={filters.to} value={filters.from} onChange={e=>changeDate('from',e.target.value)}/></label>
      <label className="flex flex-col gap-1.5"><span className="small-label">To</span><input aria-label="To date" className="form-field w-[143px]" type="date" min={filters.from} max={data.meta.endDate} value={filters.to} onChange={e=>changeDate('to',e.target.value)}/></label>
      <label className="flex flex-col gap-1.5 min-w-[150px]"><span className="small-label">Category</span><span className="relative"><select aria-label="Category filter" className="form-field w-full appearance-none pr-8" value={filters.category} onChange={e=>onChange({...filters,category:e.target.value})}><option>All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={15} className="absolute right-3 top-[13px] text-muted pointer-events-none"/></span></label>
      <label className="flex flex-col gap-1.5 min-w-[114px]"><span className="small-label">Region</span><span className="relative"><select aria-label="Region filter" className="form-field w-full appearance-none pr-8" value={filters.region} onChange={e=>onChange({...filters,region:e.target.value})}><option>All</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</select><ChevronDown size={15} className="absolute right-3 top-[13px] text-muted pointer-events-none"/></span></label>
      <div className="ml-auto flex gap-2"><button className="soft-button border border-slate-200 self-end" onClick={onReset}><FilterX size={15}/>Reset</button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 gap-2"><div className="inline-flex items-center gap-1.5"><CalendarDays size={13}/>{dateLabel(filters.from)} – {dateLabel(filters.to)} {filters.to.slice(0,4)} <span className="text-slate-300 mx-1">•</span> {canCompare(filters,data)?'Versus the preceding equal-duration period':'Prior-period comparison unavailable for this range'}</div><div className="flex items-center gap-2"><span>Trend grouping:</span><div className="inline-flex rounded-lg p-0.5 bg-slate-100">{(['day','week','month'] as Granularity[]).map(g=><button aria-label={`${g} trend grouping`} key={g} onClick={()=>onChange({...filters,granularity:g})} className={`rounded-md px-2.5 py-1 font-semibold capitalize ${filters.granularity===g?'bg-white text-ink shadow-sm':'hover:text-ink'}`}>{g}</button>)}</div></div></div>
  </div>
}
export function Section({title,subtitle,actions,children,className=''}:{title:string;subtitle?:string;actions?:ReactNode;children:ReactNode;className?:string}){
 return <section className={`panel min-w-0 ${className}`}><div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="section-title">{title}</h2>{subtitle&&<p className="text-xs text-muted mt-1 leading-relaxed">{subtitle}</p>}</div>{actions}</div><div className="px-5 pb-5">{children}</div></section>
}
export function Empty({message='No matching transactions. Adjust the filters to see results.'}:{message?:string}){return <div className="flex min-h-[180px] flex-col items-center justify-center text-center"><Activity size={27} className="text-slate-300 mb-3"/><span className="text-sm font-semibold text-slate-500">Nothing to show yet</span><p className="text-xs text-muted mt-1 max-w-xs">{message}</p></div>}
export function DefinitionModal({onClose}:{onClose:()=>void}){
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',listener);return()=>document.removeEventListener('keydown',listener)},[onClose]);
  const definitions=[
    ['GMV','Sum of selected order-line quantities × unit selling prices, before tax, discounts or refunds. All amounts are synthetic INR.'],
    ['Orders','Number of unique order IDs with at least one matching order line. A category-filtered order can have other categories excluded from GMV.'],
    ['Average Order Value','Selected GMV ÷ unique matching orders, including for category-filtered views.'],
    ['Active Customers','Unique customer IDs with ≥1 matching order in the chosen window.'],
    ['Repeat Customer Rate','Active customers with ≥2 unique matching orders in the selected period ÷ all active customers in that period.'],
    ['New versus Returning','A customer is new if their earliest transaction within the selected category/region scope falls in the chosen window. Chart counts monthly/weekly/daily new and returning distinct purchasers.'],
    ['Revenue Growth','(Selected window GMV − previous equal-length window GMV) ÷ previous GMV. If the earlier window predates the dataset or has zero GMV, comparison is unavailable.'],
    ['Retention Rate','Of customers who bought in the preceding equal-length window, the fraction that purchased again in the current window. A cohort-based metric, distinct from repeat-customer rate.'],
    ['RFM segmentation','Recency: days since most recent order as of period end (5≤14d,4≤30d,3≤60d,2≤120d,otherwise 1). Frequency/monetary: quintile ranks on scoped history through period end. Segments are illustrative rule buckets, not trained predictions.'],
    ['Category / Region','Revenue contribution = segment GMV ÷ selected GMV. All contributions sum to 100% before display rounding.'],
    ['Recommendations','Deterministic rule-based observations; potential impacts are explicitly labeled assumptions or sensitivities, never forecasts or machine-generated AI claims.'],
    ['Date range','Both endpoints included, fixed 2025-11-01 through 2026-10-31. Customer RFM is an as-of snapshot using scoped history before selected end; period-order columns remain date-window filtered.']
  ];
  return <div role="dialog" aria-modal="true" aria-labelledby="help-title" className="fixed inset-0 z-[80] flex justify-end"><button className="absolute inset-0 bg-navy-950/55" onClick={onClose} aria-label="Close methodology"/><div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl p-7"><div className="flex justify-between items-start gap-3"><div><div className="small-label text-accent-600">Transparency & auditability</div><h2 id="help-title" className="mt-2 text-2xl font-bold tracking-tight">How metrics are calculated</h2><p className="mt-2 text-sm text-muted">All values come from a deterministic, wholly synthetic transaction dataset.</p></div><button onClick={onClose} aria-label="Close" className="soft-button"><X size={20}/></button></div><div className="mt-6 space-y-2">{definitions.map(([label,desc])=><div className="border-b border-slate-100 pb-3 pt-2" key={label}><h3 className="text-sm font-semibold">{label}</h3><p className="text-xs text-muted mt-1.5 leading-relaxed">{desc}</p></div>)}</div><div className="mt-6 text-xs text-slate-500 bg-slate-50 rounded-xl p-4">Synthetic dataset seed: 24112026. Data is designed for an independent portfolio demonstration and is not affiliated with a real company's analytics system.</div></div></div>
}
export function DataFootnote({text}:{text:string}){return <p className="mt-4 text-[11px] leading-relaxed text-slate-400 flex gap-1.5 items-start"><Sparkles size={12} className="mt-0.5 shrink-0"/>{text}</p>}
export function ViewLink({onClick,children}:{onClick:()=>void;children:ReactNode}){return <button onClick={onClick} className="inline-flex items-center gap-1 text-accent-600 text-xs font-semibold hover:text-accent-700">{children}<ArrowUpRight size={14}/></button>}
export function Footer(){return <footer className="py-6 flex flex-wrap justify-between gap-2 text-[11px] text-slate-400"><span>© DeliverIt BI concept • Independent portfolio study</span><span>100% generated data · Not actual Urban Harvest performance</span></footer>}
