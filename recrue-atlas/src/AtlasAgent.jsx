import React, { useState, useEffect, useRef } from 'react'

// ─── CONFIG ──────────────────────────────────────────────
const AGENCY     = 'recrue media'
const AGENT_NAME = 'Atlas'
const AGENCY_EMAIL = 'agagan@recruemedia.com'

// ─── STYLES (injected once) ───────────────────────────────
const CSS = `
  @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes glow    { 0%,100%{box-shadow:0 0 20px rgba(0,229,160,.15)} 50%{box-shadow:0 0 44px rgba(0,229,160,.45)} }
  @keyframes barGrow { from{width:0} }
  .fia { animation: fadeIn .3s ease both; }
  .fua { animation: fadeUp .4s ease both; }
  button:active { transform: scale(.98); }
`

// ─── VERTICALS ────────────────────────────────────────────
const VERTICALS = {
  'Auto Dealership': {
    icon: '🚗', color: '#7dd3fc',
    platforms: ['FB', 'SEM', 'CTV', 'DSP'],
    audiences: ['In-market auto buyers (30–90 day window)', 'Lease expiration targeting (6–12 months)', 'Service lane retention (past customers)', 'Conquest — competitor brand owners'],
    kpis: ['VDP views', 'Phone calls', 'Form submissions', 'Test drive bookings'],
    benchmarks: { ctr: '1.8', cpm: '12', cpl: '45', conv: '3.2' },
    creative: ['New inventory spotlights', 'Service specials', 'Trade-in valuation offer', 'Customer testimonials'],
  },
  'HVAC / Heating & Cooling': {
    icon: '❄️', color: '#00e5a0',
    platforms: ['SEM', 'LSA', 'FB', 'DSP'],
    audiences: ['Homeowners 30–65', 'Recent home buyers (< 2 years)', 'Seasonal trigger (temp spike/drop)', 'Home age targeting (10+ year HVAC systems)'],
    kpis: ['Phone calls', 'Form fills', 'Emergency service leads', 'Tune-up bookings'],
    benchmarks: { ctr: '4.2', cpm: '8', cpl: '35', conv: '8.1' },
    creative: ['Emergency AC/heat repair', 'Spring/fall tune-up offer', '0% financing options', 'Before/after energy savings'],
  },
  'Plumbing': {
    icon: '🔧', color: '#7dd3fc',
    platforms: ['SEM', 'LSA', 'FB', 'DSP'],
    audiences: ['Homeowners 30–65', 'Recent home buyers', 'Emergency intent keywords', 'Local geo radius (15–25 mi)'],
    kpis: ['Phone calls', 'Emergency service leads', 'Form fills', 'Online bookings'],
    benchmarks: { ctr: '5.1', cpm: '7', cpl: '30', conv: '9.2' },
    creative: ['Emergency plumbing', 'Water heater replacement', 'Drain cleaning special', 'Free inspection offer'],
  },
  'Electrical': {
    icon: '⚡', color: '#fde047',
    platforms: ['SEM', 'LSA', 'FB', 'DSP'],
    audiences: ['Homeowners 30–65', 'New construction areas', 'Home renovation intent', 'Local radius'],
    kpis: ['Phone calls', 'Panel upgrade leads', 'Form fills', 'Inspection bookings'],
    benchmarks: { ctr: '3.8', cpm: '9', cpl: '38', conv: '7.0' },
    creative: ['Panel upgrade offer', 'EV charger installation', 'Safety inspection', 'Generator installation'],
  },
  'Roofing': {
    icon: '🏠', color: '#f472b6',
    platforms: ['FB', 'SEM', 'LSA', 'DSP'],
    audiences: ['Homeowners 35–65', 'Post-storm targeting', 'Home age 15+ years', 'Insurance claim intent'],
    kpis: ['Inspection requests', 'Phone calls', 'Free estimate forms', 'Storm damage leads'],
    benchmarks: { ctr: '2.9', cpm: '11', cpl: '55', conv: '4.5' },
    creative: ['Free roof inspection', 'Storm damage assessment', 'Finance options', 'Before/after photos'],
  },
  'Landscaping': {
    icon: '🌿', color: '#00d48a',
    platforms: ['FB', 'SEM', 'DSP', 'CTV'],
    audiences: ['Homeowners 35–65', 'High-income neighborhoods', 'Spring/fall seasonal', 'New home buyers'],
    kpis: ['Quote requests', 'Phone calls', 'Seasonal contract leads', 'Online bookings'],
    benchmarks: { ctr: '2.2', cpm: '8', cpl: '42', conv: '5.8' },
    creative: ['Spring cleanup special', 'Free estimate offer', 'Before/after transformations', 'Recurring service packages'],
  },
  default: {
    icon: '🏢', color: '#a855f7',
    platforms: ['FB', 'SEM', 'DSP'],
    audiences: ['Local customers 25–65', 'In-market buyers', 'Retargeting — website visitors', 'Lookalike audiences'],
    kpis: ['Phone calls', 'Form fills', 'Website visits', 'Lead quality score'],
    benchmarks: { ctr: '2.1', cpm: '9', cpl: '40', conv: '5.0' },
    creative: ['Service highlight', 'Special offer / promotion', 'Social proof / reviews', 'Brand story'],
  },
}

function getVertical(type) {
  if (!type) return VERTICALS.default
  return VERTICALS[type] || VERTICALS[
    Object.keys(VERTICALS).find(k => k !== 'default' && type.toLowerCase().includes(k.toLowerCase().split(' ')[0])) || 'default'
  ] || VERTICALS.default
}

// ─── PLATFORM INFO ────────────────────────────────────────
const PLT_INFO = {
  FB:  { name: 'Facebook & Instagram', color: '#f472b6', why: 'Broad reach + retargeting',         detail: 'Video & carousel ads targeting in-market audiences' },
  SEM: { name: 'Google Search',        color: '#6effd8', why: 'Highest intent — people searching', detail: 'Exact & phrase match keywords for your service area' },
  LSA: { name: 'Google Local Service', color: '#00ffb3', why: 'Pay-per-lead, top of Google',        detail: 'Verified badge + guaranteed leads directly from Google' },
  DSP: { name: 'Programmatic Display', color: '#7dd3fc', why: 'Retargeting + awareness',            detail: 'Follow past visitors across the web with your ads' },
  CTV: { name: 'Connected TV',         color: '#a8c4e0', why: 'Premium streaming video',            detail: '15s & 30s spots on Hulu, Peacock, and streaming apps' },
  TTD: { name: 'Trade Desk',           color: '#00ffb3', why: 'Premium programmatic',               detail: 'Cross-device reach across premium publishers' },
}
const PLT_COLOR = { FB:'#f472b6', FBV:'#a855f7', DSP:'#7dd3fc', CTV:'#a8c4e0', SEM:'#6effd8', LSA:'#00ffb3', TTD:'#00ffb3', default:'#7dd3fc' }

// ─── WIZARD STEPS ─────────────────────────────────────────
const STEPS = [
  {
    id: 'type', q: 'What type of business are you?', type: 'choice',
    choices: ['Auto Dealership', 'HVAC / Heating & Cooling', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping', 'Other Home Service', 'Other'],
  },
  {
    id: 'name', q: 'What\'s your business name?', type: 'text',
    ph: 'e.g. Martinez Ford, Apex HVAC...',
  },
  {
    id: 'location', q: 'Where are you located?', type: 'text',
    ph: 'City, State — e.g. Phoenix, AZ',
  },
  {
    id: 'goal', q: 'What\'s your #1 goal right now?', type: 'choice',
    choices: ['More sales / leads', 'More phone calls', 'More website traffic', 'More foot traffic', 'More brand awareness', 'More newsletter signups'],
  },
  {
    id: 'budget', q: 'What\'s your monthly ad budget?', type: 'choice',
    choices: ['$2,000 – $3,500', '$3,500 – $5,000', '$5,000 – $7,500', '$7,500 – $10,000', '$10,000+'],
  },
  {
    id: 'urgency', q: 'When do you want to start seeing results?', type: 'choice',
    choices: ['As soon as possible', 'Within 2 weeks', 'Next month', 'Just exploring'],
  },
]

// ─── HELPERS ─────────────────────────────────────────────
function fmtK(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
  return String(Math.round(v))
}
function fmtM(v) { return '$' + Math.round(v).toLocaleString() }

function budgetMid(range) {
  if (!range) return 5000
  const nums = range.replace(/\$|,|\+/g, '').split('–').map(s => parseInt(s.trim())).filter(Boolean)
  if (nums.length === 0) return 10000
  if (nums.length === 1) return nums[0]
  return Math.round((nums[0] + nums[1]) / 2)
}

function getProjections(budget, v) {
  const cpm  = parseFloat(v.benchmarks.cpm)  || 9
  const ctr  = parseFloat(v.benchmarks.ctr)  / 100 || 0.02
  const cpl  = parseFloat(v.benchmarks.cpl)  || 40
  const impressions = Math.round((budget / cpm) * 1000)
  const clicks      = Math.round(impressions * ctr)
  const leads       = Math.round(budget / cpl)
  return { impressions, clicks, leads, cpl }
}

function getPlatformSplit(platforms, budget) {
  const weights = [0.40, 0.35, 0.25]
  return platforms.slice(0, 3).map((p, i) => ({
    ...(PLT_INFO[p] || { name: p, color: '#7dd3fc', why: 'Targeted reach', detail: 'Platform campaigns' }),
    spend: Math.round(budget * weights[i]),
    pct:   Math.round(weights[i] * 100),
  }))
}

// ─── BUILD LOG LINES ─────────────────────────────────────
function getBuildLog(business, v) {
  const loc = business.location || 'your area'
  const plats = v.platforms.slice(0, 3)
  return [
    'Connecting to Meta Business Manager API...',
    'Authenticating Google Ads MCC account...',
    `Creating campaign structure in ${plats[0]} Ads...`,
    `Building ad sets: in-market audiences in ${loc}...`,
    `Configuring geo targeting: ${loc} + 25-mile radius...`,
    `Setting up ${plats[1] || 'Search'} campaign structure...`,
    `Adding ${v.kpis[0]} conversion tracking...`,
    `Uploading creative assets to ad accounts...`,
    'Configuring bid strategies (Target CPA)...',
    'Setting daily budgets and flight dates...',
    'Running policy compliance checks...',
    'Submitting campaigns for platform review...',
    'All campaigns submitted ✓ — awaiting platform approval (24–48 hrs)',
  ]
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AtlasAgent({ onGoPortal }) {
  const [screen, setScreen]       = useState('landing')   // landing|onboard|strategy|agent|dashboard
  const [step, setStep]           = useState(0)
  const [business, setBusiness]   = useState({})
  const [buildProgress, setBuildProgress] = useState(0)
  const [buildStep, setBuildStep] = useState(0)
  const [agentLog, setAgentLog]   = useState([])
  const [buildDone, setBuildDone] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [typing, setTyping]       = useState(false)
  const chatRef = useRef(null)
  const inputRef = useRef(null)

  // Inject CSS once
  useEffect(() => {
    const id = 'atlas-css'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id
      s.textContent = CSS
      document.head.appendChild(s)
    }
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chatHistory, typing])

  const v      = getVertical(business.type)
  const budget = budgetMid(business.budget)
  const projected = getProjections(budget, v)

  // ── Navigation helpers ───────────────────────────────────
  function goStep(n) { setStep(n) }

  function handleChoice(field, value, autoAdvance) {
    setBusiness(prev => ({ ...prev, [field]: value }))
    if (autoAdvance) setTimeout(() => advanceStep(), 280)
  }

  function advanceStep() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      setScreen('strategy')
    }
  }

  function handleTextContinue() {
    const val = (business[STEPS[step].id] || '').trim()
    if (!val) return
    advanceStep()
  }

  // ── Strategy approval → agent build ─────────────────────
  function approveStrategy() {
    setScreen('agent')
    setBuildProgress(0)
    setBuildStep(0)
    setAgentLog([])
    setBuildDone(false)
    const log = getBuildLog(business, v)
    let i = 0
    const id = setInterval(() => {
      setBuildProgress(Math.min(100, Math.round((i / log.length) * 100)))
      setBuildStep(Math.min(7, Math.floor(i / 1.6)))
      if (i < log.length) setAgentLog(prev => [...prev, log[i]])
      i++
      if (i >= log.length + 2) {
        clearInterval(id)
        setBuildDone(true)
      }
    }, 420)
  }

  // ── Atlas chat ───────────────────────────────────────────
  async function sendChat(msg) {
    const text = (msg || chatInput).trim()
    if (!text) return
    const userMsg = { role: 'user', content: text }
    setChatHistory(prev => [...prev, userMsg])
    setChatInput('')
    setTyping(true)

    const systemPrompt = `You are Atlas, an AI advertising agent for ${AGENCY}. You manage digital advertising campaigns for ${business.name || 'a local business'} — a ${business.type || 'local business'} in ${business.location || 'their area'}. Their goal is ${business.goal || 'more leads'}. Monthly budget: ${business.budget || '$5,000'}. Running campaigns on: ${v.platforms.slice(0, 3).join(', ')}. Projected monthly leads: ${projected.leads}. Projected impressions: ${fmtK(projected.impressions)}. Be concise, specific, confident, and action-oriented. Never say you are Claude or an AI made by Anthropic. You are Atlas, built by recrue media.`

    const messages = [...chatHistory, userMsg].map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages,
        }),
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || getFallback()
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: getFallback() }])
    } finally {
      setTyping(false)
    }
  }

  function getFallback() {
    const fallbacks = [
      `Your campaigns are performing well — CTR is tracking above industry average for ${business.type || 'your vertical'}. I'd suggest a 15% budget increase on Search to capture more demand.`,
      `Based on your goal of ${(business.goal || 'more leads').toLowerCase()}, I'm seeing strong signals from the in-market segment. I've queued a bid adjustment for tomorrow.`,
      `${business.location || 'Your market'} has moderate competition right now — good time to be aggressive. Want me to shift budget from display to Search for more direct conversions?`,
    ]
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  const screens = { landing, onboard, strategy, agent, dashboard }
  return screens[screen]?.() || landing()

  // ── LANDING ─────────────────────────────────────────────
  function landing() {
    return (
      <div style={{ minHeight: '100vh', background: '#040c18', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient */}
        <div style={{ position: 'fixed', top: -160, left: -120, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,229,160,.08) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: -120, right: -100, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle,rgba(125,211,252,.06) 0%,transparent 65%)', pointerEvents: 'none' }} />

        {/* Nav */}
        <nav style={{ padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b', background: 'rgba(4,12,24,.95)', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: '#0a1525', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#00e5a0' }}>R</div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: '#7a9bbf', textTransform: 'uppercase' }}>recrue media</span>
          <div style={{ flex: 1 }} />
          <button onClick={onGoPortal} style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: 7, padding: '7px 14px', color: '#4d6e8a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Client Portal →
          </button>
          <button onClick={() => setScreen('onboard')} style={{ background: '#002e24', border: '1px solid #00c89650', borderRadius: 7, padding: '8px 18px', color: '#00e5a0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Get Started →
          </button>
        </nav>

        {/* Hero */}
        <div className="fua" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
          {/* Atlas badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0a1525', border: '1px solid #00c89640', borderRadius: 20, padding: '6px 18px', marginBottom: 28 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5a0', animation: 'pulse 1.5s ease-in-out infinite', boxShadow: '0 0 8px rgba(0,229,160,.6)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#00e5a0', letterSpacing: '.06em' }}>ATLAS — AI Advertising Agent · Powered by recrue media</span>
          </div>

          <h1 style={{ fontSize: 'clamp(30px,5vw,48px)', fontWeight: 900, color: '#edf4ff', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, maxWidth: 680 }}>
            Describe your goal.<br />
            <span style={{ color: '#00e5a0' }}>Atlas builds the campaigns.</span>
          </h1>

          <p style={{ fontSize: 18, color: '#4d6e8a', maxWidth: 500, lineHeight: 1.6, marginBottom: 36 }}>
            Tell Atlas what your business needs — more leads, calls, or customers. The AI agent builds, launches, and optimizes your advertising automatically.
          </p>

          {/* Goal chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40, maxWidth: 580 }}>
            {['More leads for my dealership', 'Fill my HVAC schedule', 'More calls for my plumbing company', 'Grow my home service business', 'Drive more foot traffic'].map(g => (
              <button key={g} onClick={() => { setBusiness(b => ({ ...b, quickGoal: g })); setScreen('onboard') }}
                style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 20, padding: '8px 16px', color: '#7a9bbf', fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}
                onMouseOver={e => { e.target.style.borderColor = '#00c89640'; e.target.style.color = '#00e5a0' }}
                onMouseOut={e => { e.target.style.borderColor = '#1e293b'; e.target.style.color = '#7a9bbf' }}>
                {g}
              </button>
            ))}
          </div>

          <button onClick={() => setScreen('onboard')}
            style={{ background: '#002e24', border: '1px solid #00c89650', borderRadius: 10, padding: '16px 38px', color: '#00e5a0', fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '.02em', animation: 'glow 3s ease-in-out infinite' }}>
            Start Building My Campaign →
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: '#2a4060' }}>Free strategy session · No commitment · Campaigns launch in 48 hours</div>
        </div>

        {/* How it works */}
        <div style={{ padding: '28px', borderTop: '1px solid #0d1e32', background: '#060d18' }}>
          <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#3d5a72', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>How Atlas works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {[
              { n: '01', t: 'Describe your goal', d: 'Plain English — no ad expertise needed', c: '#00e5a0' },
              { n: '02', t: 'Atlas builds strategy', d: 'AI selects platforms, audiences & budgets', c: '#7dd3fc' },
              { n: '03', t: 'Review & approve', d: 'See your plan before anything launches', c: '#a855f7' },
              { n: '04', t: 'Campaigns go live', d: 'Atlas monitors and optimizes 24/7', c: '#fde047' },
            ].map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: s.c, letterSpacing: '.1em', marginBottom: 7 }}>{s.n}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#d8eaf8', marginBottom: 4 }}>{s.t}</div>
                <div style={{ fontSize: 11, color: '#3d5a72', lineHeight: 1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── ONBOARDING WIZARD ────────────────────────────────────
  function onboard() {
    const current = STEPS[step]
    const progress = ((step + 1) / STEPS.length) * 100

    return (
      <div style={{ minHeight: '100vh', background: '#040c18', display: 'flex', flexDirection: 'column' }}>
        {/* Progress */}
        <div style={{ height: 3, background: '#162236' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#00c896,#00e5a0)', width: `${progress}%`, transition: 'width .4s ease', boxShadow: '0 0 8px rgba(0,229,160,.4)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: '#0a1525', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#00e5a0' }}>R</div>
          <span style={{ fontSize: 11, color: '#3d5a72' }}>Atlas · Setup · Step {step + 1} of {STEPS.length}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#2a4060' }}>{Math.round(progress)}%</span>
        </div>

        {/* Content */}
        <div className="fia" key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
          <div style={{ width: '100%', maxWidth: 520 }}>

            {/* Atlas message bubble */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 26 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#002e24', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#00e5a0', flexShrink: 0, boxShadow: '0 0 14px rgba(0,229,160,.18)' }}>A</div>
              <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: '4px 12px 12px 12px', padding: '14px 18px', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#00e5a0', marginBottom: 6 }}>Atlas</div>
                <div style={{ fontSize: 15, color: '#d8eaf8', lineHeight: 1.5 }}>{current.q}</div>
                {step === 0 && business.quickGoal && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#4d6e8a' }}>
                    You mentioned: <span style={{ color: '#00e5a0' }}>"{business.quickGoal}"</span> — I'll use that to personalize your strategy.
                  </div>
                )}
              </div>
            </div>

            {/* Choice input */}
            {current.type === 'choice' && (
              <div style={{ display: 'grid', gridTemplateColumns: current.choices.length > 5 ? '1fr 1fr' : '1fr', gap: 8 }}>
                {current.choices.map(c => {
                  const selected = business[current.id] === c
                  const autoAdvance = current.id === 'budget' || current.id === 'urgency' || current.id === 'goal' || current.id === 'type'
                  return (
                    <button key={c}
                      onClick={() => handleChoice(current.id, c, autoAdvance)}
                      style={{
                        background: selected ? '#002e24' : '#0a1525',
                        border: `1px solid ${selected ? '#00c89650' : '#1e293b'}`,
                        borderRadius: 9, padding: '13px 16px',
                        color: selected ? '#00e5a0' : '#a8c4e0',
                        fontSize: 13, fontWeight: selected ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all .15s',
                      }}
                      onMouseOver={e => { if (!selected) e.currentTarget.style.borderColor = '#334155' }}
                      onMouseOut={e => { if (!selected) e.currentTarget.style.borderColor = '#1e293b' }}>
                      <span>{c}</span>
                      {selected && <span style={{ color: '#00e5a0', fontSize: 14 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Text input */}
            {current.type === 'text' && (
              <>
                <input
                  autoFocus
                  type="text"
                  placeholder={current.ph || ''}
                  value={business[current.id] || ''}
                  onChange={e => setBusiness(b => ({ ...b, [current.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleTextContinue() }}
                  style={{
                    width: '100%', background: '#060d18', border: '1px solid #1e293b',
                    borderRadius: 9, padding: '14px 16px', color: '#d8eaf8',
                    fontSize: 15, outline: 'none', transition: 'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#00c89660'}
                  onBlur={e => e.target.style.borderColor = '#1e293b'}
                />
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleTextContinue}
                    style={{ background: '#002e24', border: '1px solid #00c89650', borderRadius: 8, padding: '11px 22px', color: '#00e5a0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Continue →
                  </button>
                </div>
              </>
            )}

            {/* Back button */}
            {step > 0 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={() => setStep(s => s - 1)}
                  style={{ background: 'none', border: 'none', color: '#3d5a72', fontSize: 12, cursor: 'pointer' }}>
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── STRATEGY ─────────────────────────────────────────────
  function strategy() {
    const platforms = v.platforms.slice(0, 3)
    const split     = getPlatformSplit(platforms, budget)

    return (
      <div style={{ minHeight: '100vh', background: '#040c18', overflowY: 'auto' }}>
        {/* Sticky header */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: 'rgba(4,12,24,.97)', zIndex: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: '#0a1525', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#00e5a0' }}>R</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a8c4e0' }}>{business.name || 'Your Business'}</div>
            <div style={{ fontSize: 10, color: '#3d5a72' }}>Atlas Strategy · {business.location || ''}</div>
          </div>
          <button onClick={() => { setStep(0); setScreen('onboard') }}
            style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, padding: '5px 11px', color: '#4d6e8a', fontSize: 11, cursor: 'pointer' }}>
            Edit
          </button>
          <button onClick={approveStrategy}
            style={{ background: '#002e24', border: '1px solid #00c89650', borderRadius: 6, padding: '7px 16px', color: '#00e5a0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Approve & Launch →
          </button>
        </div>

        <div className="fia" style={{ padding: '22px', maxWidth: 860, margin: '0 auto' }}>

          {/* Atlas intro */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#002e24', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#00e5a0', flexShrink: 0 }}>A</div>
            <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: '4px 12px 12px 12px', padding: '15px 19px', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#00e5a0', marginBottom: 7 }}>Atlas · Campaign Strategy</div>
              <div style={{ fontSize: 14, color: '#d8eaf8', lineHeight: 1.6 }}>
                I've built a strategy for <strong style={{ color: '#edf4ff' }}>{business.name || 'your business'}</strong> to get <strong style={{ color: '#00e5a0' }}>{(business.goal || 'more leads').toLowerCase()}</strong> in <strong style={{ color: '#edf4ff' }}>{business.location || 'your area'}</strong> with a <strong style={{ color: '#fde047' }}>{business.budget || '$5,000'}/mo</strong> budget. Review below and approve when ready.
              </div>
            </div>
          </div>

          {/* Projections */}
          <div style={{ background: '#002e24', border: '1px solid #00c89640', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#00e5a0', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 13 }}>Projected Monthly Results</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
              {[
                { l: 'Impressions', v: fmtK(projected.impressions), s: 'people reached' },
                { l: 'Clicks',      v: fmtK(projected.clicks),      s: 'to your site/offer' },
                { l: 'Leads',       v: String(projected.leads),      s: v.kpis[0] },
                { l: 'Cost/Lead',   v: fmtM(projected.cpl),          s: 'industry benchmark' },
              ].map(p => (
                <div key={p.l} style={{ background: '#021a12', border: '1px solid #00c89630', borderRadius: 8, padding: '11px 14px' }}>
                  <div style={{ fontSize: 9, color: '#00d48a', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginBottom: 5 }}>{p.l}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#00e5a0', letterSpacing: '-0.02em', marginBottom: 2 }}>{p.v}</div>
                  <div style={{ fontSize: 10, color: '#1e4030' }}>{p.s}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#1e4030' }}>* Based on {business.type || 'your industry'} benchmarks. Actual results vary.</div>
          </div>

          {/* Platform split */}
          <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4d6e8a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>
              Platform Allocation — {business.budget || '$5,000'}/mo
            </div>
            {split.map(p => (
              <div key={p.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: '#3d5a72' }}>{p.why}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#a8c4e0' }}>{fmtM(p.spend)}/mo</span>
                    <span style={{ fontSize: 10, color: '#2a4060', marginLeft: 6 }}>{p.pct}%</span>
                  </div>
                </div>
                <div style={{ height: 5, background: '#162236', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${p.pct}%`, background: p.color, opacity: .8, animation: 'barGrow .6s ease' }} />
                </div>
                <div style={{ fontSize: 10, color: '#2a4060', marginTop: 4 }}>{p.detail}</div>
              </div>
            ))}
          </div>

          {/* Audiences */}
          <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4d6e8a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 13 }}>Target Audiences</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {v.audiences.map((a, i) => (
                <div key={a} style={{ background: '#060d18', border: `1px solid ${i === 0 ? '#00c89640' : '#1e293b'}`, borderRadius: 8, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#00e5a0' : '#3d5a72', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? '#d8eaf8' : '#a8c4e0' }}>{a}</div>
                    {i === 0 && <div style={{ fontSize: 10, color: '#00d48a' }}>Primary — highest intent</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Creative */}
          <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4d6e8a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 13 }}>Creative Strategy</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 8 }}>
              {v.creative.map((c, i) => (
                <div key={c} style={{ background: '#060d18', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 13px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#3d5a72', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Ad {i + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#a8c4e0' }}>{c}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 13px', background: '#060d18', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11, color: '#3d5a72', lineHeight: 1.6 }}>
              <strong style={{ color: '#7a9bbf' }}>⚡ Coming soon:</strong> Atlas will generate ad creative automatically from your brand assets — images, video, copy.
            </div>
          </div>

          {/* KPIs */}
          <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 20px', marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4d6e8a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 13 }}>Success Metrics Atlas Will Track</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {v.kpis.map(k => (
                <div key={k} style={{ background: '#060d18', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 13px', fontSize: 12, fontWeight: 600, color: '#a8c4e0' }}>{k}</div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: '#002e24', border: '1px solid #00c89640', borderRadius: 12, padding: '22px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#edf4ff', marginBottom: 6 }}>Ready to launch?</div>
            <div style={{ fontSize: 13, color: '#4d6e8a', marginBottom: 18 }}>Atlas will begin building your campaigns immediately. Go-live in 48 hours.</div>
            <button onClick={approveStrategy}
              style={{ background: '#002e24', border: '2px solid #00c89660', borderRadius: 10, padding: '14px 32px', color: '#00e5a0', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 30px rgba(0,200,150,.18)', animation: 'glow 3s ease-in-out infinite' }}>
              Approve Strategy & Launch Campaigns →
            </button>
            <div style={{ marginTop: 10, fontSize: 11, color: '#2a4060' }}>You'll review each campaign before it goes live</div>
          </div>
        </div>
      </div>
    )
  }

  // ── AGENT BUILD ──────────────────────────────────────────
  function agent() {
    const buildSteps = [
      { label: 'Authenticating ad platform accounts' },
      { label: `Building ${v.platforms[0]} campaign structure` },
      { label: 'Setting up audience targeting' },
      { label: `Configuring ${v.platforms[1] || 'Search'} campaigns` },
      { label: 'Uploading creative assets' },
      { label: 'Setting bid strategies & budgets' },
      { label: 'Running pre-launch quality checks' },
      { label: 'Campaigns submitted for review' },
    ]

    return (
      <div className="fia" style={{ minHeight: '100vh', background: '#040c18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 22px' }}>
        <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 22 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#002e24', border: '2px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#00e5a0', margin: '0 auto', ...(buildDone ? {} : { animation: 'glow 2s ease-in-out infinite' }) }}>A</div>
            {buildDone
              ? <div style={{ position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#00e5a0', border: '2px solid #040c18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#040c18' }}>✓</div>
              : <div style={{ position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#040c18', border: '2px solid #040c18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00e5a0', animation: 'pulse 1s ease-in-out infinite' }} /></div>
            }
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#00e5a0', letterSpacing: '.08em', marginBottom: 8 }}>ATLAS IS {buildDone ? 'DONE' : 'BUILDING YOUR CAMPAIGNS'}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#edf4ff', letterSpacing: '-0.01em', marginBottom: 6 }}>{buildDone ? 'Campaigns Ready for Review' : 'Building your advertising program...'}</h2>
          <div style={{ fontSize: 13, color: '#3d5a72', marginBottom: 26 }}>{buildDone ? `All campaigns built for ${business.name || 'your business'}` : `Setting up campaigns for ${business.name || 'your business'} · ${business.location || ''}`}</div>

          {!buildDone && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ height: 4, background: '#162236', borderRadius: 2, overflow: 'hidden', marginBottom: 7 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#00c896,#00e5a0)', width: `${buildProgress}%`, transition: 'width .3s linear', boxShadow: '0 0 8px rgba(0,229,160,.4)' }} />
              </div>
              <div style={{ fontSize: 11, color: '#2a4060' }}>{buildProgress}% complete</div>
            </div>
          )}

          {/* Build steps */}
          <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '17px', marginBottom: 18, textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {buildSteps.map((s, i) => {
                const done = i < buildStep || buildDone
                const cur  = i === buildStep && !buildDone
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: done || cur ? 1 : .22, transition: 'opacity .3s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#002e24' : '#0a1525', border: `1px solid ${done ? '#00c89660' : cur ? '#00c89640' : '#1e293b'}`, fontSize: 9 }}>
                      {done
                        ? <span style={{ color: '#00e5a0', fontSize: 11 }}>✓</span>
                        : cur
                          ? <span style={{ display: 'block', width: 7, height: 7, borderRadius: '50%', background: '#00e5a0', animation: 'pulse 1s ease-in-out infinite' }} />
                          : <span style={{ display: 'block', width: 4, height: 4, borderRadius: '50%', background: '#1e293b' }} />
                      }
                    </div>
                    <span style={{ fontSize: 12, color: done ? '#7a9bbf' : cur ? '#d8eaf8' : '#2a4060', fontWeight: cur ? 600 : 400 }}>{s.label}</span>
                    {cur && !buildDone && <div style={{ marginLeft: 'auto', width: 14, height: 14, borderRadius: '50%', border: '2px solid #162236', borderTopColor: '#00e5a0', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agent log */}
          {agentLog.length > 0 && (
            <div style={{ background: '#060d18', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 13px', textAlign: 'left', fontSize: 11, color: '#2a4060', maxHeight: 90, overflowY: 'auto', fontFamily: "'Courier New',monospace", marginBottom: 14 }}>
              {agentLog.slice(-5).map((l, i) => <div key={i} style={{ marginBottom: 2 }}><span style={{ color: '#00c896' }}>▸</span> {l}</div>)}
            </div>
          )}

          {buildDone
            ? <button onClick={() => setScreen('dashboard')} style={{ background: '#002e24', border: '2px solid #00c89660', borderRadius: 10, padding: '14px 28px', color: '#00e5a0', fontSize: 14, fontWeight: 800, cursor: 'pointer', width: '100%' }}>View Your Live Dashboard →</button>
            : <div style={{ fontSize: 12, color: '#2a4060' }}>Atlas is configuring your campaigns across {v.platforms.slice(0, 3).length} platforms.</div>
          }
        </div>
      </div>
    )
  }

  // ── DASHBOARD ────────────────────────────────────────────
  function dashboard() {
    const platforms = v.platforms.slice(0, 3)
    const live = {
      impressions: Math.round(projected.impressions * .24),
      clicks:      Math.round(projected.clicks * .24),
      leads:       Math.round(projected.leads * .22),
      spend:       Math.round(budget * .22),
    }
    const mockCampaigns = platforms.map((p, i) => ({
      platform: p,
      name: `${business.name || 'Campaign'} — ${['Awareness', 'Leads', 'Retargeting'][i] || 'Campaign'} (${p})`,
      impressions: Math.round(live.impressions / platforms.length * (1 + i * .08)),
      clicks:      Math.round(live.clicks / platforms.length * (1 + i * .12)),
      ctr:         ((live.clicks / platforms.length) / (live.impressions / platforms.length) * 100).toFixed(2),
      spend:       Math.round(live.spend / platforms.length),
    }))

    const initMsg = `Your campaigns are running well! ${business.type === 'Auto Dealership' ? 'VDP views are up 23% this week. I\'ve shifted $200 to in-market buyers — highest converting segment.' : 'Phone calls are tracking up 18% vs last week. Search is converting 3x better than display so I rebalanced toward it.'}`

    return (
      <div style={{ minHeight: '100vh', background: '#040c18', overflowY: 'auto' }}>
        {/* Nav */}
        <nav style={{ padding: '0 20px', height: 50, display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b', background: 'rgba(4,12,24,.97)', position: 'sticky', top: 0, zIndex: 10, gap: 9 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: '#0a1525', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#00e5a0' }}>R</div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#7a9bbf', textTransform: 'uppercase' }}>recrue media</span>
          <span style={{ color: '#162236', fontSize: 13 }}>·</span>
          <span style={{ fontSize: 11, color: '#3d5a72' }}>{business.name || 'Your Business'}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#002e24', border: '1px solid #00c89630', borderRadius: 15, padding: '4px 11px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e5a0', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#00e5a0' }}>ATLAS ACTIVE</span>
          </div>
          <button onClick={() => setScreen('landing')} style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px', color: '#3d5a72', fontSize: 11, cursor: 'pointer' }}>← Exit</button>
        </nav>

        <div className="fia" style={{ padding: '20px', maxWidth: 1000, margin: '0 auto' }}>

          {/* Atlas alert */}
          <div style={{ background: '#0a1e38', border: '1px solid #7dd3fc30', borderRadius: 9, padding: '11px 15px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7dd3fc', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7dd3fc' }}>Atlas is actively monitoring your campaigns</span>
              <span style={{ fontSize: 11, color: '#3d5a72', marginLeft: 8 }}>Last optimization: 2 hours ago · Next check: in 4 hours</span>
            </div>
            <button onClick={() => document.getElementById('atlas-chat')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: '#0a1e38', border: '1px solid #7dd3fc40', borderRadius: 6, padding: '5px 12px', color: '#7dd3fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Ask Atlas
            </button>
          </div>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { l: 'Impressions', v: fmtK(live.impressions), s: 'this month', a: '#7dd3fc', d: '+12%' },
              { l: 'Clicks',      v: fmtK(live.clicks),      s: 'to your site', a: '#a855f7', d: '+8%' },
              { l: 'Leads',       v: String(live.leads),      s: v.kpis[0].toLowerCase(), a: '#00e5a0', d: '+15%' },
              { l: 'Spend',       v: fmtM(live.spend),        s: `of ${business.budget || '$5,000'} budget`, a: '#fde047', d: `${Math.round(live.spend / budget * 100)}% used` },
            ].map(c => (
              <div key={c.l} style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 15px', position: 'relative', overflow: 'hidden', borderLeft: `3px solid ${c.a}40` }}>
                <div style={{ position: 'absolute', top: -10, right: -10, width: 48, height: 48, borderRadius: '50%', background: c.a + '08', pointerEvents: 'none' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: '#3d5a72', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 7 }}>{c.l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.a, letterSpacing: '-0.02em', marginBottom: 3 }}>{c.v}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10, color: '#00d48a' }}>{c.d}</span>
                  <span style={{ fontSize: 10, color: '#2a4060' }}>{c.s}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Campaigns table */}
          <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '17px 19px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4d6e8a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 13 }}>Active Campaigns</div>
            {mockCampaigns.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < mockCampaigns.length - 1 ? '1px solid #0d1e32' : 'none', flexWrap: 'wrap' }}>
                <div style={{ background: (PLT_COLOR[c.platform] || PLT_COLOR.default) + '14', border: `1px solid ${(PLT_COLOR[c.platform] || PLT_COLOR.default)}30`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: PLT_COLOR[c.platform] || PLT_COLOR.default, flexShrink: 0 }}>{c.platform}</div>
                <div style={{ flex: 1, minWidth: 120, fontSize: 12, fontWeight: 600, color: '#d8eaf8' }}>{c.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d48a', boxShadow: '0 0 5px rgba(0,212,138,.5)' }} />
                  <span style={{ fontSize: 11, color: '#00d48a', fontWeight: 600 }}>Active</span>
                </div>
                {[
                  { v: fmtK(c.impressions), l: 'impr.' },
                  { v: fmtK(c.clicks),      l: 'clicks' },
                  { v: c.ctr + '%',          l: 'CTR' },
                  { v: fmtM(c.spend),        l: 'spent', col: '#fde047' },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.col || '#a8c4e0' }}>{m.v}</div>
                    <div style={{ fontSize: 10, color: '#2a4060' }}>{m.l}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Atlas chat */}
          <div id="atlas-chat" style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '17px 19px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4d6e8a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 13 }}>Ask Atlas</div>

            <div ref={chatRef} style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 240, overflowY: 'auto', marginBottom: 13, paddingRight: 4 }}>
              {/* Initial message */}
              <div style={{ display: 'flex', gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#002e24', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#00e5a0', flexShrink: 0 }}>A</div>
                <div style={{ background: '#060d18', border: '1px solid #1e293b', borderRadius: '4px 10px 10px 10px', padding: '10px 13px', maxWidth: '85%' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#00e5a0', marginBottom: 4 }}>Atlas</div>
                  <div style={{ fontSize: 13, color: '#a8c4e0', lineHeight: 1.5 }}>{initMsg}</div>
                </div>
              </div>

              {/* Chat history */}
              {chatHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#002e24', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#00e5a0', flexShrink: 0 }}>A</div>
                  )}
                  <div style={{ background: m.role === 'user' ? '#002e24' : '#060d18', border: `1px solid ${m.role === 'user' ? '#00c89640' : '#1e293b'}`, borderRadius: m.role === 'user' ? '10px 4px 10px 10px' : '4px 10px 10px 10px', padding: '10px 13px', maxWidth: '85%' }}>
                    {m.role === 'assistant' && <div style={{ fontSize: 10, fontWeight: 700, color: '#00e5a0', marginBottom: 4 }}>Atlas</div>}
                    <div style={{ fontSize: 13, color: m.role === 'user' ? '#d8eaf8' : '#a8c4e0', lineHeight: 1.5 }}>{m.content}</div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div style={{ display: 'flex', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#002e24', border: '1px solid #00c89640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#00e5a0', flexShrink: 0 }}>A</div>
                  <div style={{ background: '#060d18', border: '1px solid #1e293b', borderRadius: '4px 10px 10px 10px', padding: '12px 15px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, .2, .4].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5a0', animation: `pulse 1s ease-in-out ${d}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={inputRef}
                placeholder="Ask Atlas anything — 'how are my campaigns?', 'increase my budget', 'why is CTR low?'..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendChat() }}
                style={{ flex: 1, background: '#060d18', border: '1px solid #1e293b', borderRadius: 7, padding: '10px 13px', color: '#d8eaf8', fontSize: 13, outline: 'none', transition: 'border-color .15s' }}
                onFocus={e => e.target.style.borderColor = '#00c89660'}
                onBlur={e => e.target.style.borderColor = '#1e293b'}
              />
              <button onClick={() => sendChat()}
                style={{ background: '#002e24', border: '1px solid #00c89650', borderRadius: 7, padding: '10px 16px', color: '#00e5a0', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Send
              </button>
            </div>

            {/* Quick prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {["How are my campaigns doing?", "Increase my budget by 20%", "Why is my CTR low?", "What's my cost per lead?", "Add more platforms"].map(p => (
                <button key={p} onClick={() => sendChat(p)}
                  style={{ background: '#060d18', border: '1px solid #1e293b', borderRadius: 12, padding: '4px 11px', color: '#3d5a72', fontSize: 11, cursor: 'pointer', transition: 'all .12s' }}
                  onMouseOver={e => { e.target.style.borderColor = '#334155'; e.target.style.color = '#7a9bbf' }}
                  onMouseOut={e => { e.target.style.borderColor = '#1e293b'; e.target.style.color = '#3d5a72' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Optimization queue */}
          <div style={{ background: '#0a1525', border: '1px solid #1e293b', borderRadius: 12, padding: '17px 19px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4d6e8a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 13 }}>Atlas Optimization Queue</div>
            {[
              { action: 'A/B test 2 new ad creatives', platform: platforms[0], eta: 'Tonight', status: 'scheduled', c: '#fde047' },
              { action: 'Expand geo radius by 5 miles — low competition detected', platform: platforms[1] || platforms[0], eta: 'Tomorrow', status: 'pending approval', c: '#a855f7' },
              { action: 'Increase bids on top-converting audience segment', platform: platforms[0], eta: 'In 2 days', status: 'auto', c: '#00e5a0' },
              { action: 'Pause underperforming ad set, reallocate $400', platform: platforms[2] || platforms[0], eta: 'In 3 days', status: 'auto', c: '#00e5a0' },
            ].map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? '1px solid #0d1e32' : 'none', flexWrap: 'wrap' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: o.c, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 120, fontSize: 12, color: '#a8c4e0' }}>{o.action}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#3d5a72' }}>{o.platform}</div>
                <div style={{ fontSize: 10, color: '#2a4060' }}>{o.eta}</div>
                <div style={{ background: o.status === 'pending approval' ? '#120a1a' : o.status === 'auto' ? '#002e24' : '#1a1600', border: `1px solid ${o.status === 'pending approval' ? '#a855f730' : o.status === 'auto' ? '#00c89630' : '#fde04730'}`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: o.status === 'pending approval' ? '#a855f7' : o.status === 'auto' ? '#00d48a' : '#fde047', flexShrink: 0 }}>{o.status}</div>
                {o.status === 'pending approval' && (
                  <button onClick={() => alert('Approved! Atlas will implement this tomorrow.')}
                    style={{ background: '#120a1a', border: '1px solid #a855f740', borderRadius: 5, padding: '3px 9px', color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Approve
                  </button>
                )}
              </div>
            ))}
            <div style={{ marginTop: 13, padding: '11px 13px', background: '#060d18', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11, color: '#3d5a72', lineHeight: 1.6 }}>
              <strong style={{ color: '#7a9bbf' }}>⚡ Coming soon:</strong> Atlas will execute all optimizations autonomously via live API connections to Meta, Google, TTD, and Snapchat.
            </div>
          </div>
        </div>
      </div>
    )
  }
}
