# Wellness App — Technical Documentation

## Overview

A personal health tracking and analytics dashboard that aggregates daily wellness data (sleep, exercise, nutrition, mood, GI health, hydration) and visualizes it through interactive charts. Data flows from a manually-maintained Google Doc ("Spine Log") through a nightly Python pipeline into a Neon PostgreSQL database, then surfaces in a Next.js web app deployed on Vercel. A weekly AI-generated synthesis report is produced every Monday morning.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Pages & Routes](#pages--routes)
5. [Database Schema](#database-schema)
6. [Data Pipeline](#data-pipeline)
7. [Infrastructure: Vercel & Neon](#infrastructure-vercel--neon)
8. [Environment Variables](#environment-variables)
9. [Scheduled Jobs](#scheduled-jobs)
10. [UI Components & Charts](#ui-components--charts)
11. [Manual Logging (Log Form)](#manual-logging-log-form)
12. [AI Report Generation](#ai-report-generation)
13. [Running Locally](#running-locally)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                         │
│                                                         │
│   Google Doc         Manual Entry                       │
│  ("Spine Log")     (Log Form UI)                        │
└────────┬────────────────┬────────────────────────────────┘
         │                │
         ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Ingestion                         │
│                                                         │
│  GitHub Actions (nightly)     Next.js Server Actions    │
│  └─ pipeline/ingest.py        └─ app/log/actions.ts     │
│     ├─ Google Docs API                                  │
│     ├─ spine_parser.py                                  │
│     └─ psycopg2 → Neon                                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Neon PostgreSQL (us-east-2)               │
│                                                         │
│   entries  │  gi_events  │  exercise_sessions  │  reports│
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
┌─────────────────────┐  ┌──────────────────────────────┐
│  Weekly AI Report   │  │   Next.js App (Vercel)       │
│  GitHub Actions     │  │                              │
│  (every Monday)     │  │  / overview   /sleep         │
│  └─ gpt-4o-mini     │  │  /gut         /mind          │
│     (GitHub Models) │  │  /body        /insights      │
└─────────────────────┘  │  /log                        │
                         └──────────────────────────────┘
```

---

## Technology Stack

### Frontend & Backend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| Language | TypeScript | 5 |
| UI Library | React | 19.2.4 |
| Components | shadcn/ui (Radix UI primitives) | 4.1.2 |
| Charts | Recharts | 3.8.1 |
| Styling | Tailwind CSS | 4 |
| Icons | Lucide React | 1.7.0 |
| Markdown | react-markdown | 10.1.0 |
| Database Client | @neondatabase/serverless | 1.0.2 |
| Auth (installed, not active) | next-auth | 5.0.0-beta.30 |

### Data Pipeline (Python)
| Purpose | Library |
|---------|---------|
| Data manipulation | pandas |
| PostgreSQL client | psycopg2-binary |
| Google Docs API | google-api-python-client, google-auth-oauthlib |
| AI synthesis | openai SDK (GitHub Models endpoint) |
| Environment | python-dotenv |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting, serverless functions |
| Neon | Serverless PostgreSQL (AWS us-east-2) |
| GitHub Actions | Nightly data ingestion + weekly report generation |
| GitHub Models | Free AI inference (gpt-4o-mini) for weekly reports |
| Google Docs API | Source-of-truth data access (Spine Log) |

---

## Project Structure

```
wellness-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (sidebar + mobile nav)
│   ├── globals.css               # Tailwind + CSS variables
│   ├── page.tsx                  # Overview page (server component)
│   ├── sleep/page.tsx            # Sleep analytics (client component)
│   ├── gut/page.tsx              # GI health tracking (client component)
│   ├── mind/page.tsx             # Mood & focus (client component)
│   ├── body/page.tsx             # Exercise analytics (client component)
│   ├── insights/
│   │   ├── page.tsx              # AI weekly reports (server component)
│   │   └── ReportSelector.tsx    # Date selector for historical reports
│   ├── log/
│   │   ├── page.tsx              # Log entry page (server component)
│   │   ├── LogForm.tsx           # Log form UI (client component)
│   │   └── actions.ts            # saveLog server action + types
│   └── api/
│       ├── entries/route.ts      # GET /api/entries
│       ├── gi-events/route.ts    # GET /api/gi-events
│       ├── exercise/route.ts     # GET /api/exercise
│       └── reports/route.ts      # GET /api/reports
│
├── components/
│   ├── app-sidebar.tsx           # Desktop sidebar navigation
│   ├── nav-mobile.tsx            # Mobile bottom navigation bar
│   └── ui/                       # shadcn/ui component files
│
├── lib/
│   ├── db.ts                     # Neon SQL client singleton
│   ├── charts.ts                 # fillDateSpine, fmtDate helpers
│   └── utils.ts                  # cn() and general utilities
│
├── hooks/
│   └── use-mobile.ts             # Mobile breakpoint detection
│
├── pipeline/
│   ├── ingest.py                 # Main ingestion script
│   ├── spine_parser.py           # Google Doc parser (~900 lines)
│   ├── generate_report.py        # AI weekly synthesis
│   ├── google_auth.py            # OAuth 2.0 credential management
│   ├── refresh_token.py          # Token refresh utility
│   ├── migrate.sql               # Database migrations
│   ├── requirements.txt          # Python dependencies
│   └── prompts/
│       └── wellness_analysis.md  # System prompt for AI reports
│
├── .github/workflows/
│   ├── ingest.yml                # Nightly ingestion cron
│   └── report.yml                # Weekly report cron
│
├── DOCS.md                       # This file
├── next.config.ts
├── tsconfig.json
├── components.json               # shadcn/ui config
└── package.json
```

---

## Pages & Routes

### Web Pages

| Route | Rendering | Description |
|-------|-----------|-------------|
| `/` | Server | Overview dashboard — 7-day and 30-day summary cards for Sleep, HRV, Mood, Bristol, BMs, Water; latest weekly synthesis excerpt; quick links to detail sections |
| `/sleep` | Client | Sleep duration trend, HRV, sleep stage breakdown (Deep/Core/REM/Awake); rolling 7-day mean; correlation analysis |
| `/gut` | Client | Bristol stool scale distribution, BM frequency, urgency patterns, weekly GI rollups |
| `/mind` | Client | Mood (1–5) and focus (1–5) trends; Pearson correlation with sleep, HRV, and other metrics |
| `/body` | Client | Exercise sessions by activity type; running pace and distance charts; weekly volume aggregation |
| `/insights` | Server | AI-generated weekly synthesis reports; date selector for last 12 weeks |
| `/log` | Server + Client | Daily log entry form — pre-fills today's data from NeonDB, supports incremental water/coffee adds, MM:SS duration input, food notes, GI events, exercise sessions |

### API Routes

All are read-only GET endpoints with no authentication guards.

| Endpoint | Query Params | Returns |
|----------|-------------|---------|
| `GET /api/entries` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Array of entry rows |
| `GET /api/gi-events` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Array of GI event rows |
| `GET /api/exercise` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Array of exercise session rows |
| `GET /api/reports` | `?date=YYYY-MM-DD` (optional) | Latest report + history list, or specific report by date |

Client-side chart pages (sleep, gut, mind, body) fetch from these API routes with dynamic date ranges. Chart data is filled to create continuous timelines using `fillDateSpine()` so gaps appear as broken lines rather than connected points.

---

## Database Schema

Hosted on **Neon PostgreSQL** in `us-east-2`. Accessed from Next.js via `@neondatabase/serverless` and from the Python pipeline via `psycopg2`.

### `entries`
One row per calendar date. The primary table for all daily metrics.

| Column | Type | Description |
|--------|------|-------------|
| `date` | DATE (PK) | Calendar date (unique) |
| `sleep_duration` | NUMERIC | Hours of sleep (e.g., 7.4) |
| `bed_time` | TIMESTAMP | Bedtime (previous evening) |
| `wake_time` | TIMESTAMP | Wake time |
| `hrv` | INT | Heart rate variability (ms) |
| `deep_min` | NUMERIC | Minutes in deep sleep |
| `core_min` | NUMERIC | Minutes in core sleep |
| `rem_min` | NUMERIC | Minutes in REM sleep |
| `awake_min` | NUMERIC | Minutes awake during sleep window |
| `deep_pct` | NUMERIC | Fraction of sleep in deep stage |
| `core_pct` | NUMERIC | Fraction in core |
| `rem_pct` | NUMERIC | Fraction in REM |
| `mood` | INT | Mood rating (1–5) |
| `focus` | INT | Focus rating (1–5) |
| `water_oz` | NUMERIC | Water intake (oz) |
| `coffee_count` | NUMERIC | Coffee consumed (fractional cups) |
| `alcohol_count` | NUMERIC | Alcoholic drinks |
| `alcohol_desc` | TEXT | Description (e.g., "2 beers") |
| `breakfast_notes` | TEXT | Food notes |
| `lunch_notes` | TEXT | |
| `dinner_notes` | TEXT | |
| `snack_notes` | TEXT | |
| `general_notes` | TEXT | |
| `bm_count` | INT | Bowel movements (aggregated from `gi_events`) |
| `avg_bristol` | NUMERIC | Average Bristol scale score |
| `max_urgency` | INT | Highest urgency (1=low, 2=moderate, 3=high) |
| `total_exercise_min` | NUMERIC | Total exercise time in minutes (fractional) |
| `did_exercise` | BOOLEAN | Whether any exercise was logged |
| `rest_day` | BOOLEAN | Flagged as a rest day |

### `gi_events`
One row per bowel movement event.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL (PK) | |
| `date` | DATE | FK to entries date |
| `event_time` | TIME | Time of event |
| `bristol` | INT | Bristol stool scale (1–7) |
| `urgency` | INT | 1=low, 2=moderate, 3=high |

### `exercise_sessions`
One row per exercise block within a day.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL (PK) | |
| `date` | DATE | FK to entries date |
| `activity_type` | TEXT | Run, Walk, Strength, Cycling, Yoga, Swimming, Movement, Other |
| `activity_raw` | TEXT | Original parsed text |
| `duration_min` | NUMERIC | Duration in decimal minutes (e.g., 23:09 → 23.15) |
| `hr_avg` | INT | Average heart rate |
| `cadence_spm` | INT | Steps per minute (running) |
| `effort` | INT | Effort level (1–5) |
| `distance_mi` | NUMERIC | Distance in miles |
| `notes` | TEXT | Free-form notes |

### `exercise_sets`
Optional detail rows for strength training sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL (PK) | |
| `exercise_session_id` | INT (FK) | References `exercise_sessions.id` |
| `exercise_name` | TEXT | e.g., "Bench Press" |
| `sets` | INT | |
| `reps` | INT | |
| `weight_lbs` | NUMERIC | |
| `notes` | TEXT | |

### `reports`
AI-generated weekly syntheses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL (PK) | |
| `report_date` | DATE | Date the report was generated (Monday) |
| `period_start` | DATE | Start of analyzed week |
| `period_end` | DATE | End of analyzed week |
| `content` | TEXT | Full markdown synthesis |
| `generated_at` | TIMESTAMP | Generation timestamp |

### Upsert Strategy
The `saveLog` server action uses `INSERT ... ON CONFLICT (date) DO UPDATE SET` with `COALESCE(EXCLUDED.field, entries.field)` for all user-entered fields. This means a null submitted from an empty form field never overwrites an existing value — protecting data from partial saves or timezone-related empty loads. Computed aggregate fields (`bm_count`, `did_exercise`, etc.) always use `EXCLUDED` since they're freshly derived each save.

---

## Data Pipeline

### Spine Log Format

The source of truth is a Google Doc maintained manually. Each entry follows a structured format:

```
═══════════════════════════════════════════
SPINE ENTRY | 2026-04-19 | Saturday | EDT
═══════════════════════════════════════════

FOOD & BEVERAGE
─────────────────────────────
Breakfast: Eggs, toast
Lunch: Salad, chicken
Water: 92 oz
Coffee (estimated): 1.5
Alcohol: 2 — Martini, Wine

SLEEP  (prior night)
─────────────────────────────
Bed: 11:23pm → Wake: 6:47am
Duration: 7.4 hrs | Apple Watch
Deep: 64 min | Core: 226 min | REM: 150 min | Awake: 11 min
HRV: 31 ms

GI
─────────────────────────────
07:05: Bristol 5 | urgency: low

EXERCISE
─────────────────────────────
Run: 6.2 mi, 45:32, avg HR 162
Strength: 45 min

MOOD & FOCUS
─────────────────────────────
Mood: 4/5
Focus: 3/5
```

Missing fields return `None` in parsing — never defaulted to zero.

### Ingestion Flow (`pipeline/ingest.py`)

Runs nightly via GitHub Actions (8am UTC):

1. **Auth** — `google_auth.py` reads `TOKEN_JSON` env var (CI) or `token.json` (local) to build Google OAuth credentials
2. **Fetch** — `spine_parser.py` calls Google Docs API to retrieve full document text
3. **Parse** — `_split_entries()` splits by `SPINE ENTRY` headers; section parsers extract each data type using regex patterns
4. **Aggregate** — GI events and exercise sessions are grouped by date; `bm_count`, `avg_bristol`, `total_exercise_min`, `did_exercise` are computed
5. **Upsert** — Parameterized SQL via `psycopg2.extras.execute_values()` inserts or updates entries, then deletes + re-inserts child rows (gi_events, exercise_sessions) for affected dates
6. **Idempotent** — Re-running on the same day safely updates changed values

### Parser Details (`pipeline/spine_parser.py`)

~900 lines of regex-based parsing handling:
- Multiple date/time formats (12h, 24h, HHMM)
- Optional fields (skips gracefully when sections are missing)
- Food notes with parenthetical time annotations
- Coffee cup fractions ("half a cup", "2 cups", bare "cup")
- Exercise duration in multiple formats (HH:MM:SS, MM:SS, plain minutes)
- Water in oz or other units
- Bristol scale with both numeric and text forms

---

## Infrastructure: Vercel & Neon

### Vercel

The Next.js app is deployed on Vercel with automatic deployments on pushes to `main`. No `vercel.json` — Vercel auto-detects Next.js and applies optimal defaults.

Key characteristics:
- **Rendering mix**: Server Components for data-heavy pages (overview, log, insights); Client Components for interactive chart pages that fetch from API routes
- **Server Actions**: Used for the log form save (`saveLog`) — eliminates a manual API route for mutations
- **`force-dynamic`**: Applied to the log page to ensure fresh data on every request
- **Timezone handling**: The log page accepts a `?date=YYYY-MM-DD` search param so the client's local date overrides the server's UTC `CURRENT_DATE`. On first load, `LogForm` redirects to `?date=localDate` using `router.replace`.

### Neon

Neon provides serverless PostgreSQL on AWS in `us-east-2`. Key properties:

- **Connection**: `@neondatabase/serverless` uses HTTP-based queries (no persistent TCP connection) — optimal for Vercel's serverless function environment where traditional connection pooling would exhaust DB connections
- **Pooler URL**: The `DATABASE_URL` points to Neon's connection pooler endpoint (note `-pooler` in the hostname)
- **CURRENT_DATE**: Evaluated in UTC by NeonDB — the app compensates for this by passing the client's local date in query params
- **Migrations**: Applied manually via `psql $DATABASE_URL -f pipeline/migrate.sql`. The migration file is additive and idempotent (`IF NOT EXISTS`, `TYPE NUMERIC` widening)

---

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Next.js app, Python pipeline | Neon PostgreSQL connection string (pooler URL) |
| `TOKEN_JSON` | GitHub Actions (`ingest.py`) | Google OAuth token as JSON string (set in GitHub repo secrets) |
| `GITHUB_TOKEN` | GitHub Actions (`generate_report.py`) | Auto-supplied by Actions for GitHub Models API access |

For local development, create `.env.local`:
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require&channel_binding=require
```

For the Python pipeline locally, `TOKEN_JSON` can be omitted if `token.json` exists in `pipeline/`.

---

## Scheduled Jobs

Both jobs run via GitHub Actions with `workflow_dispatch` for manual triggers.

### Nightly Ingestion (`ingest.yml`)

**Schedule:** `0 8 * * *` — 8am UTC (~3–4am Eastern)

```
Steps:
  1. Checkout repo
  2. Setup Python 3.12
  3. pip install -r pipeline/requirements.txt
  4. cd pipeline && python ingest.py
Secrets: DATABASE_URL, TOKEN_JSON
```

### Weekly AI Report (`report.yml`)

**Schedule:** `0 6 * * 1` — 6am UTC every Monday (~1–2am Eastern)

```
Steps:
  1. Checkout repo
  2. Setup Python 3.12
  3. pip install -r pipeline/requirements.txt
  4. cd pipeline && python generate_report.py
Secrets: DATABASE_URL
Tokens: GITHUB_TOKEN (auto-supplied)
```

Skips gracefully if fewer than 4 entries were logged in the prior week.

---

## UI Components & Charts

### Navigation

- **Desktop**: `AppSidebar` — fixed left sidebar with 7 links (Overview, Sleep, Gut, Mind, Body, Insights, Log)
- **Mobile**: `NavMobile` — bottom navigation bar with 6 links (Insights excluded); uses `use-mobile.ts` hook for breakpoint detection

### Component Library

shadcn/ui with Radix UI primitives provides the component foundation:
- `Card` — Data display containers
- `Input` — Form fields (water, coffee, exercise stats)
- `Select` — Date range and report selectors
- `Button` — Actions
- `Sidebar` — Desktop navigation shell
- `Tooltip` — Hover hints on chart data points

### Charts (Recharts)

All chart pages are Client Components that fetch data from `/api/*` routes on mount:

- **LineChart** — Sleep duration, HRV, mood/focus trends with 7-day rolling mean overlay
- **BarChart** — Weekly exercise volume, GI frequency
- **ComposedChart** — Sleep stages (stacked bars + line), combined metrics
- **ScatterChart** — Correlation plots (e.g., HRV vs. mood)

Data gaps (missing dates) are handled by `fillDateSpine()` in `lib/charts.ts`, which inserts null entries to produce broken lines instead of misleadingly connecting across gaps.

Colors on the body page are inspired by the Hansons Marathon Method training zones.

---

## Manual Logging (Log Form)

The `/log` page provides a form for entering or updating today's wellness data without editing the Google Doc. Data entered here coexists with pipeline-ingested data — the upsert merges both sources.

### Key behaviors

**Water & Coffee (incremental)**
- Displays current logged amount ("64 oz today") as read-only
- Accepts an "add" amount in the input field
- On save: `current + added` is written to NeonDB; display updates and field clears
- Supports decimal values (0.5 cups, 16.5 oz)

**Exercise duration (time format)**
- Accepts plain minutes (`45`), MM:SS (`23:09`), or H:MM:SS (`1:19:29`)
- `parseDuration()` converts to decimal minutes for storage
- Raw typed value preserved in display state so typing isn't interrupted mid-entry

**Partial save protection**
- The `ON CONFLICT DO UPDATE` uses `COALESCE(EXCLUDED.field, entries.field)` for all user-entered fields
- A null from an empty form field never overwrites existing data in the DB
- Safe to save only water without touching sleep or food data

**Timezone handling**
- On first load, `LogForm` redirects to `?date=YYYY-MM-DD` using the browser's local date
- `page.tsx` passes this date to NeonDB queries, bypassing the UTC `CURRENT_DATE` mismatch

### Form fields

| Section | Fields |
|---------|--------|
| Date | Date picker |
| Sleep | Paste from Apple Watch, or: bed time, wake time, duration, HRV, Deep/Core/REM/Awake minutes |
| Mood & Focus | 1–5 rating selectors |
| Intake | Water (oz add), Coffee (cups add), Alcohol (count + description) |
| Food | Breakfast, lunch, dinner, snack, general notes |
| GI | Add/remove events: time, Bristol scale (1–7), urgency |
| Exercise | Add/remove sessions: type, duration, HR, effort, distance, notes |
| Rest day | Toggle |

---

## AI Report Generation

Every Monday, `generate_report.py` produces a narrative weekly synthesis.

### Process

1. Fetches prior 7-day entries from NeonDB
2. Fetches 30-day baseline averages for context
3. Formats data as a structured markdown block
4. Sends to GitHub Models (`gpt-4o-mini`) with the system prompt in `prompts/wellness_analysis.md`
5. Saves the response to the `reports` table

### System prompt (`wellness_analysis.md`)

Defines the AI's analytical framework: what to look for in the data, how to contextualize metrics against the baseline, output format expectations (markdown, specific sections), and tone.

### Display

The `/insights` page renders the latest report with `react-markdown`. A `ReportSelector` component allows navigating through the last 12 weeks of reports.

---

## Running Locally

### Next.js app

```bash
npm install
# Create .env.local with DATABASE_URL
npm run dev
```

### Python pipeline

```bash
cd pipeline
pip install -r requirements.txt

# First-time Google auth (generates token.json)
python google_auth.py

# Run ingestion
python ingest.py

# Run report generation (requires GITHUB_TOKEN env var)
python generate_report.py
```

### Database migrations

```bash
# Export DATABASE_URL from .env.local first
export $(grep DATABASE_URL .env.local | xargs)
psql $DATABASE_URL -f pipeline/migrate.sql
```

---

## Design Decisions & Notes

- **No auth**: The app is personal and privately deployed; no authentication is active. `next-auth` is installed for future use.
- **No ORM**: Raw SQL via `@neondatabase/serverless` tagged templates — keeps queries explicit and avoids ORM overhead for a single-user app.
- **Pipeline vs. form**: The nightly pipeline is the primary data source; the log form provides real-time corrections and additions without requiring a Google Doc edit.
- **COALESCE upsert**: Chosen over "fetch-then-merge" for simplicity — null submissions are safe, though it means fields can't be explicitly cleared by emptying them in the form (a known trade-off).
- **Timezone**: NeonDB uses UTC; the client resolves local date and passes it as a URL param to ensure the correct day's data loads regardless of time of day.
- **GitHub Models**: Free AI inference tier used for weekly reports, avoiding OpenAI API costs for a personal app.
