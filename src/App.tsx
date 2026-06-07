import { useState, useRef, useMemo, useEffect, Fragment, type SetStateAction } from "react";
import Papa from "papaparse";
import { parseDate } from "./parseDate";
import _ from "lodash";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RChart, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ── Default categories ────────────────────────────────────────────────────────
const INIT_CATS = [
  {id:"c1",  name:"Food & Drink",  color:"#f97316", type:"expense"},
  {id:"c2",  name:"Groceries",     color:"#22c55e", type:"expense"},
  {id:"c3",  name:"Transport",     color:"#3b82f6", type:"expense"},
  {id:"c4",  name:"Entertainment", color:"#a855f7", type:"expense"},
  {id:"c5",  name:"Shopping",      color:"#ec4899", type:"expense"},
  {id:"c6",  name:"Health",        color:"#14b8a6", type:"expense"},
  {id:"c7",  name:"Utilities",     color:"#eab308", type:"expense"},
  {id:"c8",  name:"Subscriptions", color:"#6366f1", type:"expense"},
  {id:"c9",  name:"Savings",       color:"#06b6d4", type:"savings"},
  {id:"c10", name:"Investment",    color:"#a78bfa", type:"investment"},
  {id:"c11", name:"Retirement",    color:"#f59e0b", type:"retirement"},
  {id:"c12", name:"Income",        color:"#10b981", type:"income"},
  {id:"c13", name:"Transfer",      color:"#6b7280", type:"transfer"},
  {id:"c14", name:"Other",         color:"#94a3b8", type:"expense"},
];

const TYPE_LABELS = {
  expense:"Expense",
  savings:"Savings account",
  investment:"Investment / Brokerage",
  retirement:"Retirement (401k / IRA / pension)",
  income:"Income",
  transfer:"Transfer (excluded from totals)",
};

// ── Auto-categorize ───────────────────────────────────────────────────────────
const RULES = [
  {c:"Retirement",    k:["401K","IRA","ROTH","HSA","PENSION","RETIREMENT CONTRIB","TIAA","VOYA"]},
  {c:"Savings",       k:["SAVINGS TRANSFER","HIGH YIELD","MARCUS","ALLY BANK","SYNCHRONY"]},
  {c:"Investment",    k:["FIDELITY","SCHWAB","VANGUARD","ETRADE","ROBINHOOD","BROKERAGE","AMERITRADE","BETTERMENT"]},
  {c:"Food & Drink",  k:["BREWING","COFFEE","CAFE","RESTAURANT","PIZZA","BAR","TAVERN","SQ *","STARBUCKS","DOORDASH","GRUBHUB","TACO","KITCHEN","GRILL","DUTCH BROS","BAKERY","TAPROOM","DONUT","DOUGHNUT","PHO","RAMEN","SANDWICH","SUBWAY","CHICKEN","WAFFLE","JUICE","SMOOTHIE","BAHN MI","BAGEL","CURRY","ICE CREAM","GELATO","POPEYES"]},
  {c:"Groceries",     k:["SAFEWAY","KROGER","WHOLE FOODS","TRADER JOE","FRED MEYER","WINCO","GROCERY","NEW SEASONS","NATURAL GROCERS","H-MART"]},
  {c:"Transport",     k:["LYFT","UBER","PARKING","SHELL","CHEVRON","ARCO","GAS","TRIMET","TRANSIT"]},
  {c:"Entertainment", k:["NETFLIX","SPOTIFY","HULU","DISNEY","HBO","YOUTUBE","TICKETMASTER","CINEMA","THEATER","AMC","TOMO","GYM","MOVEMENT","CIRCUIT"]},
  {c:"Shopping",      k:["AMAZON","TARGET","WALMART","COSTCO","EBAY","ETSY","NIKE","REI","NEXT ADVENTURE"]},
  {c:"Health",        k:["PHARMACY","CVS","WALGREENS","GYM","FITNESS","YOGA","PLANET FITNESS","DENTAL","MEDICAL","PROVIDENCE","KAISER"]},
  {c:"Utilities",     k:["ELECTRIC","INTERNET","COMCAST","XFINITY","PGE","AT&T","VERIZON","T-MOBILE","ELECTRICITY","WATER","GAS BILL","NW NATURAL"]},
  {c:"Income",        k:["PAYROLL","DIRECT DEPOSIT","SALARY","WAGES","DEPOSIT","REWARDS","INTEREST"]},
  {c:"Transfer",      k:["TRANSFER","ZELLE","VENMO","PAYPAL","CASH APP","ACH"]},
];
const autoCat = n => { const u=(n||"").toUpperCase(); for(const r of RULES) if(r.k.some(k=>u.toUpperCase().includes(k.toUpperCase()))) return r.c; return "Other"; };

// ── Column detection ──────────────────────────────────────────────────────────
const HINTS = {
  date:["date","transaction date","posted","trans date"],
  amount:["amount","transaction amount","debit/credit","value"],
  description:["description","name","merchant","payee","narrative","memo"],
  category:["category","type","label"],
  account:["account","account name"],
};
const detectCols = (hdrs: any) => {
  const m={date:"",amount:"",description:"",category:"",account:""};
  const lc=hdrs.map((h: string) => h.toLowerCase().trim());
  for(const [f,hints] of Object.entries(HINTS)) for(const h of hints){const i=lc.findIndex((l: string) => l===h||l.includes(h));if(i>=0&&!m[f]){m[f]=hdrs[i];break;}}
  return m;
};

// ── Utils ─────────────────────────────────────────────────────────────────────
const $  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const $d = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n||0);
const TODAY = new Date().toISOString().slice(0,10);
const PERIODS = ["3M","6M","YTD","1Y","All"];
const NAV = [
  {id:"overview",     icon:"ti-layout-dashboard", label:"Overview"},
  {id:"cashflow",     icon:"ti-arrows-exchange",  label:"Cash flow"},
  {id:"transactions", icon:"ti-list",             label:"Transactions"},
  {id:"categories",   icon:"ti-tags",             label:"Categories"},
];
const filterPeriod = (txns: any[], p: string) => {
  if(p==="All") return txns;
  const now=new Date(TODAY), c=new Date(now);
  if(p==="3M")  c.setMonth(c.getMonth()-3);
  else if(p==="6M")  c.setMonth(c.getMonth()-6);
  else if(p==="YTD") return txns.filter(t=>t.date>=`${now.getFullYear()}-01-01`);
  else if(p==="1Y")  c.setFullYear(c.getFullYear()-1);
  return txns.filter(t=>t.date>=c.toISOString().slice(0,10));
};
const eff = (t: { amount: number; split: any; }) => t.amount/(t.split||1);
const txnKey = (t: { date: string; amount: number; name: string; }) => `${t.date}|${t.amount}|${t.name}`;

// ── Shared stable components ──────────────────────────────────────────────────
const ChartTip = ({active,payload,label}: { active: boolean; payload: any[]; label: string; }) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#0d1117",borderRadius:8,padding:"10px 14px",border:"0.5px solid #1c2333"}}>
      <p style={{color:"#6b7280",fontSize:11,margin:"0 0 6px"}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color||p.stroke,fontSize:12,margin:"2px 0",fontWeight:500}}>{p.name}: {$(p.value)}</p>)}
    </div>
  );
};

const S_IN = {fontSize:12,padding:"7px 9px",borderRadius:8,border:"0.5px solid #e4e9f0",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box"};
const s_btn = (bg,col="#fff") => ({padding:"7px 14px",fontSize:12,fontWeight:500,border:"none",borderRadius:8,cursor:"pointer",background:bg,color:col});
// Inline edit input — borderless, just an underline accent
const IE = {fontSize:12,fontWeight:500,width:"100%",border:"none",borderBottom:"1.5px solid #6366f1",outline:"none",background:"transparent",padding:"1px 2px",boxSizing:"border-box",fontFamily:"inherit"};
// Editable field display hint
const ED = {cursor:"text",textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:"#d1d5db"};

function TxnForm({form,onChange,onSave,onCancel,cats,isNew}: { form: any; onChange: any; onSave: any; onCancel: any; cats: any[]; isNew: boolean; }) {
  const catColor = (n: string) => cats.find(c=>c.name===n)?.color||"#94a3b8";
  const disabled = !form.name||!form.amount||!form.date;
  const share = form.split>1 ? $d((parseFloat(form.amount)||0)/form.split) : null;
  return (
    <div style={{background:"#f8fafc",border:"0.5px solid #c7d2e0",borderRadius:10,padding:"14px 16px",marginBottom:8}}>
      <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>{isNew?"New transaction":"Edit transaction (date & split)"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <div><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Date</label>
          <input type="date" value={form.date} onChange={e=>onChange({...form,date:e.target.value})} style={S_IN}/></div>
        <div><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Amount <span style={{color:"#c8d0da"}}>(negative = expense)</span></label>
          <input type="number" placeholder="-25.00" value={form.amount} onChange={e=>onChange({...form,amount:e.target.value})} style={S_IN}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Name / Description</label>
          <input type="text" value={form.name} onChange={e=>onChange({...form,name:e.target.value})} style={S_IN}/></div>
        <div><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Category</label>
          <select value={form.category} onChange={e=>onChange({...form,category:e.target.value})} style={{...S_IN,color:catColor(form.category)}}>
            {cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select></div>
        <div><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Split N ways</label>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="number" min="1" max="20" value={form.split} onChange={e=>onChange({...form,split:Math.max(1,parseInt(e.target.value)||1)})} style={{...S_IN,width:64}}/>
            {share&&<span style={{fontSize:11,color:"#6366f1"}}>= {share} your share</span>}
          </div></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={s_btn("#f1f5f9","#64748b")}>Cancel</button>
        <button onClick={onSave} disabled={disabled} style={s_btn(disabled?"#f1f5f9":"#6366f1",disabled?"#94a3b8":"#fff")}>{isNew?"Add":"Save"}</button>
      </div>
    </div>
  );
}

function ImportWizard({step,headers,rows,colMap,onColMap,onFile,onImport,onCancel,fileRef,showCancel}: { step: string; headers: any[]; rows: any[]; colMap: any; onColMap: any; onFile: any; onImport: any; onCancel: any; fileRef: any; showCancel: boolean; }) {
  const can=colMap.date&&colMap.amount&&colMap.description;
  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:20}}>
        {["Upload file","Map columns"].map((s,i)=>{
          const active=(i===0&&step==="drop")||(i===1&&step==="map"),done=i===0&&step==="map";
          return (<div key={s} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:20,height:20,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,background:done?"#10b981":active?"#6366f1":"#f1f5f9",color:done||active?"#fff":"#94a3b8"}}>{done?"✓":i+1}</div>
            <span style={{fontSize:12,color:active?"var(--color-text-primary)":done?"#10b981":"#94a3b8",fontWeight:active?500:400}}>{s}</span>
            {i===0&&<span style={{color:"#d1d5db",margin:"0 3px",fontSize:14}}>›</span>}
          </div>);
        })}
        {showCancel&&<button onClick={onCancel} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18}}>✕</button>}
      </div>
      {step==="drop"&&(<>
        <div onClick={()=>fileRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files[0]);}}
          style={{border:"2px dashed #dde1e8",borderRadius:12,padding:"40px 24px",textAlign:"center",cursor:"pointer",background:"#f8fafc",marginBottom:14}}>
          <i className="ti ti-file-spreadsheet" style={{fontSize:32,color:"#c8d0da",display:"block",marginBottom:12}} aria-hidden/>
          <div style={{fontWeight:500,fontSize:15,marginBottom:4}}>Drop your CSV here</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:14}}>or click to browse files</div>
          <div style={{display:"flex",justifyContent:"center",gap:6,flexWrap:"wrap"}}>
            {["Chase","Bank of America","Wells Fargo","Fidelity","Schwab","Any format"].map(b=>(
              <span key={b} style={{fontSize:10,background:"#f1f5f9",color:"#6b7280",padding:"2px 8px",borderRadius:10}}>{b}</span>))}
          </div>
        </div>
        <input type="file" accept=".csv" ref={fileRef} onChange={e=>onFile(e.target.files[0])} style={{display:"none"}}/>
        <p style={{fontSize:11,color:"#94a3b8",margin:0,textAlign:"center"}}>
          <i className="ti ti-lock" style={{fontSize:12,verticalAlign:"-1px",marginRight:4}} aria-hidden/>All data stays on your device
        </p>
      </>)}
      {step==="map"&&(<>
        <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 14px"}}>{rows.length.toLocaleString()} rows · {headers.length} columns detected.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[{f:"date",l:"Date",req:true},{f:"amount",l:"Amount",req:true},{f:"description",l:"Description",req:true},{f:"category",l:"Category",req:false},{f:"account",l:"Account",req:false}].map(({f,l,req})=>(
            <div key={f}>
              <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>{l}{req&&<span style={{color:"#f43f5e",marginLeft:2}}>*</span>}{colMap[f]&&<span style={{color:"#10b981",marginLeft:5,fontSize:10}}>✓ detected</span>}</label>
              <select value={colMap[f]} onChange={e=>onColMap({...colMap,[f]:e.target.value})} style={{...S_IN,border:`0.5px solid ${colMap[f]?"#10b981":"#e4e9f0"}`,color:colMap[f]?"var(--color-text-primary)":"#94a3b8"}}>
                <option value="">{req?"— select —":"— optional —"}</option>
                {headers.map(h=><option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:500,color:"#94a3b8",marginBottom:6,textTransform:"uppercase",letterSpacing:".07em"}}>Preview · first 3 rows</div>
          <div style={{border:"0.5px solid #e4e9f0",borderRadius:8,overflow:"hidden"}}>
            <table style={{width:"100%",fontSize:11,borderCollapse:"collapse",tableLayout:"fixed"}}>
              <thead><tr style={{background:"#f8fafc"}}>{["date","description","amount","category"].filter(k=>colMap[k]).map(k=>(<th key={k} style={{padding:"6px 8px",textAlign:"left",color:"#94a3b8",fontWeight:500,borderBottom:"0.5px solid #e4e9f0",textTransform:"capitalize"}}>{k}</th>))}</tr></thead>
              <tbody>{rows.slice(0,3).map((row,i)=>(<tr key={i} style={{borderBottom:"0.5px solid #f8fafc"}}>{["date","description","amount","category"].filter(k=>colMap[k]).map(k=>(<td key={k} style={{padding:"6px 8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{colMap[k]?row[colMap[k]]||"—":"—"}</td>))}</tr>))}</tbody>
            </table>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <button onClick={()=>onColMap({...colMap,_reset:true})} style={s_btn("#f1f5f9","#64748b")}>← Back</button>
          <button onClick={onImport} disabled={!can} style={s_btn(can?"#6366f1":"#f1f5f9",can?"#fff":"#94a3b8")}>Import {rows.length.toLocaleString()} transactions →</button>
        </div>
      </>)}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [txns,       setTxns]       = useState([]);
  const [cats,       setCats]       = useState(INIT_CATS);
  const [period,     setPeriod]     = useState("6M");
  const [view,       setView]       = useState("overview");
  const [catFilter,  setCatFilter]  = useState(null);
  const [recentCat,  setRecentCat]  = useState("");
  const [search,     setSearch]     = useState("");
  const [imported,   setImported]   = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [importResult,setImportResult]=useState(null);
  const [menuId,     setMenuId]     = useState(null);
  const [inlineEdit, setInlineEdit] = useState(null); // {id, field, value}
  const [editTxn,    setEditTxn]    = useState(null);
  const [txnForm,    setTxnForm]    = useState({date:TODAY,name:"",amount:"",category:"Other",split:1});
  const [editCat,    setEditCat]    = useState(null);
  const [catForm,    setCatForm]    = useState({name:"",color:"#6366f1",type:"expense"});
  const [delCatId,   setDelCatId]   = useState(null);
  const [csvStep,    setCsvStep]    = useState("drop");
  const [csvHdrs,    setCsvHdrs]    = useState([]);
  const [csvRows,    setCsvRows]    = useState([]);
  const [colMap,     setColMap]     = useState({date:"",amount:"",description:"",category:"",account:""});
  const [loaded,     setLoaded]     = useState(false);
  const fileRef = useRef();

  useEffect(()=>{
    if(!menuId) return;
    const h=()=>setMenuId(null);
    document.addEventListener("click",h);
    return ()=>document.removeEventListener("click",h);
  },[menuId]);

  useEffect(()=>{
    try{const raw=localStorage.getItem("fw8");if(raw){const d=JSON.parse(raw);setTxns(d.txns||[]);setCats(d.cats||INIT_CATS);setImported(d.txns?.length>0);}}catch(e){console.warn("Failed to load saved data:",e);}
    setLoaded(true);
  },[]);
  useEffect(()=>{
    if(!loaded) return;
    try{localStorage.setItem("fw8",JSON.stringify({txns,cats}));}catch(e){console.warn("Failed to save data:",e);}
  },[txns,cats,loaded]);

  const catColor = n => cats.find(c=>c.name===n)?.color||"#94a3b8";
  const navTo = v => { setView(v);setShowUpload(false);setCatFilter(null);setSearch("");setEditTxn(null);setEditCat(null);setMenuId(null);setInlineEdit(null);setImportResult(null); };

  // ── Category buckets ───────────────────────────────────────────────────────
  const incomeCats  = useMemo(()=>cats.filter(c=>c.type==="income").map(c=>c.name),[cats]);
  const savingsCats = useMemo(()=>cats.filter(c=>c.type==="savings").map(c=>c.name),[cats]);
  const investCats  = useMemo(()=>cats.filter(c=>c.type==="investment").map(c=>c.name),[cats]);
  const retireCats  = useMemo(()=>cats.filter(c=>c.type==="retirement").map(c=>c.name),[cats]);
  const xferCats    = useMemo(()=>cats.filter(c=>c.type==="transfer").map(c=>c.name),[cats]);
  const nonExpense  = useMemo(()=>[...incomeCats,...savingsCats,...investCats,...retireCats,...xferCats],[incomeCats,savingsCats,investCats,retireCats,xferCats]);

  // ── Computed data ──────────────────────────────────────────────────────────
  const periodTxns  = useMemo(()=>filterPeriod(txns,period),[txns,period]);
  // Always include the active catFilter in the chip list so it stays visible
  // (and clearable) even when there are no matching transactions in the period.
  const presentCats = useMemo(()=>{
    const s = new Set(periodTxns.map(t=>t.category).filter(Boolean));
    if(catFilter) s.add(catFilter);
    return [...s].sort();
  },[periodTxns, catFilter]);
  const filtered    = useMemo(()=>{
    let t=[...periodTxns];
    if(catFilter) t=t.filter(x=>x.category===catFilter);
    if(search)    t=t.filter(x=>x.name.toLowerCase().includes(search.toLowerCase()));
    return t.sort((a,b)=>b.date.localeCompare(a.date));
  },[periodTxns,catFilter,search]);

  const totals = useMemo(()=>{
    const inc = periodTxns.filter(t=>incomeCats.includes(t.category)).reduce((s,t)=>s+eff(t),0);
    const sav = Math.abs(periodTxns.filter(t=>savingsCats.includes(t.category)&&t.amount<0).reduce((s,t)=>s+eff(t),0));
    const inv = Math.abs(periodTxns.filter(t=>investCats.includes(t.category)&&t.amount<0).reduce((s,t)=>s+eff(t),0));
    const ret = Math.abs(periodTxns.filter(t=>retireCats.includes(t.category)&&t.amount<0).reduce((s,t)=>s+eff(t),0));
    const sp  = Math.abs(periodTxns.filter(t=>t.amount<0&&!nonExpense.includes(t.category)).reduce((s,t)=>s+eff(t),0));
    return {income:Math.round(inc),savings:Math.round(sav),investments:Math.round(inv),retirement:Math.round(ret),spending:Math.round(sp),net:Math.round(inc-sav-inv-ret-sp)};
  },[periodTxns,incomeCats,savingsCats,investCats,retireCats,nonExpense]);

  const monthlyData = useMemo(()=>{
    const ms=_.uniq(periodTxns.map(t=>t.date.slice(0,7))).sort();
    return ms.map(m=>{
      const mt=periodTxns.filter(t=>t.date.startsWith(m));
      const inc=mt.filter(t=>incomeCats.includes(t.category)).reduce((s,t)=>s+eff(t),0);
      const sav=Math.abs(mt.filter(t=>savingsCats.includes(t.category)&&t.amount<0).reduce((s,t)=>s+eff(t),0));
      const inv=Math.abs(mt.filter(t=>investCats.includes(t.category)&&t.amount<0).reduce((s,t)=>s+eff(t),0));
      const ret=Math.abs(mt.filter(t=>retireCats.includes(t.category)&&t.amount<0).reduce((s,t)=>s+eff(t),0));
      const sp =Math.abs(mt.filter(t=>t.amount<0&&!nonExpense.includes(t.category)).reduce((s,t)=>s+eff(t),0));
      const [yr,mo]=m.split("-");
      const label=new Date(+yr,+mo-1,1).toLocaleString("en-US",{month:"short"});
      return {month:label,ym:m,income:Math.round(inc),savings:Math.round(sav),investments:Math.round(inv),retirement:Math.round(ret),spending:Math.round(sp),net:Math.round(inc-sav-inv-ret-sp)};
    });
  },[periodTxns,incomeCats,savingsCats,investCats,retireCats,nonExpense]);

  const catData = useMemo(()=>{
    const sp=periodTxns.filter(t=>t.amount<0&&!nonExpense.includes(t.category));
    return Object.entries(_.groupBy(sp,"category"))
      .map(([name,ts])=>({name,value:Math.round(Math.abs(_.sumBy(ts,eff)))}))
      .sort((a,b)=>b.value-a.value);
  },[periodTxns,nonExpense]);

  // ── CSV handlers ───────────────────────────────────────────────────────────
  const descBlacklist = ["MOBILE PAYMENT THANK YOU","PAID"];
  const handleFile=(f: any)=>{if(!f)return;Papa.parse(f,{header:true,skipEmptyLines:true,complete:({data,meta})=>{setCsvHdrs(meta.fields||[]);setCsvRows(data);setColMap(detectCols(meta.fields||[]));setCsvStep("map");}});};
  const handleColMap=(m: SetStateAction<{ date: string; amount: string; description: string; category: string; account: string; }>)=>{if(m._reset){setCsvStep("drop");setCsvHdrs([]);setCsvRows([]);setColMap({date:"",amount:"",description:"",category:"",account:""});}else setColMap(m);};
  const handleImport=()=>{
    const parsed=csvRows.map((row,i)=>{
      const name=(row[colMap.description]||"").trim();
      const amt=parseFloat((row[colMap.amount]||"0").replace(/[$,\s]/g,""))||0;
      const cat=colMap.category&&row[colMap.category]?row[colMap.category]:autoCat(name);
      const date=parseDate(row[colMap.date]||"");
      return {id:`${date}|${amt}|${name}`,date,name,amount:amt,category:cat,split:1,account:colMap.account?row[colMap.account]||"":""};
    }).filter(t=>t.date&&t.name&&t.amount!==0&&!descBlacklist.some(b=>t.name.toUpperCase().includes(b.toUpperCase())));
    const existingKeys=new Set(txns.map(txnKey));
    const newOnes=parsed.filter(t=>!existingKeys.has(txnKey(t)));
    setTxns(prev=>[...prev,...newOnes].sort((a,b)=>b.date.localeCompare(a.date)));
    setImportResult({added:newOnes.length,skipped:parsed.length-newOnes.length});
    setImported(true);setShowUpload(false);setCsvStep("drop");setView("transactions");
  };
  const triggerImport=()=>{if(txns.length===0){setView("transactions");}else{setShowUpload(true);}};

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV=()=>{
    const cols=["Date","Name","Category","Amount","Effective Amount","Split","Account"];
    const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const rows=filtered.map(t=>[
      t.date, esc(t.name), t.category, t.amount,
      eff(t).toFixed(2), t.split||1, esc(t.account||""),
    ]);
    const csv=[cols.join(","),...rows.map(r=>r.join(","))].join("\n");
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download=`flowly-${TODAY}.csv`;
    a.click();
  };

  // ── Txn CRUD ───────────────────────────────────────────────────────────────
  const openAdd  = ()=>{setTxnForm({date:TODAY,name:"",amount:"",category:cats.find(c=>c.type==="expense")?.name||"Other",split:1});setEditTxn("new");setMenuId(null);setInlineEdit(null);};
  const openEdit = t=>{setTxnForm({date:t.date,name:t.name,amount:String(t.amount),category:t.category,split:t.split||1});setEditTxn(t);setMenuId(null);setInlineEdit(null);};
  const saveTxn  = ()=>{
    const d={date:txnForm.date,name:txnForm.name,amount:parseFloat(txnForm.amount)||0,category:txnForm.category,split:Math.max(1,parseInt(txnForm.split)||1)};
    if(editTxn==="new") setTxns(p=>[{id:`m${Date.now()}`,...d},...p]);
    else setTxns(p=>p.map(x=>x.id===editTxn.id?{...x,...d}:x));
    setEditTxn(null);
  };
  const delTxn=id=>{setTxns(p=>p.filter(x=>x.id!==id));setMenuId(null);};

  // ── Inline edit ────────────────────────────────────────────────────────────
  const startInline=(id,field,value)=>{setInlineEdit({id,field,value:String(value)});setEditTxn(null);};
  const commitInline=()=>{
    if(!inlineEdit) return;
    const {id,field,value}=inlineEdit;
    const v=field==="amount"?(parseFloat(value)||0):value.trim();
    if(v!=null && v!=="") setTxns(p=>p.map(t=>t.id===id?{...t,[field]:v}:t));
    setInlineEdit(null);
  };
  const commitCat=(id,value)=>{setTxns(p=>p.map(t=>t.id===id?{...t,category:value}:t));setInlineEdit(null);};

  // ── Cat CRUD ───────────────────────────────────────────────────────────────
  const openAddCat=()=>{setCatForm({name:"",color:"#6366f1",type:"expense"});setEditCat("new");};
  const openEditCat=c=>{setCatForm({name:c.name,color:c.color,type:c.type||"expense"});setEditCat(c.id);};
  const saveCat=()=>{
    if(editCat==="new"){setCats(p=>[...p,{id:`c${Date.now()}`,...catForm}]);}
    else{const old=cats.find(c=>c.id===editCat);if(old?.name!==catForm.name)setTxns(p=>p.map(t=>t.category===old.name?{...t,category:catForm.name}:t));setCats(p=>p.map(c=>c.id===editCat?{...c,...catForm}:c));}
    setEditCat(null);
  };
  const confirmDelCat=id=>{const cat=cats.find(c=>c.id===id);if(cat){setTxns(p=>p.map(t=>t.category===cat.name?{...t,category:"Other"}:t));setCats(p=>p.filter(c=>c.id!==id));}setDelCatId(null);};

  // ── Chart ──────────────────────────────────────────────────────────────────
  const CHART_SERIES=[
    {c:"#10b981",l:"Income"},{c:"#06b6d4",l:"Savings"},{c:"#a78bfa",l:"Investment"},
    {c:"#f59e0b",l:"Retirement"},{c:"#f43f5e",l:"Spending"},{c:"#475569",l:"Net",dash:true},
  ];
  const ChartLegend=()=>(
    <div style={{display:"flex",gap:10,fontSize:11,color:"#94a3b8",flexWrap:"wrap"}}>
      {CHART_SERIES.map(x=>(
        <span key={x.l} style={{display:"flex",alignItems:"center",gap:4}}>
          {x.dash?<span style={{width:14,height:2,background:"#475569",display:"inline-block",borderRadius:1}}/>
                 :<span style={{width:8,height:8,borderRadius:2,background:x.c,display:"inline-block"}}/>}
          {x.l}
        </span>
      ))}
    </div>
  );
  const CashFlowChart=({h})=>(
    <ResponsiveContainer width="100%" height={h}>
      <ComposedChart data={monthlyData} margin={{top:4,right:4,left:0,bottom:0}} barCategoryGap="36%" barGap={1}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`$${Math.round(v/1000)}k`} width={34}/>
        <RChart content={<ChartTip/>}/>
        <Bar dataKey="income"      name="Income"      fill="#10b981" radius={[3,3,0,0]} maxBarSize={16}/>
        <Bar dataKey="savings"     name="Savings"     fill="#06b6d4" radius={[3,3,0,0]} maxBarSize={16}/>
        <Bar dataKey="investments" name="Investment"  fill="#a78bfa" radius={[3,3,0,0]} maxBarSize={16}/>
        <Bar dataKey="retirement"  name="Retirement"  fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={16}/>
        <Bar dataKey="spending"    name="Spending"    fill="#f43f5e" radius={[3,3,0,0]} maxBarSize={16}/>
        <Line type="monotone" dataKey="net" name="Net" stroke="#475569" strokeWidth={2} strokeDasharray="5 3" dot={{r:2.5,fill:"#475569"}}/>
      </ComposedChart>
    </ResponsiveContainer>
  );

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card={background:"#fff",border:"0.5px solid #e4e9f0",borderRadius:12,padding:"16px 18px"};
  const catTotal=catData.reduce((s,c)=>s+c.value,0);
  const Chip=({label,active,color,onClick})=>(
    <button onClick={onClick} style={{padding:"3px 10px",fontSize:11,border:`0.5px solid ${active?color||"#6366f1":"#e4e9f0"}`,borderRadius:20,cursor:"pointer",fontWeight:active?500:400,background:active?color||"#6366f1":"#fff",color:active?"#fff":"#64748b",whiteSpace:"nowrap"}}>{label}</button>
  );
  const TxnMenu=({t})=>(
    <div style={{position:"relative",flexShrink:0}}>
      <button onClick={e=>{e.stopPropagation();setMenuId(menuId===t.id?null:t.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:"3px 7px",fontSize:18,lineHeight:1,borderRadius:6}}>⋮</button>
      {menuId===t.id&&(
        <div style={{position:"absolute",right:0,top:"calc(100% + 2px)",background:"#fff",border:"0.5px solid #e4e9f0",borderRadius:10,padding:"4px",zIndex:30,minWidth:130}}>
          <button onClick={()=>openEdit(t)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",fontSize:12,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-primary)",borderRadius:7}}><i className="ti ti-edit" style={{fontSize:14,color:"#6366f1"}} aria-hidden/>Edit date &amp; split</button>
          <button onClick={()=>delTxn(t.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",fontSize:12,background:"none",border:"none",cursor:"pointer",color:"#ef4444",borderRadius:7}}><i className="ti ti-trash" style={{fontSize:14}} aria-hidden/>Delete</button>
        </div>
      )}
    </div>
  );

  // ── Views ──────────────────────────────────────────────────────────────────
  const renderView=()=>{

    if(view==="transactions"){
      if(txns.length===0) return (
        <div style={{...card,maxWidth:520,margin:"0 auto"}}>
          <div style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:500,marginBottom:4}}>Import your transactions</div><div style={{fontSize:12,color:"#94a3b8"}}>Upload a CSV export from your bank or brokerage to get started.</div></div>
          <ImportWizard step={csvStep} headers={csvHdrs} rows={csvRows} colMap={colMap} onColMap={handleColMap} onFile={handleFile} onImport={handleImport} onCancel={null} fileRef={fileRef} showCancel={false}/>
        </div>
      );
      return (
        <div style={card}>
          <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:500,flex:1}}>Transactions <span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>({filtered.length})</span></span>
            <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{...S_IN,width:140,padding:"5px 9px"}}/>
            <button onClick={exportCSV} title={`Export ${filtered.length} transactions as CSV`} style={{...s_btn("#f1f5f9","#475569"),display:"flex",alignItems:"center",gap:4,padding:"6px 11px",fontSize:11}}><i className="ti ti-download" style={{fontSize:12}} aria-hidden/>Export</button>
            <button onClick={openAdd} style={{...s_btn("#6366f1"),display:"flex",alignItems:"center",gap:4,padding:"6px 11px",fontSize:11}}><i className="ti ti-plus" style={{fontSize:12}} aria-hidden/>Add</button>
          </div>

          {/* Category chips */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10,paddingBottom:10,borderBottom:"0.5px solid #f1f5f9"}}>
            <Chip label="All" active={!catFilter} onClick={()=>setCatFilter(null)}/>
            {presentCats.map(cat=>(<Chip key={cat} label={cat} active={catFilter===cat} color={catColor(cat)} onClick={()=>setCatFilter(catFilter===cat?null:cat)}/>))}
          </div>

          {/* Import result banner */}
          {importResult&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 13px",background:"#f0fdf4",border:"0.5px solid #bbf7d0",borderRadius:8,marginBottom:10,fontSize:12}}>
              <span style={{color:"#166534"}}>✓ <strong>{importResult.added}</strong> transaction{importResult.added!==1?"s":""} added{importResult.skipped>0&&<> · <strong>{importResult.skipped}</strong> duplicate{importResult.skipped!==1?"s":""} skipped</>}</span>
              <button onClick={()=>setImportResult(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#166534",fontSize:15,lineHeight:1,padding:"0 0 0 10px"}}>✕</button>
            </div>
          )}

          {/* Hint */}
          <div style={{fontSize:10,color:"#b0b8c6",marginBottom:8,display:"flex",alignItems:"center",gap:4}}>
            <i className="ti ti-pencil" style={{fontSize:11}} aria-hidden/>
            Click any <span style={{...ED,color:"#b0b8c6",margin:"0 2px"}}>underlined</span> field to edit · Enter or blur to save · Esc to cancel · ⋮ for date, split &amp; delete
          </div>

          {editTxn==="new"&&(
            <TxnForm form={txnForm} onChange={setTxnForm} onSave={saveTxn} onCancel={()=>setEditTxn(null)} cats={cats} isNew/>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 110px 92px 32px",gap:6,padding:"4px 0 7px",borderBottom:"1px solid #f1f5f9",fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".08em"}}>
            <span>Name</span><span>Category</span><span style={{textAlign:"right"}}>Amount</span><span/>
          </div>

          {filtered.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#94a3b8",fontSize:13}}>No transactions match the current filter.</div>}

          {/* ── Transaction rows — inline editing is conditional JSX, not sub-components ── */}
          {filtered.slice(0,120).map(t=>{
            const eN=inlineEdit?.id===t.id&&inlineEdit?.field==="name";
            const eC=inlineEdit?.id===t.id&&inlineEdit?.field==="category";
            const eA=inlineEdit?.id===t.id&&inlineEdit?.field==="amount";
            return (
              <Fragment key={t.id}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 110px 92px 32px",gap:6,padding:"7px 0",borderBottom:"0.5px solid #f8f9fc",alignItems:"center",background:(eN||eC||eA)?"#fafbff":"transparent"}}>

                  {/* Name cell */}
                  <div style={{minWidth:0}}>
                    {eN
                      ? <input autoFocus value={inlineEdit.value}
                          onChange={e=>setInlineEdit(v=>({...v,value:e.target.value}))}
                          onBlur={commitInline}
                          onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setInlineEdit(null);}}
                          style={IE}/>
                      : <div onClick={()=>startInline(t.id,"name",t.name)} title="Click to edit"
                          style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",...ED}}>
                          {t.name}
                        </div>
                    }
                    <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>{t.date}</div>
                  </div>

                  {/* Category cell */}
                  {eC
                    ? <select autoFocus value={inlineEdit.value}
                        onChange={e=>commitCat(t.id,e.target.value)}
                        onBlur={()=>setInlineEdit(null)}
                        style={{...IE,color:catColor(inlineEdit.value),padding:"1px 0",cursor:"pointer"}}>
                        {cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    : <div onClick={()=>startInline(t.id,"category",t.category)} title="Click to change category"
                        style={{fontSize:11,color:catColor(t.category),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",...ED}}>
                        {t.category}
                      </div>
                  }

                  {/* Amount cell */}
                  <div style={{textAlign:"right"}}>
                    {eA
                      ? <input autoFocus type="number" value={inlineEdit.value}
                          onChange={e=>setInlineEdit(v=>({...v,value:e.target.value}))}
                          onBlur={commitInline}
                          onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setInlineEdit(null);}}
                          style={{...IE,textAlign:"right",color:parseFloat(inlineEdit.value||0)>=0?"#10b981":"#f43f5e"}}/>
                      : <div onClick={()=>startInline(t.id,"amount",t.amount)} title="Click to edit (original pre-split amount)" style={{cursor:"text"}}>
                          <div style={{fontSize:12,fontWeight:500,color:t.amount>=0?"#10b981":"#f43f5e",...ED}}>
                            {t.amount>=0?"+":"-"}{$(Math.abs(eff(t)))}
                          </div>
                          {t.split>1&&<div style={{fontSize:9,color:"#94a3b8"}}>÷{t.split} of {$(Math.abs(t.amount))}</div>}
                        </div>
                    }
                  </div>

                  <TxnMenu t={t}/>
                </div>
                {editTxn?.id===t.id&&<TxnForm form={txnForm} onChange={setTxnForm} onSave={saveTxn} onCancel={()=>setEditTxn(null)} cats={cats} isNew={false}/>}
              </Fragment>
            );
          })}
          {filtered.length>120&&<p style={{fontSize:11,color:"#94a3b8",textAlign:"center",marginTop:10}}>Showing 120 of {filtered.length}</p>}
        </div>
      );
    }

    if(view==="categories") return (
      <>
        <div style={{...card,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div><span style={{fontSize:13,fontWeight:500}}>Manage categories</span><div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Category type controls chart placement and totals</div></div>
            <button onClick={openAddCat} style={{...s_btn("#6366f1"),display:"flex",alignItems:"center",gap:4,padding:"6px 11px",fontSize:11,flexShrink:0,marginLeft:12}}><i className="ti ti-plus" style={{fontSize:12}} aria-hidden/>Add</button>
          </div>
          {/* Retirement tip */}
          <div style={{padding:"9px 12px",background:"#fffbeb",border:"0.5px solid #fde68a",borderRadius:8,marginBottom:12,fontSize:11,color:"#92400e"}}>
            💡 <strong>Retirement contributions</strong> (401k, IRA, HSA) rarely appear in bank statements since they're payroll deductions. Add them manually in Transactions using the "Retirement" category to track the full picture alongside bank data.
          </div>
          {editCat==="new"&&(
            <div style={{background:"#f8fafc",border:"0.5px solid #c7d2e0",borderRadius:10,padding:"14px",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>New category</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 52px 1fr",gap:8,marginBottom:10}}>
                <div><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Name</label><input value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} placeholder="e.g. HSA" style={S_IN}/></div>
                <div><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Color</label><input type="color" value={catForm.color} onChange={e=>setCatForm(f=>({...f,color:e.target.value}))} style={{width:"100%",height:36,borderRadius:8,border:"0.5px solid #e4e9f0",cursor:"pointer",padding:2}}/></div>
                <div><label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:3}}>Type</label><select value={catForm.type} onChange={e=>setCatForm(f=>({...f,type:e.target.value}))} style={S_IN}>{Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setEditCat(null)} style={s_btn("#f1f5f9","#64748b")}>Cancel</button>
                <button onClick={saveCat} disabled={!catForm.name} style={s_btn(!catForm.name?"#f1f5f9":"#6366f1",!catForm.name?"#94a3b8":"#fff")}>Add</button>
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:8}}>
            {cats.map(c=>{
              const isEd=editCat===c.id, count=txns.filter(t=>t.category===c.name).length;
              return (
                <div key={c.id} style={{border:"0.5px solid #e4e9f0",borderRadius:8,padding:"10px 12px",background:isEd?"#f8fafc":"#fff"}}>
                  {isEd?(
                    <>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 44px",gap:6,marginBottom:6}}><input value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} style={{...S_IN,fontSize:12}}/><input type="color" value={catForm.color} onChange={e=>setCatForm(f=>({...f,color:e.target.value}))} style={{width:"100%",height:35,borderRadius:8,border:"0.5px solid #e4e9f0",cursor:"pointer",padding:2}}/></div>
                      <select value={catForm.type} onChange={e=>setCatForm(f=>({...f,type:e.target.value}))} style={{...S_IN,fontSize:11,marginBottom:6}}>{Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
                      <div style={{display:"flex",gap:5}}><button onClick={()=>setEditCat(null)} style={{...s_btn("#f1f5f9","#64748b"),fontSize:11,padding:"4px 8px",flex:1}}>Cancel</button><button onClick={saveCat} style={{...s_btn("#6366f1"),fontSize:11,padding:"4px 8px",flex:1}}>Save</button></div>
                    </>
                  ):(
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:3,background:c.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:9,color:"#94a3b8"}}>{TYPE_LABELS[c.type]||c.type} · {count}</div></div>
                      <button onClick={()=>openEditCat(c)} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:"2px 3px",fontSize:13}}><i className="ti ti-edit" aria-hidden/></button>
                      {delCatId===c.id?(<div style={{display:"flex",gap:3}}><button onClick={()=>confirmDelCat(c.id)} style={{fontSize:10,background:"#fef2f2",color:"#ef4444",border:"none",borderRadius:5,padding:"2px 6px",cursor:"pointer"}}>Yes</button><button onClick={()=>setDelCatId(null)} style={{fontSize:10,background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:5,padding:"2px 6px",cursor:"pointer"}}>No</button></div>):(<button onClick={()=>setDelCatId(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:"2px 3px",fontSize:13}}><i className="ti ti-trash" aria-hidden/></button>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:13,fontWeight:500}}>Spending &amp; saving breakdown</span><span style={{fontSize:11,color:"#94a3b8"}}>{$(catTotal)} total</span></div>
          {catData.length===0?(<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:"24px 0"}}>No data yet.</p>):(
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              <ResponsiveContainer width={155} height={155}><PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="value" paddingAngle={2}>{catData.map((d,i)=><Cell key={i} fill={catColor(d.name)}/>)}</Pie><RChart formatter={v=>$(v)} contentStyle={{background:"#0d1117",border:"none",borderRadius:8,fontSize:12}}/></PieChart></ResponsiveContainer>
              <div style={{flex:1,minWidth:200}}>{catData.map(d=>{const pct=catTotal>0?Math.round(d.value/catTotal*100):0;return(<div key={d.name} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:2,background:catColor(d.name)}}/><span style={{fontWeight:500}}>{d.name}</span></div><div style={{display:"flex",gap:8}}><span style={{color:"#94a3b8"}}>{pct}%</span><span style={{fontWeight:500}}>{$(d.value)}</span></div></div><div style={{height:4,background:"#f1f5f9",borderRadius:4}}><div style={{height:4,width:`${pct}%`,background:catColor(d.name),borderRadius:4}}/></div></div>);})}</div>
            </div>
          )}
        </div>
      </>
    );

    if(view==="cashflow") return (
      <>
        <div style={{...card,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><div style={{fontSize:13,fontWeight:500}}>Monthly cash flow</div><div style={{fontSize:11,color:"#94a3b8"}}>Each category type shown separately — no double counting</div></div>
            <ChartLegend/>
          </div>
          {monthlyData.length===0?(<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:"40px 0"}}>No data yet — import transactions to see cash flow.</p>):(<CashFlowChart h={260}/>)}
        </div>
        <div style={card}>
          <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Monthly summary</div>
          {monthlyData.length===0?(<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:"24px 0"}}>No data yet.</p>):(
            <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:"1px solid #f1f5f9"}}>{["Month","Income","Savings","Invest","Retire","Spending","Net","Rate"].map(h=>(<th key={h} style={{padding:"5px 0",textAlign:h==="Month"?"left":"right",fontWeight:500,color:"#94a3b8",fontSize:9,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>))}</tr></thead>
              <tbody>{[...monthlyData].reverse().map(d=>{
                const rate=d.income>0?Math.round(((d.savings+d.investments+d.retirement+d.net)/d.income)*100):0;
                return(<tr key={d.ym} style={{borderBottom:"0.5px solid #f8f9fc"}}>
                  <td style={{padding:"7px 0",fontWeight:500}}>{d.month} '{d.ym?.slice(2,4)}</td>
                  <td style={{padding:"7px 0",textAlign:"right",color:"#10b981"}}>{$(d.income)}</td>
                  <td style={{padding:"7px 0",textAlign:"right",color:"#06b6d4"}}>{$(d.savings)}</td>
                  <td style={{padding:"7px 0",textAlign:"right",color:"#a78bfa"}}>{$(d.investments)}</td>
                  <td style={{padding:"7px 0",textAlign:"right",color:"#f59e0b"}}>{$(d.retirement)}</td>
                  <td style={{padding:"7px 0",textAlign:"right",color:"#f43f5e"}}>{$(d.spending)}</td>
                  <td style={{padding:"7px 0",textAlign:"right",color:d.net>=0?"#475569":"#f43f5e",fontWeight:500}}>{$(d.net)}</td>
                  <td style={{padding:"7px 0",textAlign:"right",color:rate>=20?"#10b981":rate>=10?"#f59e0b":"#f43f5e"}}>{rate}%</td>
                </tr>);
              })}</tbody>
            </table>
          )}
        </div>
      </>
    );

    // Overview
    const recentTxns=periodTxns.filter(t=>t.amount<0&&!xferCats.includes(t.category)&&(recentCat?t.category===recentCat:true)).sort((a,b)=>b.date.localeCompare(a.date));
    const spendCatsInPeriod=_.uniq(periodTxns.filter(t=>t.amount<0&&!xferCats.includes(t.category)).map(t=>t.category)).sort();
    if(txns.length===0) return (
      <div style={{...card,maxWidth:520,margin:"0 auto"}}>
        <div style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:500,marginBottom:4}}>Welcome to Flowly</div><div style={{fontSize:12,color:"#94a3b8"}}>Import a bank or brokerage CSV to see your cash flow overview.</div></div>
        <ImportWizard step={csvStep} headers={csvHdrs} rows={csvRows} colMap={colMap} onColMap={handleColMap} onFile={handleFile} onImport={handleImport} onCancel={null} fileRef={fileRef} showCancel={false}/>
      </div>
    );
    return (
      <>
        <div style={{...card,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{fontSize:13,fontWeight:500}}>Cash flow</div><div style={{fontSize:11,color:"#94a3b8"}}>Monthly overview</div></div><ChartLegend/></div>
          <CashFlowChart h={175}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"5fr 4fr",gap:12}}>
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontSize:13,fontWeight:500}}>Spending by category</span><span style={{fontSize:11,color:"#94a3b8"}}>{$(catTotal)} total</span></div>
            {catData.slice(0,6).map(d=>{const pct=catTotal>0?Math.round(d.value/catTotal*100):0,active=catFilter===d.name;return(<div key={d.name} style={{marginBottom:9,cursor:"pointer"}} onClick={()=>setCatFilter(active?null:d.name)}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:catColor(d.name)}}/><span style={{color:active?"var(--color-text-primary)":"#64748b",fontWeight:active?500:400}}>{d.name}</span></div><span style={{fontWeight:500}}>{$(d.value)}</span></div><div style={{height:3,background:"#f1f5f9",borderRadius:3}}><div style={{height:3,width:`${pct}%`,background:catColor(d.name),borderRadius:3,opacity:catFilter&&!active?0.3:1}}/></div></div>);})}
            <button onClick={()=>navTo("categories")} style={{marginTop:6,fontSize:11,color:"#6366f1",background:"none",border:"none",cursor:"pointer",padding:0}}>Manage categories →</button>
          </div>
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:500}}>Recent spending</span>
              <select value={recentCat} onChange={e=>setRecentCat(e.target.value)} style={{fontSize:11,padding:"3px 7px",borderRadius:7,border:"0.5px solid #e4e9f0",color:recentCat?catColor(recentCat):"#94a3b8",background:"#fff",cursor:"pointer",maxWidth:120}}>
                <option value="">All categories</option>
                {spendCatsInPeriod.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {recentTxns.length===0?(<p style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"16px 0"}}>No transactions in this category.</p>):recentTxns.slice(0,7).map(t=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"0.5px solid #f8f9fc"}}>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name.slice(0,26)}</div><div style={{fontSize:10,color:"#94a3b8"}}><span style={{color:catColor(t.category)}}>●</span> {t.category}{t.split>1&&<span style={{marginLeft:5,color:"#6366f1",fontWeight:500}}>÷{t.split}</span>}</div></div>
                <div style={{flexShrink:0,paddingLeft:8,textAlign:"right"}}><div style={{fontSize:12,fontWeight:500,color:"#f43f5e"}}>{$(Math.abs(eff(t)))}</div>{t.split>1&&<div style={{fontSize:9,color:"#94a3b8"}}>of {$(Math.abs(t.amount))}</div>}</div>
              </div>
            ))}
            <button onClick={()=>navTo("transactions")} style={{marginTop:8,fontSize:11,color:"#6366f1",background:"none",border:"none",cursor:"pointer",padding:0}}>View all →</button>
          </div>
        </div>
      </>
    );
  };

  // ── App shell ──────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",position:"relative",minHeight:760,fontFamily:"var(--font-sans)"}}>
      <div style={{width:178,flexShrink:0,background:"#0d1117",display:"flex",flexDirection:"column",padding:"18px 0"}}>
        <div style={{padding:"0 16px 22px",display:"flex",alignItems:"center",gap:8}}><i className="ti ti-chart-arrows-vertical" style={{fontSize:18,color:"#10b981"}} aria-hidden/><span style={{fontSize:15,fontWeight:500,color:"#e2e8f0",letterSpacing:"-.01em"}}>Flowly</span></div>
        <div style={{fontSize:9,color:"#374151",textTransform:"uppercase",letterSpacing:".1em",padding:"0 16px 5px"}}>Menu</div>
        {NAV.map(n=>(<div key={n.id} onClick={()=>navTo(n.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 16px",fontSize:13,cursor:"pointer",color:view===n.id?"#f1f5f9":"#6b7280",background:view===n.id?"rgba(255,255,255,.06)":"transparent",borderLeft:view===n.id?"2px solid #10b981":"2px solid transparent",transition:"all .12s"}}><i className={`ti ${n.icon}`} style={{fontSize:15}} aria-hidden/>{n.label}</div>))}
        <div style={{flex:1}}/>
        <div style={{padding:"0 16px 14px"}}><button onClick={triggerImport} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 0",fontSize:12,cursor:"pointer",color:"#6b7280",background:"none",border:"none",textAlign:"left"}}><i className="ti ti-upload" style={{fontSize:14,color:"#10b981"}} aria-hidden/>Import CSV</button></div>
        <div style={{padding:"12px 16px 0",borderTop:"1px solid #1c2333",fontSize:10}}>{txns.length>0?<span style={{color:"#10b981"}}>✓ {txns.length} transactions</span>:<span style={{color:"#f59e0b"}}>No data imported yet</span>}</div>
      </div>

      <div style={{flex:1,background:"#f2f4f8",padding:"18px 16px",overflowX:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div><h1 style={{fontSize:16,fontWeight:500,margin:0}}>{NAV.find(n=>n.id===view)?.label}</h1><p style={{fontSize:9,color:"#94a3b8",margin:"2px 0 0",textTransform:"uppercase",letterSpacing:".07em"}}>Portland, OR</p></div>
          <div style={{display:"flex",gap:3,alignItems:"center"}}>
            {PERIODS.map(p=>(<button key={p} onClick={()=>{setPeriod(p);setCatFilter(null);}} style={{padding:"5px 9px",fontSize:11,border:"0.5px solid",borderRadius:6,cursor:"pointer",fontWeight:period===p?500:400,borderColor:period===p?"#6366f1":"#dde1e8",background:period===p?"#6366f1":"#fff",color:period===p?"#fff":"#94a3b8"}}>{p}</button>))}
            {txns.length>0&&<button onClick={triggerImport} style={{marginLeft:8,display:"flex",alignItems:"center",gap:5,padding:"6px 11px",background:"#6366f1",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:500}}><i className="ti ti-upload" style={{fontSize:12}} aria-hidden/>Import more</button>}
          </div>
        </div>

        {/* KPI row — 6 cards */}
        {txns.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:7,marginBottom:14}}>
            {[
              {label:"Income",     val:totals.income,      color:"#10b981",sign:""},
              {label:"Savings",    val:totals.savings,     color:"#06b6d4",sign:""},
              {label:"Investment", val:totals.investments, color:"#a78bfa",sign:""},
              {label:"Retirement", val:totals.retirement,  color:"#f59e0b",sign:""},
              {label:"Spending",   val:totals.spending,    color:"#f43f5e",sign:"-"},
              {label:"Net",        val:totals.net,         color:totals.net>=0?"#475569":"#f43f5e",sign:""},
            ].map(k=>(
              <div key={k.label} style={{background:"#fff",border:"0.5px solid #e4e9f0",borderRadius:10,padding:"10px 10px",borderTop:`3px solid ${k.color}`}}>
                <div style={{fontSize:8,color:"#94a3b8",marginBottom:3,textTransform:"uppercase",letterSpacing:".06em"}}>{k.label}</div>
                <div style={{fontSize:14,fontWeight:500,color:k.color}}>{k.sign}{$(k.val)}</div>
                <div style={{fontSize:8,color:"#94a3b8",marginTop:2}}>{period==="All"?"All time":`Last ${period}`}</div>
              </div>
            ))}
          </div>
        )}

        {renderView()}
      </div>

      {showUpload&&(
        <div style={{position:"absolute",top:0,left:0,right:0,minHeight:"100%",zIndex:60,background:"rgba(8,10,15,0.72)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:44}}>
          <div style={{background:"#fff",borderRadius:14,padding:"24px 26px",width:490,maxWidth:"90%",border:"0.5px solid #e4e9f0"}}>
            <div style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:500,marginBottom:4}}>Import transactions</div><div style={{fontSize:12,color:"#94a3b8"}}>Adds to your existing {txns.length} transaction{txns.length!==1?"s":""}. Exact duplicates are skipped automatically.</div></div>
            <ImportWizard step={csvStep} headers={csvHdrs} rows={csvRows} colMap={colMap} onColMap={handleColMap} onFile={handleFile} onImport={handleImport} onCancel={()=>{setShowUpload(false);setCsvStep("drop");}} fileRef={fileRef} showCancel/>
          </div>
        </div>
      )}
    </div>
  );
}
