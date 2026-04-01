/**
 * CLIENT PORTAL — recrue media · v6.0
 * Full all-in-one: Overview, Analytics, Campaigns, Orders, Billing, Account
 * Rep contact: Austin Gagan / agagan@recruemedia.com
 *
 * DEPLOY: set DATA_BASE to your GitHub Pages tracker-data URL
 * AUTH:   SHA-256 hashed passwords in /data/portal-clients.json
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DATA_BASE   = "./data";
const SESSION_KEY = "cp_session_v1";
const AGENCY_EMAIL = "agagan@recruemedia.com";

const REP = {
  name:  "Austin Gagan",
  title: "Account Manager",
  email: "agagan@recruemedia.com",
  phone: "(623) 555-0182",
  initials: "AG",
  bio:   "Austin is your dedicated account manager at recrue media. He oversees all campaign strategy, creative approvals, and billing for your account.",
};

// ─── NOTES FOR DEPLOYMENT ────────────────────────────────────────────────────
//
// 1. Set DATA_BASE above to your tracker-data GitHub Pages URL, e.g.:
//    const DATA_BASE = "https://youragency.github.io/tracker-data";
//
// 2. Replace AGENCY_EMAIL with your real address (already set to Austin's).
//
// 3. portal-clients.json shape (store as GitHub repo secret PORTAL_CLIENTS_JSON):
//    [
//      {
//        "clientId":    "apex-retail",
//        "displayName": "Sarah Mitchell",
//        "email":       "client@example.com",
//        "passwordHash":"<sha256 of password>",   // echo -n "pass" | sha256sum
//        "partnerName": "Apex Retail Group"        // must match mediaPartner in tracker
//      }
//    ]
//
// 4. Build: npm create vite@latest client-portal -- --template react
//           Replace src/App.jsx with this file, rename export at bottom to App
//           npm run build  →  deploy dist/ to GitHub Pages or Netlify
//
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef } from "react";

const FF = "Inter,system-ui,-apple-system,sans-serif";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$   = v => v > 0 ? "$" + Math.round(v).toLocaleString() : "—";
const fmtK   = v => v >= 1000000 ? (v/1000000).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(1)+"K" : v > 0 ? String(Math.round(v)) : "—";
const fmtPct = v => v > 0 ? v.toFixed(2)+"%" : "—";
const fmtDate= d => { if (!d) return "—"; if (d.includes("/")) return d; const [y,m,dy]=d.split("-"); return `${m}/${dy}/${y}`; };
const fmtMoney = v => "$" + Math.round(v).toLocaleString();

function getDaysLeft(end) {
  if (!end) return null;
  return Math.ceil((new Date(end) - new Date()) / 86400000);
}

function getPacing(c) {
  const { impressions: del, goal: g, startDate: s, endDate: e } = c;
  if (!g || !s || !e) return null;
  const start = new Date(s), end = new Date(e), now = new Date();
  if (now < start) return { label:"Not Started", color:"#7a9bbf", rank:0 };
  if (now > end)   return { label: del >= g ? "Completed" : "Ended", color: del >= g ? "#00d48a" : "#4d6e8a", rank:0 };
  const elapsed = (now - start) / (end - start);
  const expected = g * elapsed;
  const ratio = expected > 0 ? del / expected : null;
  if (ratio === null) return null;
  if (ratio >= 0.95) return { ratio, label:"On Track",        color:"#00d48a", rank:1 };
  if (ratio >= 0.80) return { ratio, label:"Slightly Behind", color:"#fde047", rank:2 };
  return               { ratio, label:"Behind Pace",         color:"#ef4444", rank:3 };
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function makeToken(clientId, hash) {
  return btoa(JSON.stringify({ clientId, exp: Date.now() + 8*3600*1000, v: hash.slice(0,8) }));
}
function parseToken(token) {
  try { const o = JSON.parse(atob(token)); return o.exp < Date.now() ? null : o; }
  catch { return null; }
}
function fileIcon(name) {
  const e = (name.split(".").pop()||"").toLowerCase();
  if (["mp4","mov","avi","m4v"].includes(e)) return "VID";
  if (["mp3","wav","m4a","aac"].includes(e)) return "AUD";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(e)) return "IMG";
  if (e === "pdf") return "PDF";
  if (["zip","tar","gz"].includes(e)) return "ZIP";
  return e.toUpperCase().slice(0,3) || "FIL";
}
function fileSz(b) {
  if (b >= 1048576) return (b/1048576).toFixed(1)+" MB";
  if (b >= 1024)    return (b/1024).toFixed(0)+" KB";
  return b+" B";
}

// ─── Platform & status constants ──────────────────────────────────────────────
const PLT = {
  FB:"#f472b6", FBV:"#a855f7", DSP:"#7dd3fc", CTV:"#a8c4e0",
  OTT:"#6b7280", SP:"#fde047", SEM:"#b91c1c", TD:"#00ffb3",
  YT:"#6effd8", default:"#4d6e8a"
};
const STATUS = {
  active:  { label:"Active",  color:"#00d48a", glow:true  },
  paused:  { label:"Paused",  color:"#fde047", glow:false },
  ended:   { label:"Ended",   color:"#4d6e8a", glow:false },
  pending: { label:"Pending", color:"#7a9bbf", glow:false },
};
const OSC = { draft:"#7a9bbf", pending:"#fde047", approved:"#a855f7", active:"#00d48a", complete:"#4d6e8a", cancelled:"#ef4444" };
const OSB = { draft:"#0a1525", pending:"#1a1600", approved:"#120a1a", active:"#002e24", complete:"#0a1525", cancelled:"#1a0808" };
const ORDER_FLOW = ["pending","approved","active","complete"];
const PACING_COLORS = { "On Track":"#00d48a", "Slightly Behind":"#fde047", "Behind Pace":"#ef4444", "No Data":"#3d5a72" };

const PLATFORMS = [
  { id:"ctv",   label:"CTV / Audience Ext. TV", color:"#a8c4e0" },
  { id:"fb",    label:"Facebook & Instagram",   color:"#f472b6" },
  { id:"dsp",   label:"Programmatic / DSP",     color:"#7dd3fc" },
  { id:"sem",   label:"SEM / Search",           color:"#b91c1c" },
  { id:"yt",    label:"YouTube / Video",        color:"#6effd8" },
  { id:"snap",  label:"Snapchat",               color:"#fde047" },
  { id:"tt",    label:"TikTok",                 color:"#a855f7" },
  { id:"audio", label:"Digital Audio",          color:"#00ffb3" },
];

// ─── Strip internal fields before exposing to client ──────────────────────────
const PUBLIC_FIELDS = new Set([
  "id","campaignName","mediaPartner","platform","status","startDate","endDate",
  "goal","impressions","clicks","ctr","cpm","completionRate","conversions",
  "reach","frequency","videoViews","projectionUrl","lastChecked",
  "metaSnapshots","ttdSnapshots","dspSnapshots","googleSnapshots","snapSnapshots",
]);
function sanitize(c) {
  const out = {};
  for (const k of PUBLIC_FIELDS) if (k in c) out[k] = c[k];
  return out;
}
function resolveMetrics(c) {
  const snap = c.metaSnapshots?.mtd ?? c.ttdSnapshots?.mtd ?? c.dspSnapshots?.mtd
             ?? c.googleSnapshots?.mtd ?? c.snapSnapshots?.mtd;
  const lastSynced = c.metaSnapshots?.lastSynced ?? c.ttdSnapshots?.lastSynced
                   ?? c.dspSnapshots?.lastSynced ?? c.googleSnapshots?.lastSynced
                   ?? c.snapSnapshots?.lastSynced ?? null;
  return {
    impressions:    snap?.impressions    ?? parseFloat(c.impressions)    ?? 0,
    clicks:         snap?.clicks         ?? parseFloat(c.clicks)         ?? 0,
    ctr:            snap?.ctr            ?? parseFloat(c.ctr)            ?? 0,
    cpm:            snap?.cpm            ?? parseFloat(c.cpm)            ?? 0,
    completionRate: parseFloat(c.completionRate) ?? 0,
    conversions:    parseFloat(c.conversions)    ?? 0,
    reach:          parseFloat(c.reach)          ?? 0,
    frequency:      parseFloat(c.frequency)      ?? 0,
    videoViews:     parseFloat(c.videoViews)     ?? 0,
    lastSynced,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const LOAD_STEPS = [
  { label:"Authenticating session",  dur:600  },
  { label:"Fetching your campaigns", dur:900  },
  { label:"Processing metrics",      dur:700  },
  { label:"Building your dashboard", dur:500  },
];

function LoadingScreen({ client, campaigns, onDone }) {
  const [step, setStep]       = useState(0);
  const [pct, setPct]         = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const totalDur = LOAD_STEPS.reduce((s,x)=>s+x.dur, 0);

  useEffect(() => {
    let elapsed = 0, stepIdx = 0;
    const tick = () => {
      elapsed += 50;
      let cum = 0;
      for (let i = 0; i < LOAD_STEPS.length; i++) {
        cum += LOAD_STEPS[i].dur;
        if (elapsed <= cum) { stepIdx = i; break; }
        stepIdx = LOAD_STEPS.length - 1;
      }
      setStep(stepIdx);
      setPct(Math.min(100, Math.round((elapsed / totalDur) * 100)));
      if (elapsed >= totalDur + 300) { setFadeOut(true); setTimeout(onDone, 500); }
    };
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (client.displayName||"").split(" ")[0] || client.displayName;

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#040c18", fontFamily:FF,
      opacity: fadeOut ? 0 : 1, transition:"opacity .5s ease",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{position:"fixed",top:-200,left:-100,width:600,height:600,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,229,160,.07) 0%,transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-200,right:-100,width:500,height:500,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,196,150,.04) 0%,transparent 65%)",pointerEvents:"none"}}/>

      <div style={{width:"100%", maxWidth:380, padding:"0 24px", textAlign:"center"}}>
        <div style={{
          display:"inline-flex",alignItems:"center",justifyContent:"center",
          width:56,height:56,borderRadius:14,
          background:"#0a1525",border:"1px solid #00c89650",
          boxShadow:"0 0 32px rgba(0,200,150,.12)", marginBottom:22,
        }}>
          <span style={{fontSize:26,fontWeight:900,color:"#00e5a0",textShadow:"0 0 16px rgba(0,229,160,.6)"}}>R</span>
        </div>
        <div style={{fontSize:20,fontWeight:700,color:"#edf4ff",marginBottom:6,letterSpacing:"-0.01em"}}>
          {greeting}, {firstName}
        </div>
        <div style={{fontSize:13,color:"#3d5a72",marginBottom:40}}>Loading your campaign dashboard</div>

        <div style={{marginBottom:28}}>
          <div style={{height:3,background:"#162236",borderRadius:2,overflow:"hidden",marginBottom:10}}>
            <div style={{
              height:"100%",borderRadius:2,
              background:"linear-gradient(90deg,#00c896,#00e5a0)",
              width:`${pct}%`, transition:"width .08s linear",
              boxShadow:"0 0 8px rgba(0,229,160,.5)",
            }}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
            <span style={{color:"#00e5a0",fontWeight:600}}>{LOAD_STEPS[step]?.label}</span>
            <span style={{color:"#2a4060"}}>{pct}%</span>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:9,textAlign:"left"}}>
          {LOAD_STEPS.map((s,i) => {
            const done = i < step || pct >= 100;
            const cur  = i === step && pct < 100;
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                opacity:(done||cur)?1:.2,transition:"opacity .3s"}}>
                <div style={{
                  width:18,height:18,borderRadius:"50%",flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background: done?"#002e24":"#0a1525",
                  border:`1px solid ${done?"#00c89660":cur?"#00c89640":"#1e293b"}`,
                  fontSize:9,
                }}>
                  {done
                    ? <span style={{color:"#00e5a0",fontSize:10}}>✓</span>
                    : cur
                      ? <span style={{display:"block",width:6,height:6,borderRadius:"50%",background:"#00e5a0",
                          boxShadow:"0 0 6px rgba(0,229,160,.8)",animation:"pulse 1s ease-in-out infinite"}}/>
                      : <span style={{display:"block",width:4,height:4,borderRadius:"50%",background:"#1e293b"}}/>
                  }
                </div>
                <span style={{fontSize:12,color:done?"#7a9bbf":cur?"#d8eaf8":"#2a4060",fontWeight:cur?600:400}}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {campaigns.length > 0 && pct > 70 && (
          <div style={{
            marginTop:28,padding:"10px 16px",
            background:"#002e24",border:"1px solid #00c89630",
            borderRadius:8,fontSize:12,color:"#00e5a0",
            opacity:pct>80?1:0,transition:"opacity .4s",
          }}>
            Found {campaigns.length} campaign{campaigns.length!==1?"s":""} across {new Set(campaigns.map(c=>c.platform)).size} platforms
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${DATA_BASE}/portal-clients.json`);
      if (!res.ok) throw new Error("Could not reach authentication service.");
      const clients = await res.json();
      const client  = clients.find(c => c.email.toLowerCase() === email.trim().toLowerCase());
      if (!client) { setError("No account found for that email address."); return; }
      const hash = await sha256(password);
      if (hash !== client.passwordHash) { setError("Incorrect password."); return; }
      const token = makeToken(client.clientId, hash);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, client }));
      onLogin(client, token);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  }

  const iStyle = {
    width:"100%", background:"#060d18", border:"1px solid #1e293b",
    borderRadius:7, padding:"11px 13px", color:"#d8eaf8", fontSize:14,
    fontFamily:FF, outline:"none", transition:"border-color .15s",
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#040c18", fontFamily:FF, position:"relative", overflow:"hidden",
    }}>
      <div style={{position:"fixed",top:-300,left:-200,width:700,height:700,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,229,160,.06) 0%,transparent 65%)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:400,padding:"0 20px",position:"relative",
        animation:"fadeUp .4s ease both"}}>

        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            width:52,height:52,borderRadius:13,
            background:"#0a1525",border:"1px solid #00c89650",
            boxShadow:"0 0 28px rgba(0,200,150,.1)",marginBottom:14,
          }}>
            <span style={{fontSize:25,fontWeight:900,color:"#00e5a0",textShadow:"0 0 14px rgba(0,229,160,.55)"}}>R</span>
          </div>
          <div style={{fontSize:18,fontWeight:800,color:"#edf4ff",letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:5}}>
            recrue media
          </div>
          <div style={{fontSize:12,color:"#3d5a72",letterSpacing:"0.04em"}}>Client Reporting Portal</div>
        </div>

        <div style={{background:"#0e1a2e",border:"1px solid #1e293b",borderRadius:14,
          padding:"30px 28px",boxShadow:"0 30px 80px rgba(0,0,0,.8)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#4d6e8a",letterSpacing:"0.04em",marginBottom:22}}>
            Sign in to your account
          </div>

          <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,letterSpacing:"0.04em",marginBottom:6}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@company.com" required autoComplete="email" style={iStyle}
                onFocus={e=>e.target.style.borderColor="#00c89660"}
                onBlur={e=>e.target.style.borderColor="#1e293b"}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,letterSpacing:"0.04em",marginBottom:6}}>Password</label>
              <div style={{position:"relative"}}>
                <input type={showPass?"text":"password"} value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  style={{...iStyle,paddingRight:52}}
                  onFocus={e=>e.target.style.borderColor="#00c89660"}
                  onBlur={e=>e.target.style.borderColor="#1e293b"}/>
                <button type="button" onClick={()=>setShowPass(v=>!v)} style={{
                  position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",cursor:"pointer",
                  color:"#3d5a72",fontSize:11,fontWeight:600,padding:0,fontFamily:FF,
                }}>{showPass?"Hide":"Show"}</button>
              </div>
            </div>

            {error && (
              <div style={{background:"#1a0808",border:"1px solid #ef444430",
                borderRadius:7,padding:"10px 13px",fontSize:12,color:"#fca5a5"}}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop:4,padding:"12px 0",
              background: loading ? "#162236" : "#002e24",
              border:`1px solid ${loading?"#334155":"#00c89650"}`,
              borderRadius:8,color:loading?"#3d5a72":"#00e5a0",
              fontSize:13,fontWeight:700,cursor:loading?"default":"pointer",
              fontFamily:FF,boxShadow:loading?"none":"0 0 20px rgba(0,200,150,.12)",
              transition:"all .2s",
            }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p style={{marginTop:18,textAlign:"center",fontSize:12,color:"#2a4060",margin:"18px 0 0"}}>
            Need access? Contact <a href={`mailto:${AGENCY_EMAIL}`} style={{color:"#00e5a0",textDecoration:"none"}}>{REP.name}</a>.
          </p>
        </div>

        <p style={{textAlign:"center",marginTop:20,fontSize:11,color:"#1e293b"}}>
          © {new Date().getFullYear()} recrue media · Confidential
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        input::placeholder { color:#2a4060 !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTAL SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function Portal({ client, onLogout }) {
  const [campaigns,   setCampaigns]   = useState([]);
  const [loadState,   setLoadState]   = useState("loading");
  const [errorMsg,    setErrorMsg]    = useState(null);
  const [showLoading, setShowLoading] = useState(true);
  const [tab,         setTab]         = useState("overview");
  const [fadeIn,      setFadeIn]      = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Orders — starts with empty array, populated from portal-orders.json
  const [orders, setOrders] = useState([]);

  // Invoices — from portal-invoices.json
  const [invoices, setInvoices] = useState([]);

  // UI state
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [campaignPltFilter, setCampaignPltFilter] = useState("all");
  const [campaignStFilter,  setCampaignStFilter]  = useState("all");
  const [drPreset,  setDrPreset]  = useState("mtd");
  const [orderView, setOrderView] = useState("list");
  const [selOrder,  setSelOrder]  = useState(null);
  const [orderStep, setOrderStep] = useState(1);
  const [form, setForm] = useState(blankForm());
  const [pltDetails, setPltDetails] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [msgDraft, setMsgDraft] = useState("");
  const [selInvoice, setSelInvoice] = useState(null);

  function blankForm() {
    return { advertiser:"", station:"", billingId:"", contactName:"",
             contactEmail:"", contactPhone:"", repName:REP.name, repEmail:REP.email,
             website:"", startDate:"", endDate:"", platforms:{}, creativeNote:"" };
  }

  useEffect(() => {
    async function load() {
      try {
        const sources = ["campaigns","ttd_campaigns","dsp_campaigns","google_campaigns","snap_campaigns"];
        const all = [];
        for (const src of sources) {
          try {
            const r = await fetch(`${DATA_BASE}/${src}.json`);
            if (r.ok) { const d = await r.json(); all.push(...(Array.isArray(d)?d:d.campaigns||[])); }
          } catch {}
        }
        const seen = new Set();
        const mine = all
          .filter(c => { if(seen.has(c.id)) return false; seen.add(c.id); return true; })
          .filter(c => (c.mediaPartner||"").toLowerCase().trim() === client.partnerName.toLowerCase().trim())
          .map(sanitize);
        setCampaigns(mine);

        // Load orders
        try {
          const or = await fetch(`${DATA_BASE}/portal-orders.json`);
          if (or.ok) { const d = await or.json(); setOrders(d.filter(o=>o.clientId===client.clientId)); }
        } catch {}

        // Load invoices
        try {
          const iv = await fetch(`${DATA_BASE}/portal-invoices.json`);
          if (iv.ok) { const d = await iv.json(); setInvoices(d.filter(i=>i.clientId===client.clientId)); }
        } catch {}

        setLoadState("ready");
        setLastRefresh(new Date());
      } catch { setLoadState("error"); setErrorMsg("Could not load campaign data. Please refresh."); }
    }
    load();
    const t = setInterval(load, 5*60*1000);
    return () => clearInterval(t);
  }, [client]);

  function handleLoadDone() {
    setShowLoading(false);
    setTimeout(()=>setFadeIn(true), 50);
  }

  if (showLoading) return <LoadingScreen client={client} campaigns={campaigns} onDone={handleLoadDone} />;
  if (loadState === "error") return <ErrorBlock msg={errorMsg} />;

  const platforms = ["all", ...new Set(campaigns.map(c=>c.platform).filter(Boolean))].sort();
  const filtered  = campaigns.filter(c => {
    if (campaignPltFilter !== "all" && c.platform !== campaignPltFilter) return false;
    if (campaignStFilter  !== "all" && c.status  !== campaignStFilter)  return false;
    return true;
  });

  const active  = campaigns.filter(c=>c.status==="active");
  const paused  = campaigns.filter(c=>c.status==="paused");
  const ended   = campaigns.filter(c=>c.status==="ended");
  const live    = [...active,...paused];

  const unreadCount = orders.reduce((s,o)=>s+(o.messages||[]).filter(m=>m.isNew&&m.from==="agency").length, 0);
  const outstanding = invoices.filter(i=>i.status==="outstanding");
  const alertCount  = campaigns.filter(c=>{const p=getPacing(c);return p&&p.rank===3;}).length
                    + campaigns.filter(c=>{const d=getDaysLeft(c.endDate);return d!==null&&d>0&&d<=7&&c.status==="active";}).length
                    + outstanding.length;

  // Submit new order → mailto + add to local state
  function submitOrder() {
    const f = form; const pd = pltDetails;
    const newId = "IO-" + Date.now().toString().slice(-6);
    const activePlts = PLATFORMS.filter(p=>f.platforms[p.id]);
    const budget = activePlts.reduce((s,p)=>s+(parseFloat((pd[p.id]||{}).budget)||0),0);
    const impr   = activePlts.reduce((s,p)=>s+(parseFloat(((pd[p.id]||{}).impressions||"").replace(/,/g,""))||0),0);
    const today  = new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"});

    const pltLines = activePlts.map(p=>{const d=pd[p.id]||{};return`${p.label}: $${d.budget||"—"} | ${d.impressions||"—"} impr | Rate $${d.rate||"—"}/CPM | ${d.audience||"—"} | ${d.geo||"—"}`;}).join("\n");
    const fLines   = uploadedFiles.length>0 ? `\nCREATIVE FILES (attach these):\n`+uploadedFiles.map(f=>`  • ${f.name}${f.note?" — "+f.note:""}`).join("\n") : "";
    const body = encodeURIComponent(`New Insertion Order — ${newId}\nSubmitted: ${today}\nAdvertiser: ${f.advertiser}\nFlight: ${f.startDate||"—"} → ${f.endDate||"—"}\nBudget: $${Math.round(budget).toLocaleString()}\nImpressions: ${fmtK(impr)}\nContact: ${f.contactName} (${f.contactEmail})\nPhone: ${f.contactPhone||"—"}\nRep: ${REP.name}\n\nPLATFORMS:\n${pltLines}${fLines}${f.creativeNote?"\n\nCREATIVE NOTES:\n"+f.creativeNote:""}\n\nPlease update status in portal-orders.json and push to trigger GitHub Actions.`);
    window.open(`mailto:${AGENCY_EMAIL}?subject=${encodeURIComponent("New IO "+newId+" — "+f.advertiser)}&body=${body}`);

    const newOrder = {
      id: newId, clientId: client.clientId, advertiser: f.advertiser||"New Advertiser",
      platforms: activePlts.map(p=>p.id.toUpperCase().slice(0,3)),
      status:"pending", date:today, start:f.startDate||today, end:f.endDate||"—",
      budget, impressions:impr, ref:newId,
      station:f.station, billingId:f.billingId,
      contactName:f.contactName, contactEmail:f.contactEmail,
      repName:REP.name, repEmail:REP.email,
      creativeFiles: uploadedFiles.map(x=>({...x,uploadDate:today})),
      messages: [{ from:"client", name:client.displayName, text:`Order submitted.${uploadedFiles.length>0?" "+uploadedFiles.length+" creative file(s) listed in email.":""}`, ts:today, isNew:false }],
      statusHistory: [{ status:"pending", date:today, note:"Submitted by client" }],
    };
    setOrders(prev=>[newOrder,...prev]);
    setOrderView("list");
    setForm(blankForm()); setPltDetails({}); setUploadedFiles([]); setOrderStep(1);
  }

  function sendMessage() {
    const txt = msgDraft.trim();
    if (!txt || !selOrder) return;
    const now = new Date();
    const ts = now.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit"})+" "+now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
    setOrders(prev=>prev.map(o=>o.id===selOrder.id
      ? {...o,messages:[...(o.messages||[]),{from:"client",name:client.displayName,text:txt,ts,isNew:false}]}
      : o
    ));
    setSelOrder(prev=>({...prev,messages:[...(prev.messages||[]),{from:"client",name:client.displayName,text:txt,ts,isNew:false}]}));
    setMsgDraft("");
  }

  function viewOrder(id) {
    const o = orders.find(x=>x.id===id);
    setOrders(prev=>prev.map(x=>x.id===id?{...x,messages:(x.messages||[]).map(m=>m.from==="agency"?{...m,isNew:false}:m)}:x));
    setSelOrder({...o,messages:(o.messages||[]).map(m=>m.from==="agency"?{...m,isNew:false}:m)});
    setOrderView("detail");
    setMsgDraft("");
  }

  function exportFullReport() {
    const tI=live.reduce((s,c)=>{const m=resolveMetrics(c);return s+m.impressions;},0);
    const tC=live.reduce((s,c)=>{const m=resolveMetrics(c);return s+m.clicks;},0);
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Campaign Report</title>
    <style>body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#111;padding:40px;max-width:900px;margin:0 auto;}
    h1{font-size:21px;font-weight:800;margin-bottom:3px;}
    .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
    .s{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:13px 15px;}
    .sl{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:700;margin-bottom:5px;}
    .sv{font-size:22px;font-weight:800;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    th{text-align:left;padding:7px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:700;border-bottom:2px solid #e2e8f0;}
    td{padding:9px 10px;border-bottom:1px solid #f1f5f9;}
    .f{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;}
    @media print{.np{display:none;}}</style></head><body>
    <div style="display:flex;justify-content:space-between;margin-bottom:22px;">
      <div><h1>Campaign Report</h1><div style="font-size:13px;color:#6b7280;margin-top:3px;">${client.displayName} · ${client.partnerName} · ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div></div>
      <div style="text-align:right;"><div style="font-size:15px;font-weight:800;">RECRUE MEDIA</div><div style="font-size:11px;color:#6b7280;">${AGENCY_EMAIL}</div></div>
    </div>
    <div class="g4">
      <div class="s"><div class="sl">Active</div><div class="sv">${active.length}</div></div>
      <div class="s"><div class="sl">Impressions</div><div class="sv">${fmtK(tI)}</div></div>
      <div class="s"><div class="sl">Clicks</div><div class="sv">${fmtK(tC)}</div></div>
      <div class="s"><div class="sl">Blended CTR</div><div class="sv">${tI>0?((tC/tI)*100).toFixed(2)+"%":"—"}</div></div>
    </div>
    <table><thead><tr><th>Campaign</th><th>Platform</th><th>Status</th><th>Flight</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Pacing</th></tr></thead>
    <tbody>${campaigns.map(c=>{const m=resolveMetrics(c);const p=getPacing(c);return`<tr>
      <td style="font-weight:600;">${c.campaignName}</td>
      <td style="font-weight:700;color:${PLT[c.platform]||"#6b7280"};">${c.platform}</td>
      <td style="text-transform:capitalize;">${c.status}</td>
      <td style="color:#6b7280;">${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}</td>
      <td style="font-weight:600;">${m.impressions>0?fmtK(m.impressions):"—"}</td>
      <td>${m.clicks>0?fmtK(m.clicks):"—"}</td>
      <td>${m.ctr>0?fmtPct(m.ctr):"—"}</td>
      <td style="font-weight:600;color:${p?p.color:"#6b7280"};">${p?p.label:"—"}</td>
    </tr>`;}).join("")}</tbody></table>
    <div class="f"><span>recrue media · Confidential — prepared exclusively for ${client.partnerName}</span><span>${new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span></div>
    <div class="np" style="margin-top:22px;text-align:center;">
      <button onclick="window.print()" style="background:#002e24;border:1px solid #00c89650;color:#00e5a0;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Print / Save as PDF</button>
    </div>
    </body></html>`);
    win.document.close();
  }

  // Tab badge counts
  const tabBadges = { overview:alertCount>0?alertCount:0, orders:unreadCount, billing:outstanding.length };

  const goTab = (t) => { setTab(t); setOrderView("list"); setExpandedCampaign(null); setSelInvoice(null); };

  return (
    <div style={{
      minHeight:"100vh", background:"#040c18", fontFamily:FF, color:"#d8eaf8",
      opacity:fadeIn?1:0, transition:"opacity .4s ease",
    }}>
      {/* Nav */}
      <nav style={{
        position:"sticky",top:0,zIndex:100,
        background:"rgba(4,12,24,.96)",backdropFilter:"blur(10px)",
        borderBottom:"1px solid #1e293b",
        padding:"0 20px",display:"flex",alignItems:"center",height:54,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:9,flex:1}}>
          <div style={{width:26,height:26,borderRadius:7,background:"#0a1525",border:"1px solid #00c89640",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#00e5a0",textShadow:"0 0 8px rgba(0,229,160,.45)"}}>R</div>
          <span style={{fontSize:12,fontWeight:700,letterSpacing:".1em",color:"#7a9bbf",textTransform:"uppercase"}}>recrue media</span>
          <span style={{color:"#162236",fontSize:14,margin:"0 2px"}}>·</span>
          <span style={{fontSize:12,color:"#3d5a72"}}>Client Portal</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {lastRefresh && <span style={{fontSize:10,color:"#1e293b"}}>⟳ {lastRefresh.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>}
          <button className="btn-b" style={{fontSize:11,padding:"5px 11px",background:"#0a1e38",border:"1px solid #1e4a7a50",borderRadius:7,color:"#7dd3fc",cursor:"pointer",fontFamily:FF,fontWeight:700}} onClick={exportFullReport}>↓ Report</button>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#a8c4e0"}}>{client.displayName}</div>
            <div style={{fontSize:11,color:"#2a4060"}}>{client.partnerName}</div>
          </div>
          <button onClick={onLogout} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:6,padding:"5px 12px",color:"#3d5a72",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FF}}>Sign out</button>
        </div>
      </nav>

      {/* Tabs */}
      <div style={{borderBottom:"1px solid #1e293b",display:"flex",padding:"0 20px",background:"#040c18",overflowX:"auto",position:"sticky",top:54,zIndex:99}}>
        {["overview","analytics","campaigns","orders","billing","account"].map(t=>{
          const badge = tabBadges[t]||0;
          return (
            <button key={t} onClick={()=>goTab(t)} style={{
              background:"none",border:"none",
              borderBottom:`2px solid ${tab===t?"#00e5a0":"transparent"}`,
              padding:"11px 16px 12px",
              color:tab===t?"#00e5a0":"#3d5a72",
              fontSize:13,fontWeight:tab===t?700:500,
              cursor:"pointer",fontFamily:FF,marginBottom:-1,
              whiteSpace:"nowrap",flexShrink:0,position:"relative",
              transition:"color .15s",
            }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
              {badge>0 && <span style={{position:"absolute",top:8,right:3,minWidth:15,height:15,borderRadius:8,background:"#ef4444",border:"2px solid #040c18",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff",padding:"0 3px"}}>{badge}</span>}
            </button>
          );
        })}
      </div>

      <main style={{padding:"26px 22px 80px",maxWidth:1140,margin:"0 auto"}}>
        {tab === "overview"   && <OverviewTab campaigns={campaigns} active={active} paused={paused} ended={ended} live={live} client={client} orders={orders} invoices={invoices} goTab={goTab} exportFullReport={exportFullReport} />}
        {tab === "analytics"  && <AnalyticsTab campaigns={campaigns} live={live} />}
        {tab === "campaigns"  && <CampaignsTab campaigns={filtered} allCampaigns={campaigns} platforms={platforms} pltFilter={campaignPltFilter} setPltFilter={setCampaignPltFilter} stFilter={campaignStFilter} setStFilter={setCampaignStFilter} expanded={expandedCampaign} setExpanded={setExpandedCampaign} drPreset={drPreset} setDrPreset={setDrPreset} />}
        {tab === "orders"     && <OrdersTab orders={orders} orderView={orderView} setOrderView={setOrderView} selOrder={selOrder} setSelOrder={setSelOrder} orderStep={orderStep} setOrderStep={setOrderStep} form={form} setForm={setForm} pltDetails={pltDetails} setPltDetails={setPltDetails} uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} msgDraft={msgDraft} setMsgDraft={setMsgDraft} submitOrder={submitOrder} sendMessage={sendMessage} viewOrder={viewOrder} blankForm={blankForm} client={client} />}
        {tab === "billing"    && <BillingTab invoices={invoices} selInvoice={selInvoice} setSelInvoice={setSelInvoice} />}
        {tab === "account"    && <AccountTab client={client} />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#040c18}
        ::-webkit-scrollbar-thumb{background:#162236;border-radius:3px}
        @media(max-width:640px){
          .hide-mob{display:none!important;}
          main{padding:16px 14px 60px!important;}
        }
      `}</style>
    </div>
  );
}

// ─── Rep Card (reused across tabs) ────────────────────────────────────────────
function RepCard() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div style={{
        width:52,height:52,borderRadius:"50%",flexShrink:0,
        background:"linear-gradient(135deg,#0e2040,#1a3a5f)",
        border:"2px solid #1e4a7a",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:16,fontWeight:800,color:"#7dd3fc",
      }}>{REP.initials}</div>
      <div style={{flex:1,minWidth:150}}>
        <div style={{fontSize:14,fontWeight:700,color:"#edf4ff",marginBottom:2}}>{REP.name}</div>
        <div style={{fontSize:12,color:"#4d6e8a",marginBottom:6}}>{REP.title} · recrue media</div>
        <div style={{fontSize:11,color:"#3d5a72",lineHeight:1.5}}>{REP.bio}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
        <a href={`mailto:${REP.email}`} style={{display:"inline-flex",alignItems:"center",gap:7,background:"#0a1e38",border:"1px solid #1e4a7a50",borderRadius:7,padding:"7px 13px",fontSize:12,fontWeight:600,color:"#7dd3fc",textDecoration:"none"}}>✉ {REP.email}</a>
        <a href={`tel:${REP.phone}`} style={{display:"inline-flex",alignItems:"center",gap:7,background:"#002e24",border:"1px solid #00c89640",borderRadius:7,padding:"7px 13px",fontSize:12,fontWeight:600,color:"#00e5a0",textDecoration:"none"}}>☎ {REP.phone}</a>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"17px 19px",position:"relative",overflow:"hidden",borderLeft:`3px solid ${accent}40`}}>
      <div style={{position:"absolute",top:-14,right:-14,width:60,height:60,borderRadius:"50%",background:accent+"08",pointerEvents:"none"}}/>
      <div style={{fontSize:10,fontWeight:700,color:"#3d5a72",textTransform:"uppercase",letterSpacing:".04em",marginBottom:8,display:"flex",alignItems:"center",gap:4}}>
        <span style={{color:accent,opacity:.6,fontSize:11}}>{icon}</span>{label}
      </div>
      <div style={{fontSize:25,fontWeight:800,color:accent,lineHeight:1,marginBottom:4,letterSpacing:"-0.02em"}}>{value}</div>
      <div style={{fontSize:11,color:"#2a4060"}}>{sub}</div>
    </div>
  );
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────
function CampaignRow({ c, compact=false, expanded=false, onClick, onExport }) {
  const m      = resolveMetrics(c);
  const pacing = getPacing(c);
  const dLeft  = getDaysLeft(c.endDate);
  const pCol   = PLT[c.platform]||PLT.default;
  const sCfg   = STATUS[c.status]||STATUS.pending;
  const goalPct= c.goal>0?Math.min(100,(m.impressions/(parseFloat(c.goal)||1)*100)):0;

  return (
    <>
      <div onClick={onClick} style={{
        background:expanded?"#0e1a2e":"#0a1525",
        border:`1px solid ${expanded?"#334155":"#1e293b"}`,
        borderRadius:10,padding:compact?"11px 14px":"13px 16px",
        cursor:onClick?"pointer":"default",
        transition:"background .1s,border-color .1s",
        marginBottom:5,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
          <div style={{background:pCol+"14",border:`1px solid ${pCol}30`,borderRadius:5,padding:"3px 8px",fontSize:11,fontWeight:700,color:pCol,flexShrink:0,minWidth:36,textAlign:"center"}}>{c.platform}</div>
          <div style={{flex:1,minWidth:100}}>
            <div style={{fontSize:13,fontWeight:600,color:"#d8eaf8",marginBottom:compact?0:2}}>{c.campaignName||c.name}</div>
            {!compact && c.startDate && c.endDate && (
              <div style={{fontSize:11,color:"#3d5a72",display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <span>{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
                {dLeft!==null&&dLeft>0&&dLeft<=30&&<span style={{color:dLeft<=7?"#ef4444":dLeft<=14?"#fde047":"#4d6e8a",fontWeight:600}}>{dLeft}d left</span>}
              </div>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:sCfg.color,boxShadow:sCfg.glow?`0 0 6px ${sCfg.color}80`:"none"}}/>
            <span style={{fontSize:12,color:sCfg.color,fontWeight:600}}>{sCfg.label}</span>
          </div>
          {pacing&&pacing.rank>0&&!compact&&<div style={{background:pacing.color+"12",border:`1px solid ${pacing.color}28`,borderRadius:5,padding:"3px 8px",fontSize:11,fontWeight:600,color:pacing.color,flexShrink:0}}>{pacing.label}</div>}
          {m.impressions>0&&<div style={{flexShrink:0,textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:"#a8c4e0"}}>{fmtK(m.impressions)}</div><div style={{fontSize:11,color:"#2a4060"}}>impr.</div></div>}
          {onClick&&(
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {onExport&&<button onClick={e=>{e.stopPropagation();onExport(c);}} style={{background:"#0a1e38",border:"1px solid #1e4a7a50",borderRadius:6,color:"#7dd3fc",fontSize:10,padding:"3px 8px",cursor:"pointer",fontWeight:700}}>↓</button>}
              <span style={{color:"#1e293b",fontSize:11,fontWeight:700}}>{expanded?"▲":"▼"}</span>
            </div>
          )}
        </div>
        {!compact&&parseFloat(c.goal)>0&&(
          <div style={{marginTop:9}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#2a4060",marginBottom:4}}>
              <span>Delivery</span><span>{fmtK(m.impressions)} / {fmtK(parseFloat(c.goal))} goal ({goalPct.toFixed(0)}%)</span>
            </div>
            <div style={{height:3,background:"#162236",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,width:goalPct.toFixed(1)+"%",background:pacing?pacing.color:"#00c896"}}/>
            </div>
          </div>
        )}
      </div>
      {expanded&&<CampaignDetailPanel c={c} m={m} />}
    </>
  );
}

function CampaignDetailPanel({ c, m }) {
  const rows = [
    {l:"Impressions",v:m.impressions>0?fmtK(m.impressions):"—"},
    {l:"Clicks",v:m.clicks>0?fmtK(m.clicks):"—"},
    {l:"CTR",v:m.ctr>0?fmtPct(m.ctr):"—"},
    {l:"CPM",v:m.cpm>0?fmt$(m.cpm):"—"},
    ...(m.conversions>0?[{l:"Conversions",v:fmtK(m.conversions)}]:[]),
    ...(m.reach>0?[{l:"Reach",v:fmtK(m.reach)}]:[]),
    ...(m.videoViews>0?[{l:"Video Views",v:fmtK(m.videoViews)}]:[]),
    ...(m.completionRate>0?[{l:"Completion",v:m.completionRate.toFixed(1)+"%"}]:[]),
  ];
  return (
    <div style={{background:"#060d18",border:"1px solid #1e293b",borderTop:"none",borderRadius:"0 0 10px 10px",padding:"13px 16px 15px",marginTop:-9,marginBottom:5}}>
      {rows.length>0?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(105px,1fr))",gap:7,marginBottom:12}}>
          {rows.map(r=>(
            <div key={r.l} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:7,padding:"9px 11px"}}>
              <div style={{fontSize:10,color:"#2a4060",textTransform:"uppercase",letterSpacing:".04em",fontWeight:700,marginBottom:4}}>{r.l}</div>
              <div style={{fontSize:15,fontWeight:700,color:"#a8c4e0"}}>{r.v}</div>
            </div>
          ))}
        </div>
      ):<div style={{fontSize:12,color:"#2a4060",marginBottom:10,fontStyle:"italic"}}>No performance data yet.</div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        {m.lastSynced&&<span style={{fontSize:10,color:"#1e293b"}}>⟳ synced {new Date(m.lastSynced).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>}
        {c.projectionUrl&&<a href={c.projectionUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,background:"#002e24",border:"1px solid #00c89640",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:700,color:"#00e5a0",textDecoration:"none"}}>↗ Full Report</a>}
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SH({ children }) {
  return <div style={{fontSize:10,fontWeight:700,color:"#4d6e8a",textTransform:"uppercase",letterSpacing:".06em",marginBottom:11,marginTop:18,paddingBottom:7,borderBottom:"1px solid #0d1e32"}}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ campaigns, active, paused, ended, live, client, orders, invoices, goTab }) {
  const m_totals = live.reduce((a,c)=>{const m=resolveMetrics(c);a.impressions+=m.impressions;a.clicks+=m.clicks;return a;},{impressions:0,clicks:0});
  const avgCtr = m_totals.impressions>0?((m_totals.clicks/m_totals.impressions)*100).toFixed(2)+"%":"—";
  const buckets = {"On Track":0,"Slightly Behind":0,"Behind Pace":0,"No Data":0};
  active.forEach(c=>{const p=getPacing(c);if(!p||p.rank===0)buckets["No Data"]++;else buckets[p.label]=(buckets[p.label]||0)+1;});
  const pe = Object.entries(buckets).filter(([,v])=>v>0);
  const bp = {}; active.forEach(c=>{bp[c.platform]=(bp[c.platform]||0)+1;});
  const pl = Object.entries(bp).sort((a,b)=>b[1]-a[1]), mx=Math.max(...pl.map(([,v])=>v),1);
  const behind   = campaigns.filter(c=>{const p=getPacing(c);return p&&p.rank===3;});
  const expiring = campaigns.filter(c=>{const d=getDaysLeft(c.endDate);return d!==null&&d>0&&d<=7&&c.status==="active";});
  const outstanding = invoices.filter(i=>i.status==="outstanding");

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#edf4ff",letterSpacing:"-0.02em",marginBottom:4}}>
            Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, {client.displayName.split(" ")[0]}
          </h2>
          <div style={{fontSize:12,color:"#3d5a72"}}>{campaigns.length} campaigns · {new Date().toLocaleDateString("en-US",{weekday:"short",month:"long",day:"numeric",year:"numeric"})}</div>
        </div>
      </div>

      {/* Alerts */}
      {(behind.length>0||expiring.length>0||outstanding.length>0)&&(
        <div style={{marginBottom:18}}>
          {behind.map(c=>(
            <div key={c.id} style={{background:"#1a0808",border:"1px solid #ef444430",borderRadius:9,padding:"11px 15px",marginBottom:7,display:"flex",alignItems:"flex-start",gap:11}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",flexShrink:0,marginTop:3}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"#fca5a5",marginBottom:2}}>Campaign pacing behind</div>
                <div style={{fontSize:12,color:"#4d6e8a"}}>{c.campaignName||c.name} ({c.platform}) is delivering below expected pace. <button onClick={()=>goTab("campaigns")} style={{background:"none",border:"none",color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer",padding:0,fontFamily:FF}}>View →</button></div>
              </div>
            </div>
          ))}
          {expiring.map(c=>{const d=getDaysLeft(c.endDate);return(
            <div key={c.id} style={{background:"#1a1200",border:"1px solid #fde04730",borderRadius:9,padding:"11px 15px",marginBottom:7,display:"flex",alignItems:"flex-start",gap:11}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#fde047",flexShrink:0,marginTop:3}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"#fde047",marginBottom:2}}>Campaign ending soon</div>
                <div style={{fontSize:12,color:"#4d6e8a"}}>{c.campaignName||c.name} ends in {d} day{d!==1?"s":""}. <button onClick={()=>goTab("orders")} style={{background:"none",border:"none",color:"#fde047",fontSize:12,fontWeight:700,cursor:"pointer",padding:0,fontFamily:FF}}>Renew →</button></div>
              </div>
            </div>
          );})}
          {outstanding.map(i=>(
            <div key={i.id} style={{background:"#0a1e38",border:"1px solid #7dd3fc30",borderRadius:9,padding:"11px 15px",marginBottom:7,display:"flex",alignItems:"flex-start",gap:11}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#7dd3fc",flexShrink:0,marginTop:3}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"#7dd3fc",marginBottom:2}}>Invoice outstanding</div>
                <div style={{fontSize:12,color:"#4d6e8a"}}>{i.id} · {fmtMoney(i.amount)} due {i.due}. <button onClick={()=>goTab("billing")} style={{background:"none",border:"none",color:"#7dd3fc",fontSize:12,fontWeight:700,cursor:"pointer",padding:0,fontFamily:FF}}>View invoice →</button></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:14}}>
        <StatCard label="Active Campaigns" value={String(active.length)} sub={`${paused.length} paused · ${ended.length} ended`} accent="#00e5a0" icon="●"/>
        <StatCard label="Total Impressions" value={fmtK(m_totals.impressions)} sub="live campaigns (MTD)" accent="#7dd3fc" icon="◈"/>
        <StatCard label="Total Clicks" value={fmtK(m_totals.clicks)} sub="live campaigns (MTD)" accent="#a855f7" icon="◆"/>
        <StatCard label="Blended CTR" value={avgCtr} sub="clicks / impressions" accent="#fde047" icon="◉"/>
      </div>

      {/* Pacing + Platform */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"17px 19px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#4d6e8a",textTransform:"uppercase",letterSpacing:".05em",marginBottom:13}}>Pacing Status</div>
          {active.length===0?<div style={{fontSize:12,color:"#2a4060"}}>No active campaigns</div>:<>
            <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",marginBottom:14,gap:1}}>{pe.map(([l,v])=><div key={l} style={{flex:v,background:PACING_COLORS[l]}}/>)}</div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {pe.map(([l,v])=>(
                <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:PACING_COLORS[l]}}/><span style={{fontSize:13,color:"#a8c4e0"}}>{l}</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:PACING_COLORS[l]}}>{v}</span><span style={{fontSize:11,color:"#2a4060"}}>{Math.round(v/active.length*100)}%</span></div>
                </div>
              ))}
            </div>
          </>}
        </div>
        <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"17px 19px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#4d6e8a",textTransform:"uppercase",letterSpacing:".05em",marginBottom:13}}>Platform Breakdown <span style={{fontWeight:400,color:"#2a4060",textTransform:"none",letterSpacing:0,marginLeft:4}}>active</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {pl.map(([p,n])=>{const pc=PLT[p]||PLT.default;return(
              <div key={p}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:pc}}/><span style={{fontSize:12,fontWeight:700,color:pc}}>{p}</span></div><span style={{fontSize:12,color:"#4d6e8a"}}>{n}</span></div>
                <div style={{height:3,background:"#162236",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,width:Math.round((n/mx)*100)+"%",background:pc,opacity:.7}}/></div>
              </div>
            );})}
          </div>
        </div>
      </div>

      {/* Rep card */}
      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px",marginBottom:14}}>
        <SH>Your Account Manager</SH>
        <RepCard />
      </div>

      {/* Active campaigns */}
      {active.length>0&&(
        <>
          <div style={{fontSize:10,fontWeight:700,color:"#4d6e8a",textTransform:"uppercase",letterSpacing:".06em",marginBottom:9}}>Active Campaigns</div>
          {active.map(c=><CampaignRow key={c.id} c={c} compact />)}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ campaigns, live }) {
  // Weekly mock data — in production pull from snapshot history in JSON
  const weeks = ["Jan 27","Feb 3","Feb 10","Feb 17","Feb 24","Mar 3","Mar 10","Mar 17"];
  const chartData = {
    impressions: [142000,198000,267000,310000,354000,412000,468000,521000],
    clicks:      [1820,2540,3210,3890,4420,5100,5780,6300],
    ctr:         [1.28,1.28,1.20,1.25,1.25,1.24,1.23,1.21],
    conversions: [120,168,214,256,298,342,389,428],
  };
  const latest = k => chartData[k][chartData[k].length-1];
  const prev   = k => chartData[k][chartData[k].length-2];
  const delta  = k => { const d=((latest(k)-prev(k))/prev(k)*100).toFixed(1); return d>0?"+"+d+"%":d+"%"; };
  const dCol   = k => latest(k)>=prev(k)?"#00d48a":"#ef4444";
  const kpis   = [
    {id:"impressions",label:"Impressions",color:"#7dd3fc",fmt:fmtK},
    {id:"clicks",label:"Clicks",color:"#a855f7",fmt:fmtK},
    {id:"ctr",label:"CTR",color:"#fde047",fmt:v=>v.toFixed(2)+"%"},
    {id:"conversions",label:"Conversions",color:"#00e5a0",fmt:fmtK},
  ];
  // Simple canvas bar chart — no external library needed
  const canvasRef = useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const W=canvas.offsetWidth,H=180;
    canvas.width=W; canvas.height=H;
    ctx.clearRect(0,0,W,H);
    const bars=chartData.impressions; const max=Math.max(...bars);
    const bW=Math.floor((W-40)/bars.length)-4;
    bars.forEach((v,i)=>{
      const h=Math.round((v/max)*(H-40));
      const x=40+i*(bW+4);
      const y=H-20-h;
      const isLast=i===bars.length-1;
      ctx.fillStyle=isLast?"#00e5a0":"#7dd3fc40";
      ctx.beginPath(); ctx.roundRect(x,y,bW,h,3); ctx.fill();
      if(i%2===0){
        ctx.fillStyle="#3d5a72"; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText(weeks[i],x+bW/2,H-4);
      }
    });
    ctx.fillStyle="#3d5a72"; ctx.font="10px Inter,sans-serif"; ctx.textAlign="right";
    [0,.5,1].forEach(t=>{
      const v=Math.round(max*t);
      ctx.fillText(fmtK(v),36,(H-20)-(t*(H-40)));
    });
  },[]);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#edf4ff",letterSpacing:"-0.02em",marginBottom:4}}>Analytics</h2>
          <div style={{fontSize:12,color:"#3d5a72"}}>8-week performance trend · all active campaigns</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:16}}>
        {kpis.map(k=>(
          <div key={k.id} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"13px 15px",borderTop:`2px solid ${k.color}40`}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3d5a72",textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:k.color,letterSpacing:"-0.02em",marginBottom:3}}>{k.fmt(latest(k.id))}</div>
            <div style={{fontSize:11,color:dCol(k.id),fontWeight:600}}>{delta(k.id)} <span style={{color:"#2a4060",fontWeight:400}}>vs last week</span></div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"#4d6e8a",textTransform:"uppercase",letterSpacing:".05em",marginBottom:14}}>Weekly Impressions</div>
        <canvas ref={canvasRef} style={{width:"100%",display:"block"}}/>
      </div>

      {/* Per-campaign */}
      <SH>Campaign Breakdown</SH>
      {campaigns.filter(c=>c.status==="active"||c.status==="paused").map(c=>{
        const m=resolveMetrics(c); const p=getPacing(c); const pCol=PLT[c.platform]||PLT.default;
        const gP=c.goal>0?Math.min(100,(m.impressions/(parseFloat(c.goal)||1)*100)):0;
        return (
          <div key={c.id} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"14px 16px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10,flexWrap:"wrap"}}>
              <div style={{background:pCol+"14",border:`1px solid ${pCol}30`,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,color:pCol}}>{c.platform}</div>
              <div style={{fontSize:13,fontWeight:600,color:"#d8eaf8",flex:1}}>{c.campaignName||c.name}</div>
              {p&&p.rank>0&&<div style={{background:p.color+"12",border:`1px solid ${p.color}28`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600,color:p.color}}>{p.label}</div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(85px,1fr))",gap:6,marginBottom:c.goal>0?10:0}}>
              {[["Impressions",m.impressions>0?fmtK(m.impressions):"—"],["Clicks",m.clicks>0?fmtK(m.clicks):"—"],["CTR",m.ctr>0?fmtPct(m.ctr):"—"],["CPM",m.cpm>0?fmt$(m.cpm):"—"],...(m.conversions>0?[["Conv.",fmtK(m.conversions)]]:[]),...(m.videoViews>0?[["Video",fmtK(m.videoViews)]]:[])].map(([l,v])=>(
                <div key={l} style={{background:"#060d18",border:"1px solid #0d1e32",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#2a4060",textTransform:"uppercase",letterSpacing:".04em",fontWeight:700,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#a8c4e0"}}>{v}</div>
                </div>
              ))}
            </div>
            {c.goal>0&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#2a4060",marginBottom:3}}><span>Goal Progress</span><span>{fmtK(m.impressions)} / {fmtK(parseFloat(c.goal))} ({gP.toFixed(0)}%)</span></div>
                <div style={{height:4,background:"#162236",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,width:gP.toFixed(1)+"%",background:p?p.color:"#00c896"}}/></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CampaignsTab({ campaigns, allCampaigns, platforms, pltFilter, setPltFilter, stFilter, setStFilter, expanded, setExpanded, drPreset, setDrPreset }) {
  function exportCampaignPDF(c) {
    const m=resolveMetrics(c); const p=getPacing(c);
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${c.campaignName||c.name}</title>
    <style>body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#111;padding:36px;max-width:680px;margin:0 auto;}
    h1{font-size:19px;font-weight:800;margin-bottom:3px;}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}
    .s{background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:11px 13px;}
    .sl{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:700;margin-bottom:4px;}.sv{font-size:18px;font-weight:800;}
    .dr{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;}
    .f{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;}
    @media print{.np{display:none;}}</style></head><body>
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
      <div><h1>${c.campaignName||c.name}</h1><div style="font-size:12px;color:#6b7280;">${c.platform} · ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div></div>
      <div style="font-size:13px;font-weight:800;text-align:right;">RECRUE MEDIA<br/><span style="font-size:11px;font-weight:400;color:#6b7280;">${AGENCY_EMAIL}</span></div>
    </div>
    <div class="g">
      ${[["Impressions",m.impressions>0?fmtK(m.impressions):"—"],["Clicks",m.clicks>0?fmtK(m.clicks):"—"],["CTR",m.ctr>0?fmtPct(m.ctr):"—"],["CPM",m.cpm>0?fmt$(m.cpm):"—"],["Conversions",m.conversions>0?fmtK(m.conversions):"—"],["Video Views",m.videoViews>0?fmtK(m.videoViews):"—"]].map(([l,v])=>`<div class="s"><div class="sl">${l}</div><div class="sv">${v}</div></div>`).join("")}
    </div>
    ${c.goal>0?`<div style="margin:14px 0;"><div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px;"><span>Delivery</span><span>${Math.min(100,Math.round(m.impressions/(parseFloat(c.goal)||1)*100))}%</span></div><div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;"><div style="height:100%;border-radius:3px;width:${Math.min(100,Math.round(m.impressions/(parseFloat(c.goal)||1)*100))}%;background:${p?p.color:"#16a34a"};"></div></div>${p?`<div style="font-size:12px;font-weight:600;color:${p.color};margin-top:5px;">Pacing: ${p.label}</div>`:""}</div>`:""}
    ${[["Status",c.status],["Platform",c.platform],["Start",fmtDate(c.startDate)],["End",fmtDate(c.endDate)]].map(([l,v])=>`<div class="dr"><span style="color:#6b7280;">${l}</span><span style="font-weight:600;text-transform:capitalize;">${v}</span></div>`).join("")}
    <div class="f"><span>recrue media · Confidential</span><span>${new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span></div>
    <div class="np" style="margin-top:18px;text-align:center;"><button onclick="window.print()" style="background:#002e24;border:1px solid #00c89650;color:#00e5a0;padding:9px 22px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;">Print / Save as PDF</button></div>
    </body></html>`);
    win.document.close();
  }

  const a=allCampaigns.filter(c=>c.status==="active").length;
  const p=allCampaigns.filter(c=>c.status==="paused").length;
  const e=allCampaigns.filter(c=>c.status==="ended").length;
  const drLabels = {mtd:"MTD",last7:"Last 7d",last30:"Last 30d",last90:"Last 90d",alltime:"All Time"};

  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",marginBottom:16}}>
        <div style={{flex:1,minWidth:120}}>
          <h2 style={{fontSize:20,fontWeight:800,color:"#edf4ff",letterSpacing:"-0.02em",marginBottom:3}}>Campaigns</h2>
          <div style={{fontSize:12,color:"#3d5a72"}}>{a} active · {p} paused · {e} ended</div>
        </div>
        <div style={{display:"flex",gap:3,background:"#060d18",border:"1px solid #1e293b",borderRadius:7,padding:3}}>
          {["all","active","paused","ended"].map(s=>{
            const col=s==="all"?"#7a9bbf":(STATUS[s]?.color||"#7a9bbf"); const on=stFilter===s;
            return <button key={s} onClick={()=>setStFilter(s)} style={{background:on?"#0a1525":"none",border:`1px solid ${on?col+"25":"transparent"}`,borderRadius:5,padding:"4px 11px",fontSize:12,color:on?col:"#2a4060",fontWeight:on?600:400,cursor:"pointer",fontFamily:FF,textTransform:"capitalize"}}>{s}</button>;
          })}
        </div>
        <select value={pltFilter} onChange={e=>setPltFilter(e.target.value)} style={{background:"#060d18",border:"1px solid #1e293b",borderRadius:7,padding:"6px 9px",color:"#4d6e8a",fontSize:12,cursor:"pointer",fontFamily:FF}}>
          {platforms.map(p=><option key={p} value={p}>{p==="all"?"All Platforms":p}</option>)}
        </select>
      </div>

      {/* Date range bar */}
      <div style={{background:"#060d18",border:"1px solid #1e293b",borderRadius:9,padding:"9px 13px",marginBottom:14,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:"#3d5a72",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginRight:4}}>Period</span>
        {Object.entries(drLabels).map(([k,lbl])=>(
          <button key={k} onClick={()=>setDrPreset(k)} style={{background:"none",border:`1px solid ${drPreset===k?"#00c89640":"transparent"}`,borderRadius:5,padding:"4px 11px",fontSize:12,color:drPreset===k?"#00e5a0":"#2a4060",fontWeight:drPreset===k?600:400,cursor:"pointer",fontFamily:FF,whiteSpace:"nowrap",background:drPreset===k?"#0a1525":"none"}}>{lbl}</button>
        ))}
      </div>

      <div style={{fontSize:11,color:"#2a4060",marginBottom:10}}>Showing {campaigns.length} campaign{campaigns.length!==1?"s":""}</div>
      {campaigns.length===0
        ? <div style={{textAlign:"center",padding:"50px 0",fontSize:13,color:"#2a4060"}}>No campaigns match your filters.</div>
        : campaigns.map(c=><CampaignRow key={c.id} c={c} expanded={expanded===c.id} onClick={()=>setExpanded(expanded===c.id?null:c.id)} onExport={exportCampaignPDF}/>)
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OrdersTab({ orders, orderView, setOrderView, selOrder, setSelOrder, orderStep, setOrderStep, form, setForm, pltDetails, setPltDetails, uploadedFiles, setUploadedFiles, msgDraft, setMsgDraft, submitOrder, sendMessage, viewOrder, blankForm, client }) {
  if (orderView === "new")    return <NewOrderForm orderStep={orderStep} setOrderStep={setOrderStep} form={form} setForm={setForm} pltDetails={pltDetails} setPltDetails={setPltDetails} uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} submitOrder={submitOrder} setOrderView={setOrderView} blankForm={blankForm} />;
  if (orderView === "detail") return <OrderDetail order={selOrder} setOrderView={setOrderView} msgDraft={msgDraft} setMsgDraft={setMsgDraft} sendMessage={sendMessage} />;

  const pending = orders.filter(o=>o.status==="pending").length;
  const active  = orders.filter(o=>o.status==="active").length;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#edf4ff",letterSpacing:"-0.02em",marginBottom:4}}>Orders</h2>
          <div style={{fontSize:12,color:"#3d5a72"}}>{orders.length} insertion orders · {pending} pending</div>
        </div>
        <button onClick={()=>{setOrderView("new");setOrderStep(1);setForm(blankForm());setPltDetails({});setUploadedFiles([]);}} style={{background:"#002e24",border:"1px solid #00c89650",borderRadius:7,padding:"8px 15px",color:"#00e5a0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FF}}>+ New Order</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
        {[{l:"Total",v:String(orders.length),s:"all time",a:"#7dd3fc"},{l:"Pending",v:String(pending),s:"awaiting approval",a:"#fde047"},{l:"Active",v:String(active),s:"running",a:"#00e5a0"}].map(s=>(
          <div key={s.l} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${s.a}35`}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3d5a72",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.a,letterSpacing:"-0.02em",marginBottom:2}}>{s.v}</div>
            <div style={{fontSize:11,color:"#2a4060"}}>{s.s}</div>
          </div>
        ))}
      </div>

      {orders.length===0?(
        <div style={{textAlign:"center",padding:"50px 0",color:"#2a4060"}}>
          <div style={{fontSize:13}}>No orders yet. Click <strong style={{color:"#00e5a0"}}>+ New Order</strong> to get started.</div>
        </div>
      ):orders.map(o=>{
        const unread=(o.messages||[]).filter(m=>m.isNew&&m.from==="agency").length;
        return (
          <div key={o.id} onClick={()=>viewOrder(o.id)} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:9,padding:"12px 14px",marginBottom:5,cursor:"pointer",transition:"border-color .12s"}}
            onMouseOver={e=>e.currentTarget.style.borderColor="#334155"}
            onMouseOut={e=>e.currentTarget.style.borderColor="#1e293b"}>
            <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#3d5a72",minWidth:64}}>{o.id}</div>
              <div style={{flex:1,minWidth:90}}>
                <div style={{fontSize:13,fontWeight:600,color:"#d8eaf8",marginBottom:1,display:"flex",alignItems:"center",gap:6}}>
                  {o.advertiser}
                  {unread>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:8,padding:"1px 6px",fontSize:9,fontWeight:800}}>{unread} new</span>}
                </div>
                <div style={{fontSize:10,color:"#3d5a72"}}>{o.start} → {o.end}</div>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{o.platforms.map(p=><span key={p} style={{fontSize:10,fontWeight:700,background:(PLT[p]||"#4d6e8a")+"14",border:`1px solid ${(PLT[p]||"#4d6e8a")}30`,color:PLT[p]||"#4d6e8a",borderRadius:4,padding:"2px 6px"}}>{p}</span>)}</div>
              <div style={{textAlign:"right",minWidth:65,flexShrink:0}}><div style={{fontSize:12,fontWeight:700,color:"#a8c4e0"}}>{fmtMoney(o.budget)}</div></div>
              <div style={{background:OSB[o.status]||"#0a1525",border:`1px solid ${OSC[o.status]||"#4d6e8a"}30`,borderRadius:4,padding:"2px 8px",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,color:OSC[o.status]||"#4d6e8a",textTransform:"capitalize"}}>{o.status}</span></div>
              <span style={{color:"#1e293b",fontSize:12,fontWeight:700}}>›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderDetail({ order: o, setOrderView, msgDraft, setMsgDraft, sendMessage }) {
  const msgs = o?.messages || [];
  const msgRef = useRef(null);
  useEffect(()=>{ if(msgRef.current) msgRef.current.scrollTop=msgRef.current.scrollHeight; },[msgs.length]);

  if (!o) return null;
  const stIdx = ORDER_FLOW.indexOf(o.status);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <button onClick={()=>setOrderView("list")} style={{background:"transparent",border:"1px solid #1e293b",borderRadius:7,padding:"6px 11px",color:"#4d6e8a",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FF}}>← Orders</button>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
            <h2 style={{fontSize:19,fontWeight:800,color:"#edf4ff"}}>{o.advertiser}</h2>
            <div style={{background:OSB[o.status]||"#0a1525",border:`1px solid ${OSC[o.status]||"#4d6e8a"}30`,borderRadius:5,padding:"2px 9px"}}><span style={{fontSize:12,fontWeight:700,color:OSC[o.status]||"#4d6e8a",textTransform:"capitalize"}}>{o.status}</span></div>
          </div>
          <div style={{fontSize:11,color:"#3d5a72",marginTop:2}}>{o.id} · {o.date}</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[{l:"Budget",v:fmtMoney(o.budget),a:"#00e5a0"},{l:"Impressions",v:fmtK(o.impressions),a:"#7dd3fc"},{l:"Flight",v:`${o.start} → ${o.end}`,a:"#a855f7",small:true}].map(s=>(
          <div key={s.l} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:9,padding:"13px 15px",borderLeft:`3px solid ${s.a}40`}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3d5a72",textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>{s.l}</div>
            <div style={{fontSize:s.small?12:19,fontWeight:800,color:s.a,marginTop:s.small?4:0}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Status timeline */}
      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"17px 19px",marginBottom:10}}>
        <SH>Order Status</SH>
        <div style={{display:"flex",alignItems:"center",margin:"12px 0"}}>
          {ORDER_FLOW.map((st,i)=>{
            const done=stIdx>i, cur=o.status===st;
            return (
              <React.Fragment key={st}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:1}}>
                  <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,border:"1px solid #1e293b",background:done?"#002e24":cur?"#0a1e38":"#0a1525",borderColor:done?"#00c89660":cur?"#7dd3fc50":"#1e293b",color:done?"#00e5a0":cur?"#7dd3fc":"#3d5a72"}}>{done?"✓":i+1}</div>
                  <span style={{fontSize:9,color:done?"#00d48a":cur?"#7dd3fc":"#3d5a72",textAlign:"center",fontWeight:cur?600:400}}>{st.charAt(0).toUpperCase()+st.slice(1)}</span>
                </div>
                {i<ORDER_FLOW.length-1&&<div style={{flex:1,height:1,background:done?"#00c89640":"#1e293b",marginTop:-14}}/>}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{fontSize:11,color:"#2a4060"}}>Status updates automatically via GitHub Actions when your agency processes the order.</div>
      </div>

      {/* Messages */}
      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"17px 19px",marginBottom:10}}>
        <SH>Messages <span style={{fontWeight:400,color:"#2a4060",textTransform:"none",letterSpacing:0,marginLeft:6}}>{msgs.length} message{msgs.length!==1?"s":""}</span></SH>

        {msgs.length===0
          ? <div style={{fontSize:12,color:"#2a4060",fontStyle:"italic",paddingBottom:8}}>No messages yet.</div>
          : <div ref={msgRef} style={{display:"flex",flexDirection:"column",maxHeight:240,overflowY:"auto",paddingRight:4,marginBottom:14}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.from==="client"?"flex-end":"flex-start"}}>
                  <div style={{fontSize:10,color:"#2a4060",marginBottom:2,textAlign:m.from==="client"?"right":"left"}}>{m.name} · {m.ts}</div>
                  <div style={{padding:"9px 13px",borderRadius:10,maxWidth:"75%",fontSize:13,lineHeight:1.5,marginBottom:8,
                    ...(m.from==="client"
                      ? {background:"#002e24",border:"1px solid #00c89640",color:"#d8eaf8",borderRadius:"10px 4px 10px 10px",alignSelf:"flex-end"}
                      : {background:"#0e1e38",border:"1px solid #1e4a7a40",color:"#a8c4e0",borderRadius:"4px 10px 10px 10px"}
                    )
                  }}>{m.text}</div>
                </div>
              ))}
            </div>
        }

        <textarea value={msgDraft} onChange={e=>setMsgDraft(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
          placeholder={`Message ${REP.name}… (Enter to send)`} rows={2}
          style={{width:"100%",background:"#060d18",border:"1px solid #1e293b",borderRadius:7,padding:"9px 11px",color:"#d8eaf8",fontSize:13,fontFamily:FF,outline:"none",resize:"vertical",lineHeight:1.5}}
          onFocus={e=>e.target.style.borderColor="#00c89660"}
          onBlur={e=>e.target.style.borderColor="#1e293b"}
        />
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
          <button onClick={sendMessage} style={{background:"#002e24",border:"1px solid #00c89650",borderRadius:7,padding:"7px 14px",color:"#00e5a0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FF}}>Send →</button>
        </div>
      </div>

      {/* Creative files */}
      {(o.creativeFiles||[]).length>0&&(
        <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"17px 19px",marginBottom:10}}>
          <SH>Creative Files</SH>
          {(o.creativeFiles||[]).map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",background:"#060d18",border:"1px solid #1e293b",borderRadius:7,marginBottom:5}}>
              <div style={{background:"#0a1e38",border:"1px solid #1e4a7a50",borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:700,color:"#7dd3fc",flexShrink:0}}>{f.type}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"#d8eaf8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</div>
                <div style={{fontSize:10,color:"#3d5a72"}}>{fileSz(f.size)}{f.note?" · "+f.note:""}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order details */}
      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"17px 19px"}}>
        <SH>Order Details</SH>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 18px"}}>
          {[["Advertiser",o.advertiser],["Reference",o.ref||o.id],["Billing ID",o.billingId||"—"],["Station",o.station||"—"],["Contact",o.contactName||"—"],["Email",o.contactEmail||"—"],["Rep",REP.name],["Rep Email",REP.email]].map(([l,v])=>(
            <div key={l}><span style={{fontSize:11,color:"#3d5a72"}}>{l}</span><div style={{fontSize:12,color:"#d8eaf8",marginTop:1}}>{v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── New Order Form ───────────────────────────────────────────────────────────
function NewOrderForm({ orderStep, setOrderStep, form, setForm, pltDetails, setPltDetails, uploadedFiles, setUploadedFiles, submitOrder, setOrderView, blankForm }) {
  const activePlts = PLATFORMS.filter(p=>form.platforms[p.id]);
  const fileInputRef = useRef(null);

  function handleFiles(files) {
    const nf = Array.from(files).map(f=>({name:f.name,size:f.size,type:fileIcon(f.name),note:"",uploadDate:new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}));
    setUploadedFiles(prev=>[...prev,...nf]);
  }

  function next() {
    if (orderStep===1 && !Object.values(form.platforms).some(Boolean)) { alert("Select at least one platform."); return; }
    if (orderStep===2 && !form.advertiser.trim()) { alert("Advertiser name is required."); return; }
    setOrderStep(s=>s+1);
  }

  const iS = { width:"100%",background:"#060d18",border:"1px solid #1e293b",borderRadius:7,padding:"9px 11px",color:"#d8eaf8",fontSize:13,fontFamily:FF,outline:"none",transition:"border-color .15s" };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <button onClick={()=>{setOrderView("list");setOrderStep(1);}} style={{background:"transparent",border:"1px solid #1e293b",borderRadius:7,padding:"6px 11px",color:"#4d6e8a",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FF}}>← Back</button>
        <div>
          <h2 style={{fontSize:19,fontWeight:800,color:"#edf4ff",marginBottom:1}}>New Insertion Order</h2>
          <div style={{fontSize:12,color:"#3d5a72"}}>Step {orderStep} of 3</div>
        </div>
      </div>

      {/* Step bar */}
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        {[{n:1,l:"Platforms"},{n:2,l:"Details"},{n:3,l:"Creative & Review"}].map((st,i)=>(
          <React.Fragment key={st.n}>
            <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
              <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,border:"1px solid #1e293b",background:orderStep===st.n?"#002e24":orderStep>st.n?"#002e24":"#0a1525",borderColor:orderStep>=st.n?"#00c89660":"#1e293b",color:orderStep===st.n?"#00e5a0":orderStep>st.n?"#00e5a0":"#3d5a72"}}>{orderStep>st.n?"✓":st.n}</div>
              <span style={{fontSize:11,color:orderStep===st.n?"#a8c4e0":"#3d5a72",whiteSpace:"nowrap"}}>{st.l}</span>
            </div>
            {i<2&&<div style={{flex:1,height:1,background:orderStep>st.n?"#00c89640":"#1e293b",margin:"0 6px"}}/>}
          </React.Fragment>
        ))}
      </div>

      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"22px"}}>

        {/* Step 1 */}
        {orderStep===1&&(
          <div>
            <SH>Select Platforms</SH>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:7}}>
              {PLATFORMS.map(p=>(
                <div key={p.id} onClick={()=>setForm(f=>({...f,platforms:{...f.platforms,[p.id]:!f.platforms[p.id]}}))}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 13px",background:form.platforms[p.id]?"#021a12":"#060d18",border:`1px solid ${form.platforms[p.id]?"#00c89640":"#1e293b"}`,borderRadius:8,cursor:"pointer",userSelect:"none"}}>
                  <span style={{fontSize:12,fontWeight:700,color:form.platforms[p.id]?p.color:"#4d6e8a"}}>{p.label}</span>
                  <div style={{width:30,height:17,borderRadius:9,background:form.platforms[p.id]?"#002e24":"#162236",border:`1px solid ${form.platforms[p.id]?"#00c89660":"#1e293b"}`,position:"relative",transition:"background .2s",flexShrink:0}}>
                    <div style={{position:"absolute",width:11,height:11,borderRadius:"50%",background:form.platforms[p.id]?"#00e5a0":"#3d5a72",top:2,left:form.platforms[p.id]?15:2,transition:"all .2s"}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:12,color:"#2a4060"}}>{!Object.values(form.platforms).some(Boolean)?"Select at least one platform.":`${Object.values(form.platforms).filter(Boolean).length} platform(s) selected.`}</div>
          </div>
        )}

        {/* Step 2 */}
        {orderStep===2&&(
          <div>
            <SH>Advertiser & Contact</SH>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Advertiser *</label><input style={iS} placeholder="Harvey's Furniture" value={form.advertiser} onChange={e=>setForm(f=>({...f,advertiser:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Station</label><input style={iS} placeholder="Moberly" value={form.station||""} onChange={e=>setForm(f=>({...f,station:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Billing ID</label><input style={iS} placeholder="M49304" value={form.billingId||""} onChange={e=>setForm(f=>({...f,billingId:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Start date *</label><input type="date" style={iS} value={form.startDate||""} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>End date *</label><input type="date" style={iS} value={form.endDate||""} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Contact name</label><input style={iS} placeholder="Laura Trujillo" value={form.contactName||""} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Contact email</label><input type="email" style={iS} placeholder="laura@client.com" value={form.contactEmail||""} onChange={e=>setForm(f=>({...f,contactEmail:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Contact phone</label><input style={iS} placeholder="623-256-9838" value={form.contactPhone||""} onChange={e=>setForm(f=>({...f,contactPhone:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
              <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Client website</label><input style={iS} placeholder="https://client.com" value={form.website||""} onChange={e=>setForm(f=>({...f,website:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
            </div>

            {activePlts.map(p=>(
              <div key={p.id} style={{marginBottom:18}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:p.color,marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${p.color}20`}}>{p.label}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:9}}>
                  {[["Gross impressions","344,820","impressions"],["Rate to Recrue ($)","14.00","rate"],["Gross budget ($)","4,827","budget"]].map(([lbl,ph,key])=>(
                    <div key={key}><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>{lbl}</label><input style={iS} placeholder={ph} value={(pltDetails[p.id]||{})[key]||""} onChange={e=>{const d={...pltDetails};if(!d[p.id])d[p.id]={};d[p.id][key]=e.target.value;setPltDetails(d);}} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:9}}>
                  <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Target audience</label><input style={iS} placeholder="Furniture shopper, in-market" value={(pltDetails[p.id]||{}).audience||""} onChange={e=>{const d={...pltDetails};if(!d[p.id])d[p.id]={};d[p.id].audience=e.target.value;setPltDetails(d);}} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
                  <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Target geo</label><input style={iS} placeholder="Quincy-Hannibal-Keokuk DMA" value={(pltDetails[p.id]||{}).geo||""} onChange={e=>{const d={...pltDetails};if(!d[p.id])d[p.id]={};d[p.id].geo=e.target.value;setPltDetails(d);}} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/></div>
                </div>
                <div><label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Pacing / creative notes</label>
                  <textarea style={{...iS,minHeight:60,resize:"vertical",lineHeight:1.5}} placeholder="34,482/mo · Creative ref: HF22624A (30s)..." value={(pltDetails[p.id]||{}).notes||""} onChange={e=>{const d={...pltDetails};if(!d[p.id])d[p.id]={};d[p.id].notes=e.target.value;setPltDetails(d);}} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3 */}
        {orderStep===3&&(
          <div>
            <SH>Creative Files</SH>
            <p style={{fontSize:12,color:"#3d5a72",marginBottom:12,lineHeight:1.6}}>Upload creative assets — video, images, audio, ZIP. Max 50 MB each.</p>
            <div
              onClick={()=>fileInputRef.current?.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
              style={{border:`2px dashed ${uploadedFiles.length>0?"#00c89640":"#1e293b"}`,borderRadius:9,padding:22,textAlign:"center",cursor:"pointer",background:uploadedFiles.length>0?"#021a12":"#060d18",transition:"all .2s",marginBottom:10}}>
              <input ref={fileInputRef} type="file" multiple accept=".mp4,.mov,.jpg,.jpeg,.png,.gif,.mp3,.wav,.pdf,.zip" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
              {uploadedFiles.length===0
                ?<><div style={{fontSize:22,marginBottom:8,color:"#1e293b"}}>↑</div><div style={{fontSize:13,fontWeight:700,color:"#4d6e8a",marginBottom:4}}>Drop files or click to browse</div><div style={{fontSize:11,color:"#2a4060"}}>Video, images, audio, ZIP</div></>
                :<div style={{fontSize:12,fontWeight:700,color:"#00e5a0"}}>{uploadedFiles.length} file{uploadedFiles.length>1?"s":""} ready · Drop more to add</div>
              }
            </div>

            {uploadedFiles.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                {uploadedFiles.map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#060d18",border:"1px solid #1e293b",borderRadius:7,padding:"8px 11px"}}>
                    <div style={{background:"#0a1e38",border:"1px solid #1e4a7a50",borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:700,color:"#7dd3fc",flexShrink:0}}>{f.type}</div>
                    <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:600,color:"#d8eaf8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</div>
                    <input style={{...iS,width:160,fontSize:11,padding:"4px 7px"}} placeholder="Note (30s spot...)" value={f.note||""} onChange={e=>{const uf=[...uploadedFiles];uf[i]={...uf[i],note:e.target.value};setUploadedFiles(uf);}} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/>
                    <button onClick={()=>setUploadedFiles(uf=>uf.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#3d5a72",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}} onMouseOver={e=>e.target.style.color="#ef4444"} onMouseOut={e=>e.target.style.color="#3d5a72"}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginBottom:18}}>
              <label style={{display:"block",fontSize:11,color:"#7a9bbf",fontWeight:600,marginBottom:5}}>Creative notes / file references</label>
              <textarea style={{...iS,minHeight:60,resize:"vertical",lineHeight:1.5}} placeholder="30s – HF22624A, 15s – HF22624B. Files from February should still be on file." value={form.creativeNote||""} onChange={e=>setForm(f=>({...f,creativeNote:e.target.value}))} onFocus={e=>e.target.style.borderColor="#00c89660"} onBlur={e=>e.target.style.borderColor="#1e293b"}/>
            </div>

            <SH>Order Summary</SH>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><span style={{fontSize:11,color:"#3d5a72"}}>Advertiser</span><div style={{fontSize:13,fontWeight:600,color:"#d8eaf8",marginTop:2}}>{form.advertiser||"—"}</div></div>
              <div><span style={{fontSize:11,color:"#3d5a72"}}>Flight</span><div style={{fontSize:13,fontWeight:600,color:"#d8eaf8",marginTop:2}}>{form.startDate||"—"} → {form.endDate||"—"}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              {[["Total Budget",fmtMoney(activePlts.reduce((s,p)=>s+(parseFloat((pltDetails[p.id]||{}).budget)||0),0)),"#00e5a0"],["Total Impressions",fmtK(activePlts.reduce((s,p)=>s+(parseFloat(((pltDetails[p.id]||{}).impressions||"").replace(/,/g,""))||0),0)),"#7dd3fc"]].map(([l,v,a])=>(
                <div key={l} style={{background:"#060d18",border:"1px solid #1e293b",borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:700,color:"#3d5a72",textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>{l}</div><div style={{fontSize:20,fontWeight:800,color:a}}>{v}</div></div>
              ))}
            </div>
            {activePlts.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:"#060d18",border:`1px solid ${p.color}20`,borderRadius:7,marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:6,height:6,borderRadius:"50%",background:p.color}}/><span style={{fontSize:12,fontWeight:600,color:p.color}}>{p.label}</span></div>
                <span style={{fontSize:11,color:"#4d6e8a"}}>{(pltDetails[p.id]||{}).budget?"$"+parseFloat((pltDetails[p.id]||{}).budget).toLocaleString():""}</span>
              </div>
            ))}
            <div style={{marginTop:14,padding:"11px 13px",background:"#060d18",border:"1px solid #1e293b",borderRadius:7,fontSize:12,color:"#3d5a72",lineHeight:1.6}}>
              Submitting opens your email client with a pre-filled order summary.{uploadedFiles.length>0?` ${uploadedFiles.length} creative file${uploadedFiles.length>1?"s":""} listed — attach before sending.`:""} Your order will appear as <strong style={{color:"#fde047"}}>Pending</strong> until {REP.name} approves it.
            </div>
          </div>
        )}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
        {orderStep>1
          ?<button onClick={()=>setOrderStep(s=>s-1)} style={{background:"transparent",border:"1px solid #1e293b",borderRadius:7,padding:"7px 13px",color:"#4d6e8a",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FF}}>← Back</button>
          :<div/>
        }
        {orderStep<3
          ?<button onClick={next} style={{background:"#002e24",border:"1px solid #00c89650",borderRadius:7,padding:"8px 15px",color:"#00e5a0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FF}}>Continue →</button>
          :<button onClick={submitOrder} style={{background:"#002e24",border:"1px solid #00c89650",borderRadius:7,padding:"8px 15px",color:"#00e5a0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FF}}>Submit Order →</button>
        }
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING TAB
// ═══════════════════════════════════════════════════════════════════════════════
function BillingTab({ invoices, selInvoice, setSelInvoice }) {
  const outstanding = invoices.filter(i=>i.status==="outstanding");
  const paid        = invoices.filter(i=>i.status==="paid");
  const totalOut    = outstanding.reduce((s,i)=>s+i.amount,0);
  const totalPaid   = paid.reduce((s,i)=>s+i.amount,0);

  function downloadInvoicePDF(inv) {
    const win = window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${inv.id}</title>
    <style>body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#111;padding:40px;max-width:700px;margin:0 auto;}
    h1{font-size:20px;font-weight:800;margin-bottom:3px;}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;}
    .total{display:flex;justify-content:space-between;padding:12px 0;font-size:15px;font-weight:800;border-top:2px solid #e2e8f0;margin-top:4px;}
    .f{margin-top:32px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;}
    @media print{.np{display:none;}}</style></head><body>
    <div style="display:flex;justify-content:space-between;margin-bottom:28px;align-items:flex-start;">
      <div><h1>${inv.id}</h1><div style="font-size:13px;color:#6b7280;margin-top:4px;">Invoice Date: ${inv.date}</div><div style="font-size:13px;color:#6b7280;">Due: ${inv.due}</div>${inv.paidDate?`<div style="font-size:13px;color:#16a34a;font-weight:600;margin-top:4px;">PAID ${inv.paidDate}</div>`:""}</div>
      <div style="text-align:right;"><div style="font-size:16px;font-weight:800;">RECRUE MEDIA</div><div style="font-size:12px;color:#6b7280;">${AGENCY_EMAIL}</div><div style="font-size:12px;color:#6b7280;">${REP.name}</div></div>
    </div>
    <div style="margin-bottom:16px;font-size:13px;">Bill to: ${inv.clientName||"Client"}</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;"><span>Description</span><span>Amount</span></div>
      ${(inv.items||[{desc:"Services",amount:inv.amount}]).map(item=>`<div class="row"><span>${item.desc}</span><span style="font-weight:600;">${fmtMoney(item.amount)}</span></div>`).join("")}
      <div class="total"><span>Total</span><span style="color:${inv.status==="outstanding"?"#ef4444":"#16a34a"};">${fmtMoney(inv.amount)}</span></div>
    </div>
    <div class="f"><span>recrue media · Thank you for your business</span><span>${inv.id}</span></div>
    <div class="np" style="margin-top:20px;text-align:center;"><button onclick="window.print()" style="background:#002e24;border:1px solid #00c89650;color:#00e5a0;padding:9px 22px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;">Print / Save as PDF</button></div>
    </body></html>`);
    win.document.close();
  }

  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#edf4ff",letterSpacing:"-0.02em",marginBottom:4}}>Billing</h2>
        <div style={{fontSize:12,color:"#3d5a72"}}>{invoices.length} invoices · {outstanding.length} outstanding</div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
        {[
          {l:"Outstanding Balance",v:fmtMoney(totalOut),s:`${outstanding.length} invoice${outstanding.length!==1?"s":""} due`,a:totalOut>0?"#ef4444":"#00e5a0"},
          {l:"Total Paid (YTD)",v:fmtMoney(totalPaid),s:`${paid.length} paid`,a:"#00e5a0"},
          {l:"Total Billed (YTD)",v:fmtMoney(invoices.reduce((s,i)=>s+i.amount,0)),s:`${invoices.length} invoices`,a:"#7dd3fc"},
        ].map(s=>(
          <div key={s.l} style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${s.a}40`}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3d5a72",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.a,marginBottom:3}}>{s.v}</div>
            <div style={{fontSize:11,color:"#2a4060"}}>{s.s}</div>
          </div>
        ))}
      </div>

      <SH>Invoice History</SH>
      {invoices.length===0?(
        <div style={{textAlign:"center",padding:"40px 0",fontSize:13,color:"#2a4060"}}>No invoices yet.</div>
      ):invoices.map(inv=>{
        const isOut = inv.status==="outstanding";
        const open  = selInvoice===inv.id;
        return (
          <div key={inv.id}>
            <div onClick={()=>setSelInvoice(open?null:inv.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:open?"#0e1a2e":"#060d18",border:"1px solid #1e293b",borderRadius:open?"9px 9px 0 0":9,marginBottom:open?0:5,cursor:"pointer",transition:"background .1s",flexWrap:"wrap"}}
              onMouseOver={e=>!open&&(e.currentTarget.style.borderColor="#334155")}
              onMouseOut={e=>!open&&(e.currentTarget.style.borderColor="#1e293b")}>
              <div style={{minWidth:92,flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#d8eaf8"}}>{inv.id}</div>
                <div style={{fontSize:10,color:"#3d5a72"}}>{inv.date}</div>
              </div>
              <div style={{flex:1,minWidth:80}}>
                <div style={{fontSize:11,color:"#4d6e8a"}}>Due {inv.due}</div>
                {inv.paidDate&&<div style={{fontSize:10,color:"#00d48a"}}>Paid {inv.paidDate}</div>}
              </div>
              <div style={{fontSize:14,fontWeight:800,color:isOut?"#ef4444":"#a8c4e0",textAlign:"right",minWidth:70}}>{fmtMoney(inv.amount)}</div>
              <div style={{background:isOut?"#1a0808":"#002e24",border:`1px solid ${isOut?"#ef444430":"#00c89630"}`,borderRadius:5,padding:"2px 9px",flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:700,color:isOut?"#ef4444":"#00d48a",textTransform:"capitalize"}}>{inv.status}</span>
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <button onClick={e=>{e.stopPropagation();downloadInvoicePDF(inv);}} style={{background:"#0a1e38",border:"1px solid #1e4a7a50",borderRadius:6,color:"#7dd3fc",fontSize:10,padding:"3px 8px",cursor:"pointer",fontWeight:700,fontFamily:FF}}>↓ PDF</button>
                <span style={{color:"#1e293b",fontSize:11,fontWeight:700}}>{open?"▲":"▼"}</span>
              </div>
            </div>
            {open&&(
              <div style={{background:"#060d18",border:"1px solid #1e293b",borderTop:"none",borderRadius:"0 0 9px 9px",padding:"13px 14px",marginBottom:5}}>
                <div style={{fontSize:10,fontWeight:700,color:"#4d6e8a",textTransform:"uppercase",letterSpacing:".05em",marginBottom:9}}>Line Items</div>
                {(inv.items||[{desc:"Services",amount:inv.amount}]).map((item,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #0d1e32",fontSize:12}}>
                    <span style={{color:"#a8c4e0"}}>{item.desc}</span><span style={{color:"#d8eaf8",fontWeight:700}}>{fmtMoney(item.amount)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0 0",fontSize:13,fontWeight:700}}>
                  <span style={{color:"#4d6e8a"}}>Total</span><span style={{color:isOut?"#ef4444":"#00e5a0"}}>{fmtMoney(inv.amount)}</span>
                </div>
                {isOut?<div style={{marginTop:12,padding:"9px 12px",background:"#1a0808",border:"1px solid #ef444430",borderRadius:7,fontSize:12,color:"#fca5a5"}}>Payment due by {inv.due}. Contact {REP.name} at <a href={`mailto:${REP.email}`} style={{color:"#fca5a5"}}>{REP.email}</a> to arrange payment.</div>:<div style={{marginTop:8,fontSize:11,color:"#2a4060"}}>Paid on {inv.paidDate}. Thank you!</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Rep card */}
      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px",marginTop:18}}>
        <SH>Billing Questions?</SH>
        <RepCard />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AccountTab({ client }) {
  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#edf4ff",letterSpacing:"-0.02em",marginBottom:4}}>Account</h2>
        <div style={{fontSize:12,color:"#3d5a72"}}>{client.partnerName} · Client Portal</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px"}}>
          <SH>Contact Information</SH>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[["Full name",client.displayName],["Email",client.email||"—"],["Company",client.partnerName]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:10,color:"#3d5a72",fontWeight:600,marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,color:"#d8eaf8"}}>{v}</div>
              </div>
            ))}
          </div>
          <button style={{marginTop:16,width:"100%",background:"transparent",border:"1px solid #1e293b",borderRadius:7,padding:"7px 0",color:"#4d6e8a",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FF,transition:"border-color .15s"}}
            onMouseOver={e=>e.target.style.borderColor="#334155"} onMouseOut={e=>e.target.style.borderColor="#1e293b"}>
            Edit Contact Info
          </button>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px"}}>
            <SH>Security</SH>
            <div style={{fontSize:12,color:"#4d6e8a",marginBottom:12}}>Session expires after 8 hours of inactivity.</div>
            <button style={{width:"100%",background:"transparent",border:"1px solid #1e293b",borderRadius:7,padding:"7px 0",color:"#4d6e8a",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FF}}>Change Password</button>
          </div>
          <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px"}}>
            <SH>Notifications</SH>
            {[["Campaign pacing alerts",true],["Order status updates",true],["Invoice reminders",true],["Weekly digest",false]].map(([l,on])=>(
              <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #0d1e32"}}>
                <span style={{fontSize:12,color:"#a8c4e0"}}>{l}</span>
                <div style={{width:30,height:17,borderRadius:9,background:on?"#002e24":"#162236",border:`1px solid ${on?"#00c89660":"#1e293b"}`,position:"relative",flexShrink:0}}>
                  <div style={{position:"absolute",width:11,height:11,borderRadius:"50%",background:on?"#00e5a0":"#3d5a72",top:2,left:on?15:2}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:"#0a1525",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px"}}>
        <SH>Your Account Manager</SH>
        <RepCard />
      </div>
    </div>
  );
}

// ─── Error block ──────────────────────────────────────────────────────────────
function ErrorBlock({ msg }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#040c18",fontFamily:FF}}>
      <div style={{background:"#0a1525",border:"1px solid #334155",borderRadius:12,padding:"28px 32px",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:12,color:"#ef4444",marginBottom:6,fontWeight:700}}>Error</div>
        <div style={{fontSize:13,color:"#3d5a72"}}>{msg}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const { token, client } = JSON.parse(raw);
      return parseToken(token) ? { client, token } : null;
    } catch { return null; }
  });

  return session
    ? <Portal client={session.client} onLogout={()=>{ sessionStorage.removeItem(SESSION_KEY); setSession(null); }}/>
    : <LoginScreen onLogin={(client,token)=>{sessionStorage.setItem(SESSION_KEY,JSON.stringify({token,client}));setSession({client,token});}} />;
}
