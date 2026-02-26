# Techxpert Data AI — Frontend V2

> Enterprise-grade React/Next.js interface for the Techxpert NL2SQL engine.

A seamless, zero-lag conversational UI for internal teams querying Corporate and PPM tickets. Features dynamic state tracking, on-the-fly visualizations, and a modern chat-based dashboard.

---

## Key Features

- **Visual Stateful Memory (Context Chips)** — Reads the active JSON state from the backend and renders dynamic filter chips showing Domain, Company, and Timeframe. Users can clear individual filters with a single click.
- **On-Demand Visualizations** — Toggle between a raw data table and a responsive Bar Chart instantly without triggering an additional API call.
- **Zero-Lag Typing Engine** — The input field is isolated into its own sub-component, preventing re-renders of large data tables on every keystroke.
- **Enterprise UX/UI** — Tailwind CSS + Lucide Icons. Includes hover-to-copy, smooth auto-scroll, and a persistent data accuracy disclaimer.
- **Integrated Onboarding** — Native "How to Use" modal educating staff on available domains (PPM vs. Corporate) and best prompting practices.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router), React 18+ |
| Styling | Tailwind CSS |
| Visualization | Recharts |
| Icons | Lucide React |
| HTTP Client | Native Fetch API |

---

## Project Structure
```
ai-analytics-frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main dashboard, context chips, input component
│   │   ├── layout.tsx        # Next.js root layout
│   │   └── globals.css       # Global styles and Tailwind directives
│   ├── components/
│   │   └── ui/
│   │       └── table.tsx     # Reusable accessible table component
├── public/
├── package.json
├── postcss.config.js
└── tailwind.config.ts
```

---

## Installation
```bash
git clone <repository-url>
cd ai-analytics-frontend
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> If no `.env.local` is present, the app defaults to `http://localhost:8000/api/v1/query`.

### Run
```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Data Flow
```
User Input
    ↓
ChatInput component sends query + active searchState (JSON)
    ↓
POST /api/v1/query → Backend
    ↓
Response: updated state + summary text + raw_data
    ↓
UI updates Filter Chips → renders AI message → paints Table or Bar Chart
```

---

## Roadmap (V3)

- [ ] **Data Export** — Download table results directly to CSV or Excel
- [ ] **Dynamic Charting** — Auto-detect data shapes to render Pie, Line, or Doughnut charts
- [ ] **Authentication/SSO** — Microsoft Entra ID or Google Workspace integration
