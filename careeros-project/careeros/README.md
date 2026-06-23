# ⚡ CareerOS

> Personal Career Operating System — Niyamul · RUET EEE · Embedded AI Engineer path

---

## Quick Start

### Prerequisites
- Node.js 18+ → https://nodejs.org
- npm 9+ (comes with Node)

### 1. Install dependencies
```bash
npm install
```

### 2. Add your CareerOS file
Place your `CareerOS.tsx` inside the `src/` folder:
```
src/CareerOS.tsx   ← your file goes here
```

### 3. Run dev server
```bash
npm run dev
```
Opens at → http://localhost:5173

---

## Folder Structure

```
careeros/
├── public/
│   └── favicon.svg
├── src/
│   ├── CareerOS.tsx        ← YOUR FILE (place here)
│   ├── App.tsx             ← imports CareerOS
│   ├── main.tsx            ← React root
│   └── index.css           ← Tailwind + global styles
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── tsconfig.node.json
```

---

## npm Scripts

| Command | Action |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |

---

## Deploy to Netlify

1. Run `npm run build`
2. Drag the `dist/` folder to https://app.netlify.com/drop
   — or connect your GitHub repo in Netlify dashboard

Build settings if using Netlify CI:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

## Firebase / Environment

This project expects Firebase config values via Vite env variables. Create a local env file `.env.local` (already ignored) with the following keys:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

An example file is provided as `.env.example` — copy it to `.env.local` and fill in your values before running or deploying.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Fonts | Space Grotesk + JetBrains Mono |
| State | React useState + localStorage |
| Deploy | Netlify |

---

## CareerOS.tsx — If you see TypeScript errors

Your `.tsx` file uses `.jsx` syntax (no explicit types). TypeScript is set to non-strict mode for unused vars/params, so most things will compile. If you see errors:

**Option A — Quick fix:** Rename the file to `CareerOS.jsx` and update `App.tsx`:
```tsx
import CareerOS from './CareerOS'   // works for both .tsx and .jsx
```

**Option B — Add to tsconfig.json** to fully silence remaining type issues:
```json
"noImplicitAny": false
```
