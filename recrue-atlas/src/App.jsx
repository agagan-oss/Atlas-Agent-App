import React, { useState } from 'react'
import AtlasAgent from './AtlasAgent.jsx'
import ClientPortal from './ClientPortal.jsx'

// ─────────────────────────────────────────────────────────
// ROOT ROUTER
// Two entry points:
//   /          → Atlas AI Agent (new business acquisition)
//   /portal    → Client Portal  (existing client dashboard)
//
// In production, set up proper routing with react-router-dom.
// For GitHub Pages, this hash-based approach works with no config.
// ─────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState(() => {
    // Check URL hash for portal entry
    return window.location.hash === '#portal' ? 'portal' : 'atlas'
  })

  function goPortal() {
    window.location.hash = 'portal'
    setView('portal')
  }
  function goAtlas() {
    window.location.hash = ''
    setView('atlas')
  }

  if (view === 'portal') return <ClientPortal onExit={goAtlas} />
  return <AtlasAgent onGoPortal={goPortal} />
}
