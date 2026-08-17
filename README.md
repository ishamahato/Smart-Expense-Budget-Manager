# Smart Expense & Budget Manager

A full-stack personal finance platform for recording expenses, managing monthly
budgets, analysing spending through MongoDB aggregation pipelines, automating
recurring bills, and asking questions about your money in plain English.

Built with **React + Vite**, **Node.js + Express**, **MongoDB + Mongoose**, **JWT
auth**, **Recharts**, and the **Google Gemini API**.

### ▶️ [Watch the demo video](https://drive.google.com/file/d/1kpnuxSu-mHBPULVLQyp_0d1oJl08ElGy/view?usp=sharing)

A walkthrough of the dashboard, natural-language expense entry, budget alerts,
MongoDB-powered analytics, recurring bills and the Gemini assistant.

**Try it locally** — [installation](#installation) takes about two minutes:

```
Email:    demo@expense.app
Password: Demo@1234
```

The demo account is seeded with ~300 generated transactions across six months, so
every chart, budget alert and trend is populated from the moment you log in.

---

## Table of contents

- [Demo](#demo)
- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database design](#database-design)
- [MongoDB aggregation](#mongodb-aggregation)
- [Gemini AI integration](#gemini-ai-integration)
- [API endpoints](#api-endpoints)
- [Environment variables](#environment-variables)
- [Installation](#installation)
- [Running the app](#running-the-app)
- [Sample data](#sample-data)
- [Testing](#testing)
- [Security](#security)
- [Project structure](#project-structure)
- [Screenshots](#screenshots)
- [Future improvements](#future-improvements)

---

## Demo

**[▶️ Full video walkthrough](https://drive.google.com/file/d/1kpnuxSu-mHBPULVLQyp_0d1oJl08ElGy/view?usp=sharing)**

What the video covers:

| # | Feature | What it shows |
|---|---|---|
| 1 | Authentication | JWT login, protected routes, per-user data isolation |
| 2 | Dashboard | Live KPIs, budget alerts, six-month trend, category donut |
| 3 | Natural-language entry | *"paid 450 to dominos yesterday"* → structured draft → confirm → saved |
| 4 | Expenses | Search, category and amount filters, sorting, inline edit |
| 5 | Budgets | Progress bars, 80% / 100% alerts, AI-suggested allocation applied in one click |
| 6 | Analytics | Aggregation-backed trends, category ranking, month-over-month comparison |
| 7 | Recurring | Weekly / monthly / yearly schedules with monthly-equivalent costs |
| 8 | AI assistant | Multi-turn questions answered from the user's own data only |
| 9 | Theming | Light / dark mode and the responsive mobile layout |

---

## Overview

Most expense trackers stop at CRUD. This one is built the way a production
personal-finance product would be:

- **Analytics run in the database, not in JavaScript.** Totals, category splits,
  daily series, month-over-month comparisons and merchant rankings are all
  computed with MongoDB aggregation pipelines — one `$facet` round trip backs the
  entire dashboard.
- **Budget alerts are derived, never stored.** Warnings at 80% and 100% are
  computed from live spending on every read, so they can't drift out of sync with
  the underlying expenses.
- **Recurring bills post themselves.** A daily `node-cron` sweep materialises due
  templates into real expenses, catching up automatically after downtime.
- **The AI assistant is scoped to one user.** The model receives a snapshot built
  from aggregations already filtered by the caller's id. It has no database
  handle and no tool access, so it cannot reach another account's data even if a
  prompt tries to talk it into it.
- **It works without an API key.** Every AI feature degrades to a deterministic
  local rules engine, so the app is fully usable — and demoable — with no Gemini
  key configured.

---

## Features

### Authentication
- Register, log in, log out
- JWT (7-day expiry), bcrypt password hashing (12 rounds)
- Protected API routes and protected client routes
- Strict per-user data isolation on every query
- Password change re-issues the token so the old one stops working

### Expenses
- Full create / read / update / delete
- Search across merchant, notes and tags
- Filter by category, payment method, date range and amount range
- Sort by date, amount or merchant
- Server-side pagination, with a running total across the whole filtered set
- Natural-language entry: *"paid 450 to dominos yesterday"* → a draft you confirm

### Categories
- Nine defaults seeded per account (Food, Transport, Shopping, Bills, Housing,
  Entertainment, Healthcare, Education, Other)
- Custom categories with colour and icon pickers
- Deleting a category reassigns its expenses to "Other" — history is never lost
- The system "Other" category is protected from deletion

### Budgets
- Per-category and overall monthly limits
- Amount, spent, remaining, and percentage used for each
- Colour-coded progress bars: on track → near limit → over budget
- Alerts at **80%** (configurable per user, 50–100%) and again at **100%**
- Spending in unbudgeted categories is surfaced separately
- Bulk-apply an AI-suggested budget in one call

### Dashboard
- Total spent this month, spent today, budget remaining, top category
- Six-month spending trend (area chart)
- Category split (donut) and daily spending (bar chart)
- Budget progress bars, recent transactions, most-used merchants
- Recurring payments awaiting confirmation

### Analytics
- Monthly trend over 3 / 6 / 12 months
- Category split, category ranking, and a detailed category table
- Daily spending and cumulative burn-down
- This month vs last month, overall and per category
- Top merchants and payment-method mix

### Recurring expenses
- Weekly, monthly and yearly frequencies
- Automatic posting on the due date, or manual confirm-first mode
- Monthly-equivalent cost so weekly and yearly items are comparable
- Pause / resume / skip / record-now controls
- Deleting a schedule keeps the expenses it already produced

### AI assistant
- Ask questions about your own spending in plain English
- Concise summaries: totals, major categories, unusual spending, budget status
- "Suggest a ₹15,000 budget" → a category-wise allocation you can apply
- Multi-turn conversation with context

### Interface
- Responsive from 375px to desktop
- Sidebar navigation with a mobile slide-over drawer
- Light and dark themes, following the OS by default
- Loading skeletons, empty states, error states with retry
- Toast notifications and promise-based confirmation dialogs
- Accessible modals with focus trapping and Escape-to-close

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, React Router 6 |
| Styling | Tailwind CSS 3 (CSS-variable design tokens, class-based dark mode) |
| Charts | Recharts 2 |
| HTTP | Axios, with request/response interceptors |
| Backend | Node.js 18+, Express 4 |
| Database | MongoDB 6+, Mongoose 8 |
| Auth | jsonwebtoken, bcryptjs |
| Validation | Zod |
| AI | Google Gemini REST API (`gemini-2.5-flash` by default) |
| Scheduling | node-cron |
| Security | helmet, cors, express-rate-limit, express-mongo-sanitize |
| Testing | Node's built-in test runner (`node:test`) |

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser — React SPA (Vite)                                │
│                                                            │
│  pages/ ── layouts/ ── components/ ── charts/              │
│      │                                                     │
│  context/  AuthContext · ToastContext · ConfirmContext      │
│            ThemeContext                                    │
│      │                                                     │
│  services/api.js  — Axios instance                         │
│      • attaches the Bearer token to every request          │
│      • normalises errors into { message, status, fields }  │
│      • signs the user out on a 401                         │
└───────────────────────────┬────────────────────────────────┘
                            │  JSON over HTTP
                            │  (Vite proxies /api in dev)
┌───────────────────────────▼────────────────────────────────┐
│  Express API                                               │
│                                                            │
│  helmet → cors → json → mongo-sanitize → rate limit        │
│      │                                                     │
│  routes/ ──► middleware/auth (verify JWT, load user)       │
│      │       middleware/validate (Zod, per route)          │
│      ▼                                                     │
│  controllers/ ──► services/ ──► models/ (Mongoose)         │
│                     │                                      │
│                     ├── analytics.service  (aggregations)  │
│                     ├── budget.service     (alerts)        │
│                     ├── recurring.service  (cron sweep)    │
│                     ├── ai.service         (context build) │
│                     └── gemini.service     (REST client)   │
│      │                                                     │
│  middleware/errorHandler — single JSON error envelope      │
└───────────────────────────┬────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐     ┌────────────────┐
                  │     MongoDB       │     │  Gemini API    │
                  │  users, expenses, │     │  (key stays    │
                  │  categories,      │     │   server-side) │
                  │  budgets,         │     └────────────────┘
                  │  recurringexpenses│
                  └───────────────────┘
```

### Request flow

1. Axios attaches `Authorization: Bearer <token>`.
2. `protect` verifies the JWT and loads the user **from the database on every
   request**, so a deleted account loses access immediately rather than when its
   token happens to expire.
3. `validate(schema)` parses the body/query/params with Zod and **replaces** them
   with the parsed result, so controllers only ever see coerced, whitelisted
   values.
4. The controller queries with `userId: req.user._id` in the filter. That clause
   is never built from client input — it is the data-isolation boundary.
5. Errors reach one handler that maps Mongoose validation, cast, and duplicate-key
   errors onto a stable JSON envelope. Unexpected errors are logged in full and
   reported to the client as a generic 500.

---

## Database design

### User
| Field | Type | Notes |
|---|---|---|
| `name` | String | 2–80 chars |
| `email` | String | unique, lowercased, indexed |
| `password` | String | bcrypt hash, `select: false` |
| `currency` | String | INR, USD, EUR, GBP, … |
| `monthlyIncome` | Number | optional |
| `preferences.alertThreshold` | Number | 50–100, default 80 |
| `preferences.theme` | String | light / dark / system |
| `lastLoginAt` | Date | |

`toJSON` strips `password` and `__v`, so a hash cannot leak through a response.

### Category
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | indexed |
| `name` | String | |
| `icon`, `color` | String | lucide icon name, hex colour |
| `isDefault` | Boolean | seeded at registration |
| `isSystem` | Boolean | marks "Other" — cannot be deleted |

Unique index on `(userId, name)`. Categories are per-user rows rather than global
lookups, so any of them can be renamed, recoloured or deleted freely.

### Expense
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | indexed |
| `amount` | Number | > 0, rounded to 2 decimals on set |
| `merchant` | String | |
| `category` | ObjectId → Category | |
| `description` | String | |
| `date` | Date | |
| `paymentMethod` | Enum | cash, card, upi, netbanking, wallet, other |
| `isRecurring` | Boolean | |
| `recurringExpenseId` | ObjectId → RecurringExpense | null for manual entries |
| `source` | Enum | manual, ai, recurring, seed |
| `tags` | [String] | |
| `createdAt`, `updatedAt` | Date | via `timestamps: true` |

Indexes match the actual access shape — every query is scoped by user first:

```js
{ userId: 1, date: -1 }
{ userId: 1, category: 1, date: -1 }
{ userId: 1, amount: -1 }
{ userId: 1, merchant: 1 }
```

### Budget
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | |
| `category` | ObjectId → Category \| null | `null` = the overall monthly cap |
| `amount` | Number | |
| `month`, `year` | Number | 1–12, 2000–2100 |
| `notes` | String | |

Unique index on `(userId, year, month, category)`. MongoDB treats `null` as a
value in a unique index, which gives exactly one overall budget and one budget
per category, per user per month.

### RecurringExpense
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | |
| `amount`, `merchant`, `category`, `description`, `paymentMethod` | | same shape as an expense |
| `frequency` | Enum | weekly, monthly, yearly |
| `nextDueDate` | Date | indexed |
| `isActive` | Boolean | pause / resume |
| `autoPost` | Boolean | false = confirm each occurrence manually |
| `lastPostedAt`, `postedCount`, `endDate` | | |

### Relationships

```
User ─┬─< Category ─< Expense
      ├─< Expense
      ├─< Budget >── Category
      └─< RecurringExpense ─< Expense   (via recurringExpenseId)
```

---

## MongoDB aggregation

Analytics are computed in the database. Every pipeline opens with
`$match: { userId }` — that first stage is the isolation boundary.

**One `$facet` backs the whole dashboard header** — month totals, today's total,
category split, daily series, top merchants, largest expense and payment-method
mix, in a single round trip:

```js
Expense.aggregate([
  { $match: { userId, date: { $gte: start, $lte: end } } },
  { $facet: {
      totals:     [{ $group: { _id: null, total: { $sum: '$amount' },
                               count: { $sum: 1 }, average: { $avg: '$amount' },
                               max: { $max: '$amount' } } }],
      today:      [{ $match: { date: { $gte: todayStart, $lte: todayEnd } } },
                   { $group: { _id: null, total: { $sum: '$amount' } } }],
      byCategory: [{ $group: { _id: '$category', total: { $sum: '$amount' } } },
                   { $lookup: { from: 'categories', localField: '_id',
                                foreignField: '_id', as: 'category' } },
                   { $unwind: '$category' },
                   { $sort: { total: -1 } }],
      byDay:      [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                               total: { $sum: '$amount' } } },
                   { $sort: { _id: 1 } }],
      topMerchants: [{ $group: { _id: { $toLower: '$merchant' },
                                 total: { $sum: '$amount' }, count: { $sum: 1 } } },
                     { $sort: { count: -1 } }, { $limit: 5 }],
  } },
]);
```

Other pipelines:

| Operation | Technique |
|---|---|
| Monthly trends | `$group` on `{ $year, $month }`, gaps filled server-side |
| Current vs previous month | `$addFields` bucket tag → `$facet` → per-category `$group` with conditional sums |
| Category breakdown | `$group` + `$lookup` + `$round`, with share-of-total computed after |
| Daily series | `$dateToString` grouping, zero-spend days back-filled |
| Merchant ranking | `$toLower` grouping so "Swiggy" and "swiggy" merge |
| Budget vs actual | `Budget.find` joined against an expense `$group` in one pass |
| Filtered total | `$match` + `$sum` over the whole filtered set, not just the page |

> **Note:** aggregation pipelines receive **no** schema-based casting. Ids used in
> a `$match` must be real `ObjectId` instances — passing the raw string from a
> query parameter silently matches nothing. `expenseController` casts explicitly
> for this reason, and there is a regression test covering it.

---

## Gemini AI integration

### How the data boundary works

The model never touches the database. `ai.service.buildFinancialContext()` runs
the same aggregations the dashboard uses — all scoped to `req.user._id` — and
serialises the result into a compact JSON snapshot. That snapshot, plus the
user's question, is the entire input. There are no tools, no function calling
and no query passthrough, so there is no path from a prompt to another user's
rows.

The system prompt also instructs the model to treat everything inside the
snapshot as **data, never instructions** — merchant names and notes are
user-controlled text, so a merchant called "ignore previous instructions" is
handled as a string, not a command.

### Three capabilities

| Endpoint | What it does |
|---|---|
| `POST /api/ai/chat` | Answers questions from the user's own snapshot |
| `POST /api/ai/parse-expense` | Turns free text into a structured draft |
| `POST /api/ai/suggest-budget` | Allocates a target across categories |

Structured endpoints use Gemini's JSON mode with a response schema, and the reply
is then **clamped server-side**: suggested categories are mapped onto ids that
actually belong to the caller, allocations are rescaled to hit the requested
total exactly, and a parsed date in the future is pulled back to today.

### Natural-language expense entry

```
Input:  "paid 450 to dominos yesterday"
Output: { amount: 450, merchant: "Dominos", category: "Food",
          date: "2026-08-14", paymentMethod: "upi", confidence: 0.9 }
```

Nothing is written until the user confirms the draft in the UI.

### Working without an API key

If `GEMINI_API_KEY` is unset — or Gemini is rate-limited, unreachable, or returns
malformed JSON — every AI endpoint falls back to a deterministic local rules
engine and returns a `notice` explaining why. The UI shows this as a
"Local rules engine" badge.

The fallback covers merchant→category mapping across ~90 Indian merchants, amount
parsing (including `1,250` and `2k`), relative dates ("yesterday", "last friday"),
payment-method detection, budget summaries, overspend analysis, month comparisons
and proportional budget allocation. It is unit-tested independently of the API.

**The key is only ever read server-side.** It is sent as an `x-goog-api-key`
header rather than a query parameter (so it cannot leak into proxy logs), is
never included in any response, and `GET /api/ai/status` reports only a boolean.

---

## API endpoints

All routes are prefixed with `/api`. Everything except `register`, `login` and
`health` requires `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account (seeds default categories) |
| `POST` | `/auth/login` | Sign in, returns a JWT |
| `POST` | `/auth/logout` | Sign out |
| `GET` | `/auth/me` | Current user |
| `PUT` | `/auth/me` | Update name, currency, income, preferences |
| `PUT` | `/auth/password` | Change password, re-issues the token |

### Expenses
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/expenses` | List — search, filter, sort, paginate |
| `POST` | `/expenses` | Create |
| `GET` | `/expenses/:id` | Read one |
| `PUT` | `/expenses/:id` | Update |
| `DELETE` | `/expenses/:id` | Delete |
| `GET` | `/expenses/recent?limit=` | Most recent |

Query parameters for `GET /expenses`: `search`, `category`, `paymentMethod`,
`month`, `year`, `startDate`, `endDate`, `minAmount`, `maxAmount`, `isRecurring`,
`sortBy` (`date`\|`amount`\|`merchant`\|`createdAt`), `order` (`asc`\|`desc`),
`page`, `limit`.

### Categories
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/categories` | List with per-category usage counts |
| `POST` | `/categories` | Create |
| `PUT` | `/categories/:id` | Update |
| `DELETE` | `/categories/:id` | Delete, reassigning expenses to "Other" |

### Budgets
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/budgets?month=&year=` | Budgets joined with actual spend + alerts |
| `POST` | `/budgets` | Upsert one budget |
| `PUT` | `/budgets/:id` | Update |
| `DELETE` | `/budgets/:id` | Delete |
| `POST` | `/budgets/bulk` | Save a whole month at once |
| `GET` | `/budgets/alerts?month=&year=` | Alerts only |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics/dashboard` | Everything the dashboard needs, one call |
| `GET` | `/analytics/monthly` | Month summary + category, daily, merchant splits |
| `GET` | `/analytics/categories` | Category breakdown over a range |
| `GET` | `/analytics/trends?months=` | Multi-month trend, average, comparison |
| `GET` | `/analytics/daily` | Daily series |
| `GET` | `/analytics/merchants?limit=` | Top merchants |
| `GET` | `/analytics/comparison` | Current vs previous month |

### Recurring expenses
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/recurring-expenses` | List with monthly-equivalent totals |
| `POST` | `/recurring-expenses` | Create |
| `GET` | `/recurring-expenses/:id` | Read one |
| `PUT` | `/recurring-expenses/:id` | Update |
| `DELETE` | `/recurring-expenses/:id` | Delete (keeps posted expenses) |
| `POST` | `/recurring-expenses/:id/post` | Record the due occurrence now |
| `POST` | `/recurring-expenses/:id/skip` | Advance without recording |
| `POST` | `/recurring-expenses/process` | Run the due sweep for this user |

### AI
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ai/status` | Whether Gemini is configured + prompt suggestions |
| `POST` | `/ai/chat` | Ask a question about your finances |
| `POST` | `/ai/parse-expense` | Natural language → structured draft |
| `POST` | `/ai/suggest-budget` | Category-wise budget for a target amount |

### Response format

Success:
```json
{ "success": true, "message": "Expense added", "data": { "expense": { } } }
```

Failure:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "amount", "message": "Must be greater than zero" }]
}
```

---

## Environment variables

Copy `server/.env.example` to `server/.env` and fill it in. `server/.env` is
git-ignored.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` |
| `PORT` | no | `5050` | API port |
| `MONGO_URI` | **yes in prod** | `mongodb://127.0.0.1:27017/smart-expense-manager` | Connection string |
| `JWT_SECRET` | **yes in prod** | dev-only fallback | Signing secret |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime |
| `CLIENT_ORIGIN` | no | `http://localhost:5174` | Comma-separated allowed origins |
| `GEMINI_API_KEY` | no | — | Blank ⇒ local rules engine |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Model id |
| `GEMINI_TIMEOUT_MS` | no | `30000` | Request timeout |
| `RECURRING_CRON` | no | `true` | Enable the daily sweep |
| `RECURRING_CRON_SCHEDULE` | no | `0 2 * * *` | Cron expression |
| `BCRYPT_ROUNDS` | no | `12` | bcrypt work factor |
| `LOG_LEVEL` | no | `info` | `error` \| `warn` \| `info` \| `debug` |

In production, `JWT_SECRET` and `MONGO_URI` must be set explicitly — the server
exits at startup rather than falling back to a development default.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The client reads one optional variable, `VITE_API_URL`. In development Vite
proxies `/api` to the backend, so you can leave it unset.

> **Why port 5050 and not 5000?** macOS reserves port 5000 for the AirPlay
> Receiver, which answers requests with a `403` and makes the API look broken.

---

## Installation

### Prerequisites
- Node.js 18.18 or newer
- MongoDB 6+ running locally, or a MongoDB Atlas connection string
- A Gemini API key (optional) from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Setup

```bash
git clone <your-repo-url> "smart-expense-budget-manager"
cd "smart-expense-budget-manager"
npm run install:all
```

That installs the root tooling, the server and the client. Then create your env
file:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set at minimum `MONGO_URI` and `JWT_SECRET`.

### Gemini API setup (optional)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Create an API key.
3. Put it in `server/.env`:
   ```
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-2.5-flash
   ```
4. Restart the server. `GET /api/health` will report `"ai": "configured"`, and the
   assistant's badge changes from "Local rules engine" to the model name.

Skip this entirely if you want — every AI feature works via the local fallback.

---

## Running the app

### Both at once (recommended)

```bash
npm run dev
```

- API → <http://localhost:5050>
- Web → <http://localhost:5174>

### Separately

Backend:
```bash
npm run dev:server
```

Frontend:
```bash
npm run dev:client
```

### Production build

```bash
npm run build
npm start
```

`npm run build` emits the client to `client/dist/`, ready to serve from any static
host. Point it at the API with `VITE_API_URL`.

---

## Sample data

There is **no bundled dataset**. The seed script generates synthetic transactions
at run time from merchant and amount profiles defined in `server/seed/seed.js`,
shaped like real spending: daily food, weekday commutes, fixed monthly rent and
bills, weekend skew, and the occasional splurge. A fixed RNG seed makes it
reproducible.

```bash
npm run seed          # create the demo account if it is missing
npm run seed:fresh    # wipe the demo account and rebuild it
```

This creates roughly 300 expenses across six months, nine categories, budgets for
the current and previous month, and eight recurring schedules.

**Demo credentials**

```
Email:    demo@expense.app
Password: Demo@1234
```

The login screen has a "Use demo credentials" button that fills these in.

---

## Testing

```bash
npm test
```

46 tests using Node's built-in runner — no test framework dependency.

**Unit tests** (`server/tests/unit.test.js`) cover date maths (month boundaries,
leap years, due-date advancement with day-of-month clamping), budget alert
thresholds, the natural-language parser, and budget allocation.

**Integration tests** (`server/tests/api.test.js`) run against a throwaway
`<db>-test` database that is dropped afterwards, covering:

- registration, login, duplicate emails, weak passwords
- rejection of operator-injection login payloads
- expense CRUD, validation errors, search / filter / sort / range queries
- **cross-user isolation** — reading, editing and deleting another user's
  expense all return 404; a foreign category id is rejected; analytics never
  aggregate across users; the AI reply never contains another user's data
- budget joins, alert levels, and upsert-not-duplicate behaviour
- category deletion reassigning expenses to "Other"
- recurring posting, due-date rolls, and history preservation on delete

If MongoDB is unreachable the integration suite skips rather than fails, so the
unit tests still run on a machine without a local server.

---

## Security

| Concern | Measure |
|---|---|
| Password storage | bcrypt, 12 rounds, `select: false` on the field |
| Session | JWT with expiry; user re-loaded from the DB on every request |
| Password change | Token re-issued, invalidating the previous one |
| Authorization | Every query filtered by `userId` from the token, never from input |
| Cross-user access | Returns **404**, not 403 — no existence disclosure |
| Foreign key tampering | Category/recurring ids are ownership-checked before use |
| Account enumeration | Login returns one message for both bad email and bad password |
| Input validation | Zod on body, query and params; parsed output replaces the input |
| NoSQL injection | Zod rejects operator objects; `express-mongo-sanitize` strips `$`/`.` keys |
| Regex injection | User input is escaped before being used in a `RegExp` |
| Brute force | 20 auth attempts / 15 min; 600 API requests / 15 min; 20 AI calls / min |
| Secrets | `.env` git-ignored; production exits if `JWT_SECRET` is unset |
| Gemini key | Server-side only, sent as a header, never in a response |
| Prompt injection | Model gets a read-only data snapshot — no tools, no DB handle |
| Headers | helmet |
| CORS | Explicit origin allowlist; denials omit headers rather than 500 |
| Payload size | 100 kb limit on JSON bodies |
| Error leakage | Unexpected errors logged server-side, returned as a generic 500 |

### Known limitations

- The JWT is kept in `localStorage`, which is readable by any script that
  achieves XSS on the origin. React escapes rendered content by default and the
  one `dangerouslySetInnerHTML` (assistant markdown) escapes its input first, but
  httpOnly refresh cookies would be stronger for a public deployment.
- Rate limits are per-process and in-memory. Behind multiple instances they need
  a shared store such as Redis.
- There is no email verification or password reset flow.

---

## Project structure

```
.
├── client/
│   ├── index.html
│   ├── vite.config.js              # dev proxy, aliases, manual chunks
│   ├── tailwind.config.js          # semantic colour tokens
│   └── src/
│       ├── main.jsx                # provider composition
│       ├── App.jsx                 # routes, lazy-loaded pages
│       ├── index.css               # tokens, base styles, component classes
│       ├── components/
│       │   ├── ui/                 # Button, Field, Modal, Card, Feedback,
│       │   │                       # Pagination, PageHeader, MonthPicker,
│       │   │                       # CategoryIcon
│       │   ├── charts/             # ChartKit + all Recharts wrappers
│       │   ├── dashboard/          # StatCard, NotificationBell
│       │   ├── expenses/           # ExpenseForm, ExpenseTable
│       │   ├── ErrorBoundary.jsx
│       │   └── ProtectedRoute.jsx
│       ├── context/                # Auth, Toast, Confirm, Theme
│       ├── hooks/                  # useAuth, useToast, useAsync, useDebounce…
│       ├── layouts/                # DashboardLayout, AuthLayout
│       ├── pages/                  # the 10 screens
│       ├── services/               # Axios instance + per-resource clients
│       └── utils/                  # formatting, constants, cn
│
├── server/
│   ├── server.js                   # bootstrap, cron, graceful shutdown
│   ├── app.js                      # Express app (exported for tests)
│   ├── config/                     # env validation, db connection
│   ├── controllers/                # auth, expense, category, budget,
│   │                               # analytics, recurring, ai
│   ├── middleware/                 # auth, validate, errorHandler, rateLimiters
│   ├── models/                     # User, Expense, Category, Budget,
│   │                               # RecurringExpense
│   ├── routes/                     # one router per resource
│   ├── services/                   # analytics, budget, recurring, category,
│   │                               # ai, gemini
│   ├── utils/                      # ApiError, asyncHandler, dates, token, logger
│   ├── validators/                 # Zod schemas
│   ├── seed/                       # synthetic data generator
│   └── tests/                      # unit + integration
│
├── package.json                    # workspace scripts
└── README.md
```

---

## Screenshots

**[▶️ Video walkthrough](https://drive.google.com/file/d/1kpnuxSu-mHBPULVLQyp_0d1oJl08ElGy/view?usp=sharing)** — every screen below, in motion.

Add stills to a `docs/screenshots/` folder and reference them here.

| Screen | Image |
|---|---|
| Dashboard (light) | `![Dashboard](docs/screenshots/dashboard-light.png)` |
| Dashboard (dark) | `![Dashboard dark](docs/screenshots/dashboard-dark.png)` |
| Expenses | `![Expenses](docs/screenshots/expenses.png)` |
| Budgets | `![Budgets](docs/screenshots/budgets.png)` |
| Analytics | `![Analytics](docs/screenshots/analytics.png)` |
| Recurring | `![Recurring](docs/screenshots/recurring.png)` |
| AI assistant | `![AI assistant](docs/screenshots/assistant.png)` |
| Natural-language entry | `![Add expense](docs/screenshots/add-expense.png)` |
| Mobile | `![Mobile](docs/screenshots/mobile.png)` |

---

## Future improvements

**Product**
- Income tracking alongside expenses, with a savings-rate view
- Receipt capture with OCR, feeding the same confirm-before-save flow
- Shared or household budgets with per-member attribution
- Savings goals with projected completion dates
- CSV and PDF export; bank-statement import with duplicate detection
- Budget rollover of unspent amounts into the next month

**Technical**
- httpOnly refresh-token cookies with short-lived access tokens
- Redis-backed rate limiting and caching for aggregation results
- React Query for request deduplication and cache invalidation
- Optimistic updates on expense create/edit/delete
- WebSockets to push budget alerts in real time
- Playwright end-to-end coverage of the critical flows
- Dockerfile and compose setup; CI running the suite on every push
- Migrate the client to TypeScript and generate types from the Zod schemas
- Virtualised expense list for accounts with tens of thousands of rows

---

## Licence

MIT — free to use as a portfolio reference or a starting point.
