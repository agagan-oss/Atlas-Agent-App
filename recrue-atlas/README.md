# recrue media — Atlas AI Agent + Client Portal

**Two apps in one repo:**
- `/` → **Atlas** — AI advertising agent for new business acquisition
- `/#portal` → **Client Portal** — dashboard for existing clients

---

## Quick Start (local dev)

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

## Deploy to GitHub Pages

### 1. Create the repo

Create a new GitHub repo (e.g. `recrue-atlas`). Push this folder:

```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/recrue-atlas.git
git push -u origin main
```

### 2. Enable GitHub Pages

Go to repo **Settings → Pages → Source** and set to **GitHub Actions**.

The `deploy.yml` workflow will build and deploy automatically on every push to `main`.

Your live URL will be: `https://YOUR_USERNAME.github.io/recrue-atlas/`

### 3. Update vite.config.js base path

If deploying to a subfolder (e.g. `yourusername.github.io/recrue-atlas`), update:

```js
// vite.config.js
export default defineConfig({
  plugins: [react()],
  base: '/recrue-atlas/',   // ← match your repo name
})
```

If using a **custom domain** (e.g. `portal.recruemedia.com`), use `base: '/'`.

### 4. Custom domain (optional)

Add a `CNAME` file in `public/`:
```
portal.recruemedia.com
```

Configure your DNS: CNAME → `YOUR_USERNAME.github.io`

---

## Client Portal Setup

### Add a client

Generate a password hash:
```bash
# macOS/Linux
echo -n "ClientPassword123!" | sha256sum

# Node.js
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('ClientPassword123!').digest('hex'))"
```

Edit `public/data/portal-clients.json`:
```json
[
  {
    "clientId":    "apex-retail",
    "displayName": "Sarah Mitchell",
    "email":       "client@example.com",
    "passwordHash": "abc123...",
    "partnerName": "Apex Retail Group"
  }
]
```

The `partnerName` must match the `mediaPartner` field in your tracker campaigns JSON exactly.

### Connect your tracker data

Update `src/ClientPortal.jsx` line 10:
```js
const DATA_BASE = "https://YOUR_USERNAME.github.io/tracker-data";
```

This should point to wherever your sanitized campaign JSON files live. See the `sync-portal-data.yml` workflow in the `client-portal` folder for how to auto-sanitize and publish tracker data.

---

## Atlas AI Agent

Atlas uses the Anthropic Claude API for the chat assistant on the dashboard.

The API is called client-side (no backend needed for GitHub Pages). In production, proxy through a backend to protect your API key.

For the demo, the chat falls back gracefully if no API key is present.

---

## File Structure

```
recrue-atlas/
├── index.html                    ← Entry point
├── vite.config.js                ← Build config
├── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml            ← Auto-deploy to GitHub Pages
├── public/
│   └── data/
│       ├── portal-clients.json   ← Client auth roster
│       ├── portal-orders.json    ← Order history (from tracker)
│       ├── portal-invoices.json  ← Invoice history
│       ├── campaigns.json        ← Sanitized campaign data (from tracker)
│       ├── ttd_campaigns.json
│       ├── dsp_campaigns.json
│       ├── google_campaigns.json
│       └── snap_campaigns.json
└── src/
    ├── main.jsx                  ← React entry
    ├── App.jsx                   ← Router (Atlas vs Portal)
    ├── AtlasAgent.jsx            ← AI agent acquisition flow
    └── ClientPortal.jsx          ← Existing client dashboard
```

---

## Roadmap (next 30 days)

| Feature | Status |
|---------|--------|
| Atlas wizard + strategy builder | ✅ Done |
| Client portal (6 tabs) | ✅ Done |
| Orders + creative upload | ✅ Done |
| Billing + invoices | ✅ Done |
| Atlas chat (Claude API) | ✅ Done |
| Meta Ads API execution | 🔜 Next |
| Google Ads API execution | 🔜 Next |
| Autonomous campaign optimization | 🔜 30 days |
| AI creative generation | 🔜 30 days |
| Multi-client white label | 🔜 Soon |

---

## Contact

Austin Gagan · agagan@recruemedia.com · recrue media
