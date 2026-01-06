# Budget - Personal Finance Tracker

> **TL;DR:** Track your money, import bank statements, auto-categorize transactions, set budgets, sync between devices. All local, no server needed.

---

## Quick Start

```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

---

## What This App Does

| Feature | What it means |
|---------|---------------|
| **Import Statements** | Drag & drop Excel/CSV from your bank |
| **Auto-Categorize** | ~95% of transactions tagged automatically |
| **Budgets** | Set monthly limits per category |
| **Rules** | Create custom patterns to auto-tag stuff |
| **P2P Sync** | Share data between devices (no server!) |
| **Offline First** | Works without internet, data stays on your device |

---

## Folder Map

```
app/                    <- Pages (Next.js App Router)
├── page.tsx           <- Dashboard (home)
├── transactions/      <- Transaction list
├── budgets/           <- Budget management
├── rules/             <- Custom categorization rules
└── sync/              <- Device sync page

components/             <- UI pieces
├── ui/                <- Base components (buttons, dialogs, etc)
├── dashboard/         <- Dashboard-specific views
├── motion/            <- Animation wrappers
└── *.tsx              <- Feature components

lib/                    <- Brain of the app
├── db/                <- Database stuff
│   ├── schema.ts      <- Data types & tables
│   ├── operations.ts  <- CRUD (create, read, update, delete)
│   └── business.ts    <- Smart logic (duplicates, summaries)
├── hooks/db/          <- React hooks for data
│   ├── use-transactions.ts
│   ├── use-categories.ts
│   └── use-budgets.ts
├── p2p/               <- Peer-to-peer sync magic
│   ├── peer-manager.ts
│   └── sync-protocol.ts
├── excel/             <- Bank statement parsing
└── ai/                <- LLM for unknown merchants
```

---

## Tech Stack (the important stuff)

| Layer | Tech |
|-------|------|
| **Framework** | Next.js 16 + React 19 |
| **Styling** | Tailwind CSS 4 |
| **Components** | Radix UI (headless) |
| **Animations** | Framer Motion |
| **Database** | Dexie (IndexedDB wrapper) |
| **P2P** | PeerJS (WebRTC) |
| **Icons** | Lucide React |

---

## How Data Flows

```
Bank Statement (Excel)
        ↓
    Parser (lib/excel/)
        ↓
    Dexie DB (IndexedDB in browser)
        ↓
    React Hooks (lib/hooks/db/)
        ↓
    UI Components
```

---

## How Auto-Categorization Works

```
Transaction comes in
        ↓
1. Check built-in patterns (lib/db/business.ts)
   → "NETFLIX" → Entertainment ✓
        ↓
2. Check user rules (lib/db/operations.ts)
   → Custom patterns you created ✓
        ↓
3. Ask LLM (lib/ai/web-llm.ts)
   → Llama 3.2 runs IN YOUR BROWSER ✓
        ↓
4. Default to "Other"
```

---

## How P2P Sync Works

```
Device A (Host)              Device B (Client)
     |                            |
     |--- Creates room code ----->|
     |                            |
     |<---- Joins with code ------|
     |                            |
     |<==== WebRTC tunnel =======>|
     |                            |
     |---- Sends all data ------->|
     |<--- Merges & confirms -----|
     |                            |
   Done                         Done
```

No server stores your data. Ever.

---

## Key Files You'll Touch Often

| Task | File |
|------|------|
| Add a new page | `app/[name]/page.tsx` |
| Change how transactions look | `components/transaction-*.tsx` |
| Add a database field | `lib/db/schema.ts` |
| New DB query hook | `lib/hooks/db/use-*.ts` |
| Modify categorization logic | `lib/db/business.ts` |
| Change animations | `lib/motion.ts` |
| Add UI sounds | `lib/sounds.ts` |

---

## Database Tables

| Table | What's in it |
|-------|-------------|
| `categories` | Spending categories (Food, Transport, etc) |
| `transactions` | All your transactions |
| `budgets` | Monthly limits per category |
| `rules` | Your custom auto-tag patterns |
| `syncState` | Device ID, last sync time |

Schema lives in: `lib/db/schema.ts`

---

## Common Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm lint         # Check for code issues
```

---

## Patterns Used

- **Local-first**: All data in IndexedDB, no backend
- **Optimistic updates**: UI updates immediately, rolls back on error
- **Responsive modals**: Dialog on desktop, drawer on mobile
- **Hooks for everything**: Data fetching via custom hooks

---

## Where Things Live

| Looking for... | Go to... |
|----------------|----------|
| Page routes | `app/` |
| Reusable UI | `components/ui/` |
| Business logic | `lib/db/` |
| Data hooks | `lib/hooks/db/` |
| P2P sync code | `lib/p2p/` |
| Excel parsing | `lib/excel/` |
| Type definitions | `lib/db/schema.ts` |

---

## PWA Stuff

- Manifest: `public/manifest.json`
- Service Worker: `public/sw.js`
- Install hook: `lib/hooks/use-pwa.ts`

The app is installable on mobile/desktop.

---

## Need Help?

1. **Understand a feature** → Read the hook in `lib/hooks/db/`
2. **Understand the data** → Check `lib/db/schema.ts`
3. **Understand the UI** → Start from the page in `app/`
4. **Debug sync issues** → Check `lib/p2p/peer-manager.ts`

---

Built with Next.js. Deployed on Vercel.
