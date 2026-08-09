# DARJI — Smart Tailor Business Management System
### AI Coding Agent Build Specification (`prompt.md`)
**Version:** 1.0 | **Stack:** React Native + React.js + Node/Express + MongoDB + SQLite (offline)

---

## 0. How To Use This Document — Loop Engineering Protocol

This spec is written for an AI coding agent (Claude Code / Cursor / Copilot Workspace, etc.) to build DARJI end‑to‑end. The agent MUST follow this loop for **every module** listed in Section 15. Do not skip steps or batch multiple modules together.

```
LOOP (per module):
1. PLAN     → Re-read the module's schema + API contract + business logic below.
              Write a short task checklist before touching code.
2. SCAFFOLD → Create folder/files, DB models/collections, empty route handlers.
3. IMPLEMENT→ Write business logic exactly as specified in Section 7.
4. SECURE   → Apply the relevant checklist items from Section 12 to this module
              BEFORE marking it done (not as a later pass).
5. TEST     → Write/run unit + integration tests for this module only.
6. SELF-REVIEW → Diff against acceptance criteria in Section 17. Fix gaps.
7. DOCUMENT → Update API docs / README for this module.
8. COMMIT   → Only then move to the next module in the Phase order (Section 15).
```

If a module fails step 6, the loop repeats from step 3 — never proceed with a known gap.

---

## 1. Product Summary

DARJI is an all-in-one, offline-first ERP for tailoring businesses (tailors, boutiques, designers). It unifies customer management, measurements, order tracking, billing/invoicing, payments, expenses, cash book, profit analytics, WhatsApp communication, and a local (non-AI-API) natural-language query assistant — across mobile, tablet, and desktop, online or offline.

**Core differentiators:** offline-first with reliable sync, India-compliant GST invoicing, a rule-based "Query AI" with zero external API cost/dependency, and a premium Navy/Gold/White design system with full dark mode.

---

## 2. Roles Applied In This Spec

| Role | Responsibility in this document |
|---|---|
| Senior Software Developer | Architecture, schemas, API contract, sync logic, folder structure |
| Cyber Security Expert | Section 12 — full attack-surface hardening checklist |
| Chartered Accountant (CA) | Section 13 — GST/invoicing law, rounding, retention, profit correctness |
| AI Engineer (no external API) | Section 10 — local rule-based Query AI engine |
| UI/UX Designer | Section 11 — design tokens, component system, key screens |

---

## 3. Final Tech Stack

**Frontend (Mobile):** React Native (Android first, iOS-ready), React Navigation, Zustand/Redux Toolkit for state, React Native Paper / custom design system.
**Frontend (Web Admin):** React.js + Vite, Tailwind CSS (tokens from Section 11), Recharts for graphs.
**Backend:** Node.js + Express.js (REST), Zod for schema validation.
**Primary DB (cloud):** MongoDB Atlas.
**Offline DB (device):** SQLite (via WatermelonDB or Realm) — mirrors cloud schema.
**File/Media Storage:** Cloudinary (logo, signature, receipts, garment/trial photos).
**Auth:** JWT (access + refresh tokens), bcrypt/argon2 password hashing.
**Push Notifications:** Firebase Cloud Messaging.
**WhatsApp:** [open-wa](https://github.com/open-wa/wa-automate-nodejs) running on the **Baileys** engine (no Puppeteer/Chromium) — lightweight WebSocket-based connection, low RAM/CPU footprint, self-hosted as a dedicated microservice (see Section 12.8 for hardening).
**PDF:** PDFKit (server) or React-PDF (client) for invoices.
**Query AI:** 100% local, rule-based — no OpenAI/Gemini/Claude API calls (Section 10).

---

## 4. High-Level Architecture

```
┌─────────────┐        ┌─────────────┐        ┌──────────────┐
│  Mobile App │        │  Web Admin  │        │  Tablet App  │
│(React Native)        │  (React.js) │        │(React Native)│
└──────┬──────┘        └──────┬──────┘        └───────┬──────┘
       │  REST/JWT             │  REST/JWT              │
       └───────────┬───────────┴────────────┬───────────┘
                    │                        │
              ┌─────▼────────────────────────▼─────┐
              │     Node.js + Express API Layer     │
              │  (Auth, Validation, Rate Limiting)  │
              └─────┬───────────────────┬───────────┘
                     │                   │
             ┌───────▼──────┐   ┌────────▼────────┐
             │ MongoDB Atlas │   │ Query AI Engine  │
             │  (source of   │   │ (local, rule-    │
             │   truth)      │   │  based, reads DB)│
             └───────────────┘   └──────────────────┘

Each client also holds a local SQLite mirror + Sync Queue
for offline writes, reconciled via Section 9's Sync Loop.
```

---

## 5. Folder Structure

```
darji-erp/
├── apps/
│   ├── mobile/                 # React Native app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── db/             # SQLite models + sync queue
│   │   │   ├── store/          # Zustand/Redux
│   │   │   ├── services/       # API clients
│   │   │   └── queryAI/        # local intent engine (shared w/ web)
│   │   └── app.json
│   └── web-admin/               # React.js
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── store/
│       │   └── services/
├── server/
│   ├── src/
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/          # auth, rateLimit, validate, audit
│   │   ├── services/            # invoiceNumber, gst, profit, sync
│   │   ├── queryAI/             # server-side intent engine (shared)
│   │   └── utils/
│   └── tests/
├── shared/
│   ├── types/                   # TS types shared client/server
│   └── constants/                # design tokens, categories, statuses
└── prompt.md                     # this file
```

---

## 6. Database Design

Mongo is the source of truth; SQLite (device) mirrors the same field names for painless sync mapping. All collections include `_id`, `shopId` (multi-shop ready), `createdAt`, `updatedAt`, `updatedBy`, `syncVersion` (int, incremented on every write — used for conflict resolution), `isDeleted` (soft delete).

### 6.1 `shops`
`name, logoUrl, signatureUrl, gstNumber, address, phone, email, currency, language, invoiceSettings{prefix, resetCycle, padding}, themeMode`

### 6.2 `users`
`name, phone, email, passwordHash, role[owner|staff|future:branchManager], pinHash, biometricEnabled, permissions[], lastLoginAt, isActive`

### 6.3 `customers`
`name, mobile, whatsapp, address, gender, dob, anniversary, notes, totalSpending(computed), pendingAmount(computed), lastVisit(computed), tags[]`

### 6.4 `measurements`
`customerId, category[shirt|pant|blouse|suit|kurta|lehenga|sareeBlouse|coat|custom], fields{ } (dynamic key-value per category), version, previousVersionId, recordedBy`
- Every edit creates a **new version** document; never overwrite. `previousVersionId` links the chain → full history browsable.

### 6.5 `orders`
`orderNumber, customerId, orderDate, deliveryDate, priority[normal|urgent|vip], status[pending|cutting|stitching|trial|ready|delivered|cancelled], items:[orderItemId], timeline:[{status, timestamp, updatedBy}], notes`

### 6.6 `orderItems`
`orderId, name, category, measurementVersionId, qty, price, notes`

### 6.7 `payments`
`orderId, customerId, mode[cash|upi|card|bankTransfer], amount, type[advance|partial|final], receivedAt, receivedBy, referenceId`

### 6.8 `invoices`
`invoiceNumber, orderId, customerId, items:[{name, qty, price}], discount, gst{cgst,sgst,igst,rate}, extraCharges, subtotal, grandTotal, roundOff, paymentStatus[unpaid|partial|paid], pdfUrl, termsSnapshot`

### 6.9 `expenses`
`date, category[shop|employee|material|marketing|misc], subCategory, amount, paymentMode, description, receiptImageUrl, isRecurringMonthly`

### 6.10 `cashbook`
`date, openingCash, cashSales(computed), onlineSales(computed), totalExpenses(computed), closingCashExpected(computed), closingCashActual(entered), mismatch(computed), mismatchReason`

### 6.11 `notifications`
`type[deliveryDue|paymentPending|orderReady|overdue|backupReminder], targetUserId, payload, isRead, scheduledFor`

### 6.12 `auditLogs`  *(Security requirement — Section 12.9)*
`userId, action, entity, entityId, ipAddress, deviceId, before, after, timestamp`

### 6.13 `syncQueue` (device-local SQLite only)
`localId, collection, operation[create|update|delete], payload, syncVersion, status[pending|synced|conflict], attempts`

---

## 7. Core Business Logic Algorithms

### 7.1 Invoice Number Generator
```
Format: {PREFIX}-{YEAR}-{RUNNING_NUMBER, zero-padded}
Example: INV-2026-000001

Algorithm:
1. Read shop.invoiceSettings (prefix, resetCycle: monthly|yearly, padding)
2. Determine current period key:
   - yearly  → currentYear
   - monthly → currentYear + currentMonth
3. Atomically increment a per-shop, per-period counter document
   (use MongoDB findOneAndUpdate with $inc — prevents race conditions
   under concurrent billing on multiple devices)
4. Zero-pad the counter to `padding` digits
5. Compose: `${prefix}-${periodLabel}-${paddedNumber}`
6. On period rollover, counter auto-resets to 1 (new period doc)
```
Owner-customizable prefix and reset cycle live in `shops.invoiceSettings`.

### 7.2 Order Status State Machine
```
Allowed transitions only (enforce server-side, reject invalid jumps):
pending → cutting → stitching → trial → ready → delivered
   ↳ cancelled (allowed from any non-delivered state)

On every transition:
  push { status, timestamp: now(), updatedBy: userId } into orders.timeline
  trigger relevant notification (Section 12 rate-limited)
  if status == 'ready' → auto-fire WhatsApp "Order Ready" template
  if status == 'delivered' → auto-fire WhatsApp "Thank You" + invoice PDF
```

### 7.3 Payment Status Derivation
```
remaining = invoice.grandTotal - sum(payments.amount where orderId matches)
if remaining <= 0        → status = 'paid'
else if paidSoFar > 0    → status = 'partial'
else                     → status = 'unpaid'
(Recompute on every payment insert; never trust a stored flag alone —
 always derive from the payments ledger to avoid drift.)
```

### 7.4 Profit Calculation
```
Net Profit = Total Sales (period) - Total Expenses (period)

Detailed breakdown (for Reports & Dashboard):
Sales        = SUM(invoices.grandTotal) where invoice.createdAt in period
Expenses     = SUM(expenses.amount) grouped by category
             (Rent, Electricity, Salary, Material, Marketing, Misc)
Net Profit   = Sales - SUM(all expense categories)
Margin %     = (Net Profit / Sales) * 100
```
Computed on-demand for dashboard widgets; cached per day and invalidated on new invoice/expense write.

### 7.5 Cash Book Auto-Calculation
```
openingCash          = previous day's closingCashActual (carry forward)
cashSales            = SUM(payments where mode='cash', date=today)
onlineSales          = SUM(payments where mode in [upi,card,bankTransfer], date=today)
totalExpensesCash    = SUM(expenses where paymentMode='cash', date=today)
closingCashExpected  = openingCash + cashSales - totalExpensesCash
mismatch             = closingCashActual - closingCashExpected
if mismatch != 0 → flag "Cash Mismatch Alert" on dashboard, require mismatchReason
```

### 7.6 GST Calculation (CA Role — see Section 13 for legal context)
```
if shop.state == customer.state (or no customer state captured):
   CGST = rate/2 % of taxable value ; SGST = rate/2 % of taxable value
else:
   IGST = rate % of taxable value

taxableValue = subtotal - discount
grandTotal   = taxableValue + CGST + SGST (or + IGST) + extraCharges
roundOff     = round(grandTotal) - grandTotal   // Indian invoice rounding to nearest ₹1
finalTotal   = round(grandTotal)
```
GST block is entirely optional per invoice (many small tailors are unregistered) — controlled by `shops.gstNumber` presence.

---

## 8. REST API Contract (Summary)

All routes prefixed `/api/v1`. Auth via `Authorization: Bearer <JWT>` unless noted. Every mutating route passes through `middleware/validate` (Zod) → `middleware/auth` → `middleware/audit` → controller.

| Module | Method & Path | Role |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/pin-verify` | public/owner/staff |
| Customers | `GET/POST /customers`, `GET/PUT/DELETE /customers/:id` | owner/staff |
| Measurements | `GET /customers/:id/measurements`, `POST /measurements`, `GET /measurements/:id/history` | owner/staff |
| Orders | `GET/POST /orders`, `PUT /orders/:id`, `PATCH /orders/:id/status`, `GET /orders/:id/timeline` | owner/staff |
| Payments | `POST /orders/:id/payments`, `GET /orders/:id/payments` | owner/staff |
| Invoices | `POST /orders/:id/invoice`, `GET /invoices/:id/pdf`, `POST /invoices/:id/whatsapp` | owner/staff |
| Expenses | `GET/POST /expenses`, `PUT/DELETE /expenses/:id` | owner |
| Cashbook | `GET /cashbook/:date`, `POST /cashbook/:date/close` | owner |
| Reports | `GET /reports/sales`, `/reports/profit`, `/reports/expense`, `/reports/customers` (export=pdf\|xlsx) | owner |
| Dashboard | `GET /dashboard/summary` | owner/staff |
| Query AI | `POST /query-ai/ask { text }` | owner/staff |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read` | owner/staff |
| Settings | `GET/PUT /settings/shop` | owner |
| Sync | `POST /sync/push`, `GET /sync/pull?since=` | owner/staff (device) |

---

## 9. Offline-First Sync Loop Protocol

```
LOCAL WRITE:
1. All screens write to SQLite FIRST (instant UI feedback), never block on network.
2. Every local write appends an entry to syncQueue with a monotonic localId
   and current syncVersion.

CONNECTIVITY LOOP (runs every 15s in background + on network-restore event):
3. IF online:
     a. Batch up to N pending syncQueue rows → POST /sync/push
     b. Server applies each op:
        - IF server.syncVersion for that doc > client's base version
          → CONFLICT: apply Last-Write-Wins on non-financial fields,
            but for financial fields (payments, invoices) → NEVER auto-merge;
            flag as 'conflict' and surface to owner for manual review.
        - ELSE → apply cleanly, increment syncVersion, return new version.
     c. Mark local rows 'synced' or 'conflict' based on response.
     d. GET /sync/pull?since=<lastPulledAt> → merge server-side changes
        (from other devices) into local SQLite.
4. IF offline: retry with exponential backoff (max 5 min interval), UI shows
   🔴 Offline. On reconnect → 🔄 Syncing → 🟢 Online.
5. Never delete local data until server ACKs the sync.
```

---

## 10. Query AI — Local, Non-API Natural Language Assistant

**Goal:** Let the owner type/speak questions like *"aaj ka sales kitna hai?"* or *"pending payments of Rahul"* and get an instant answer — **without calling any external LLM API.** Pure rule-based NLU running on-device/server, using only the app's own database.

### 10.1 Architecture
```
User Text
   │
   ▼
[1] Normalizer      → lowercase, strip punctuation, transliterate common
                       Hinglish spellings (aaj→today, kal→yesterday, kitna→amount)
   │
   ▼
[2] Tokenizer        → split into words/phrases
   │
   ▼
[3] Intent Matcher   → keyword/pattern scoring against an intent dictionary
                       (see 10.2). Highest-scoring intent wins; ties →
                       ask clarifying question instead of guessing.
   │
   ▼
[4] Entity Extractor → regex + fuzzy match against DB for:
                       - dates ("aaj", "is week", "July", "05/08/2026")
                       - customer names (fuzzy match customers.name)
                       - amounts, statuses (pending/paid/delivered etc.)
   │
   ▼
[5] Query Template Mapper → maps (intent + entities) to a pre-built,
                             parameterized DB query (Section 7 formulas reused)
   │
   ▼
[6] DB Executor      → runs the Mongo/SQLite query
   │
   ▼
[7] Response Formatter → fills a Hindi/English sentence template with results
```

### 10.2 Intent Dictionary (sample — extensible without retraining)

| Intent | Trigger keywords (HI/EN) | Query Template | Response Template |
|---|---|---|---|
| `today_sales` | aaj sales, today sales, aaj ka business | SUM(invoices.grandTotal, date=today) | "Aaj ka total sales ₹{amount} hai." |
| `pending_payments` | pending payment, baaki paisa, udhaar | orders where paymentStatus != paid, grouped by customer | "{count} customers ka ₹{total} pending hai." |
| `customer_pending` | {name} ka pending, {name} baaki | filter above by customerId (fuzzy-matched name) | "{name} ka ₹{amount} pending hai." |
| `today_delivery` | aaj delivery, aaj deliver karna hai | orders where deliveryDate=today | "Aaj {count} orders deliver karne hain: {list}." |
| `monthly_profit` | is mahine ka profit, monthly profit | Section 7.4 formula, period=month | "Is mahine ka net profit ₹{amount} hai." |
| `order_status` | {order#} ka status, order kaha hai | orders.findOne(orderNumber) | "{orderNumber} abhi '{status}' stage me hai." |
| `low_cash_alert` | cash mismatch, cashbook check | cashbook.today.mismatch | "Aaj cash mismatch ₹{amount} hai." |

**Extensibility rule:** adding a new capability = adding one row to this table (keywords + template) — no model training, no API key, fully offline-capable, deterministic and auditable (important for a finance app).

### 10.3 Fallback / Clarification Flow
```
IF top intent score < confidence threshold (e.g., 0.6):
   → respond: "Mujhe samajh nahi aaya, kya aap '<closest guess>' poochh rahe hain?"
   → show 2-3 suggested quick-reply intents
IF entity missing (e.g., asked "pending payment" for a name not found):
   → respond: "Customer ka naam clear nahi mila, kripya sahi naam batayein."
```

### 10.4 Why no external AI API
- Zero per-query cost, works fully offline (matches Section 19 requirement).
- Deterministic, auditable answers — critical since responses touch financial data (CA requirement, Section 13).
- No customer/financial data ever leaves the device/server boundary → major privacy/security win (Section 12).

---

## 11. UI/UX Design System

### 11.1 Design Tokens
```css
:root {
  --color-navy-900: #0B1F3A;
  --color-navy-700: #16305A;
  --color-gold-500:  #C9A24B;
  --color-gold-300:  #E4CE93;
  --color-white:     #FFFFFF;
  --color-bg-light:  #F7F8FA;
  --color-success:   #2E7D32;
  --color-warning:   #C77700;
  --color-danger:    #C62828;

  --font-heading: 'Playfair Display', serif;
  --font-body:    'Inter', sans-serif;

  --radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 20px;
  --space-1: 4px; --space-2: 8px; --space-3: 16px; --space-4: 24px; --space-5: 32px;
}
[data-theme="dark"] {
  --color-bg-light: #0F1522;
  --color-white:    #1B2333;
  /* navy/gold accents remain, inverted surface hierarchy */
}
```

### 11.2 Principles
- Mobile-first, one-hand reachable primary actions (FAB bottom-right for "New Order").
- Minimal chrome, generous whitespace, gold used sparingly as accent (CTA, active states) — never as large background fields.
- Every list screen: sticky search + filter chips (status, payment, priority, date).
- Invoice/PDF templates mirror the app's navy/gold header band + white body for print consistency.

### 11.3 Key Screens
Dashboard · Customer List/Profile · Measurement Editor (versioned) · New/Edit Order (multi-item) · Order Timeline (vertical stepper) · Billing/Invoice Preview · Expense Entry · Cash Book · Reports · Query AI chat bar (persistent, bottom of Dashboard) · Settings.

---

## 12. Security & Cyber-Defense Checklist (Cyber Expert Role)

This is not a later "hardening pass" — apply the relevant row **inside the Loop (Section 0, step 4)** for the module being built.

### 12.1 Authentication & Session
- [ ] Passwords: argon2id (not bcrypt alone) hashing, min 8 chars + complexity check.
- [ ] JWT access token short-lived (15 min) + refresh token rotation, refresh tokens stored httpOnly/secure, revocable server-side (deny-list on logout).
- [ ] PIN/biometric lock reuses OS secure enclave (Keychain/Keystore) — never store raw PIN.
- [ ] Auto-logout after configurable inactivity period.
- [ ] Brute-force protection: exponential lockout after 5 failed attempts per account+IP.

### 12.2 Authorization / RBAC
- [ ] Every controller checks role/permission server-side — never trust client-sent role.
- [ ] Object-level authorization: staff can only access their own shop's data (`shopId` scoping on every query) — prevents IDOR (Insecure Direct Object Reference).

### 12.3 Input Validation & Injection Defense
- [ ] Zod/Joi schema validation on every request body/param/query — reject unknown fields.
- [ ] MongoDB: use parameterized queries / Mongoose only — never string-concatenate into `$where`; sanitize against NoSQL operator injection (`$gt`, `$ne` payloads) with `express-mongo-sanitize`.
- [ ] Query AI module (Section 10): user text is NEVER passed into a raw DB query string — it only selects from a fixed set of pre-built parameterized templates. This closes prompt-injection-style and NoSQL-injection risk entirely.
- [ ] File uploads: verify MIME type + magic bytes (not just extension), max size limits, re-encode images server-side to strip EXIF/malicious payloads, virus-scan (e.g., ClamAV) before storing to Cloudinary.

### 12.4 Data Encryption
- [ ] TLS 1.2+ enforced everywhere (HSTS header).
- [ ] Sensitive fields at rest (GST number, phone, bank refs) — field-level encryption (AES-256-GCM) in MongoDB.
- [ ] Local SQLite database encrypted (SQLCipher) — protects offline data if device is lost/stolen.
- [ ] Backups encrypted before upload to cloud storage.

### 12.5 API & Network Hardening
- [ ] Rate limiting per IP + per user (e.g., `express-rate-limit`): stricter on `/auth/*` and `/query-ai/ask`.
- [ ] Helmet.js for secure headers (CSP, X-Frame-Options, X-Content-Type-Options).
- [ ] CORS locked to known app origins only.
- [ ] CSRF protection on web-admin (SameSite cookies + CSRF token for state-changing form posts, if cookie-based sessions used anywhere).

### 12.6 Offline & Device Security
- [ ] Device-bound sync tokens; revoke a lost device's access remotely from Settings.
- [ ] Local DB wiped after N failed PIN attempts (configurable, owner opt-in).
- [ ] Sync payloads signed/checksummed to detect tampering in transit or on-disk.

### 12.7 Backup & Restore Integrity
- [ ] Automated encrypted backups (daily), checksum-verified before restore.
- [ ] Restore requires owner re-authentication + confirmation (prevents malicious/accidental data wipe).

### 12.8 WhatsApp Integration — open-wa / Baileys (Self-Hosted, Low-Load)

**Why Baileys over Puppeteer-based tools:** Baileys talks to WhatsApp Web directly over a WebSocket (no headless Chromium instance), so RAM/CPU per session is a fraction of Puppeteer-based automation — important since DARJI runs this on modest shop-owner infra. `open-wa` wraps Baileys with a stable session-management + queue API, which is what we build against here.

**Architecture (dedicated microservice, isolated from the main API):**
```
Node/Express API  ──internal-only──▶  whatsapp-service (open-wa/Baileys)
                                          │
                                          ├─ session store (encrypted, see below)
                                          ├─ outbound message QUEUE (Bull/Redis)
                                          │    → rate-limited sender (low load)
                                          └─ event listener → webhook back to main API
```

- [ ] **Isolated microservice:** `whatsapp-service` runs as its own process/container, reachable only from the internal network (never exposed publicly) — the main API talks to it over an internal REST/queue interface with a shared secret, not directly from client apps.
- [ ] **Session (auth) storage encrypted at rest:** Baileys session/creds files (`.wwebjs_auth`/session JSON) contain the equivalent of a login token — encrypt them on disk (AES-256) and back them up like any other secret; losing them = full WhatsApp account takeover for whoever gets the file.
- [ ] **One QR pairing per shop, owner-only:** only the `owner` role can initiate/re-scan the QR pairing flow (Settings screen); staff never sees the pairing UI.
- [ ] **Session health monitoring + auto-reconnect:** Baileys sessions can drop (phone offline, WhatsApp logout elsewhere); implement heartbeat checks + exponential-backoff reconnect, and surface a dashboard warning (🔴 "WhatsApp disconnected — re-scan QR") rather than silently failing to send.
- [ ] **Outbound queue with rate limiting (low-load, anti-ban):** never fire messages synchronously from order/payment events. Push to a Redis/Bull queue with a conservative send rate (e.g., a few messages/second with jitter) and daily-volume caps — bursty sending is what gets unofficial WhatsApp numbers banned.
- [ ] **No bulk broadcast** (matches Section 17 of the SRS — "Bulk Broadcast nahi"): enforce this at the queue level, not just the UI, with a hard per-day-per-number send cap in code.
- [ ] **Template sanitization:** even though this isn't Meta's approved-template system, still run all dynamic fields (customer name, amounts, dates) through the same input-sanitization middleware as the rest of the app before interpolating into a message string — prevents any stored-XSS-style payload in a customer name from propagating into outbound messages.
- [ ] **Media handling:** invoice PDFs/thank-you posters sent via WhatsApp go through the same file-integrity checks as Section 12.3 before upload to the session.
- [ ] **ToS risk disclosure:** since open-wa/Baileys is an unofficial client, document in Settings that WhatsApp can rate-limit or ban numbers that violate its usage policies (especially with bulk/spam-like behavior) — the queue caps above exist specifically to minimize this operational risk, not just for performance.
- [ ] **Secrets never in client bundles:** the internal shared secret between main API and `whatsapp-service` must never ship in the mobile/web app code — server-to-server only.

### 12.9 Audit Logging & Monitoring
- [ ] `auditLogs` collection (Section 6.12) records every create/update/delete of financial documents (orders, payments, invoices, expenses) with before/after diff.
- [ ] Anomaly alerts: unusual bulk-export, repeated failed logins, off-hours admin actions.
- [ ] Centralized error/log monitoring (e.g., Sentry) with PII scrubbing before it leaves the server.

### 12.10 Dependency & Supply Chain
- [ ] `npm audit` / Dependabot / Snyk in CI on every PR; block merge on high/critical CVEs.
- [ ] Pin dependency versions; review new packages before adding.

### 12.11 OWASP Top-10 Mapping (quick self-check before each release)
Broken Access Control → 12.2 · Cryptographic Failures → 12.4 · Injection → 12.3 · Insecure Design → this whole Section · Security Misconfig → 12.5 · Vulnerable Components → 12.10 · Auth Failures → 12.1 · Data Integrity Failures → 12.7 · Logging Failures → 12.9 · SSRF → validate all outbound URLs (Cloudinary/WhatsApp webhooks only, allow-listed domains).

---

## 13. Compliance & Financial Correctness (CA Role)

- **GST invoicing:** invoice must show shop GSTIN (if registered), taxable value, CGST/SGST or IGST split (Section 7.6), HSN/SAC code field for stitching services, and a sequential, non-reusable invoice number (legal requirement — Section 7.1's atomic counter ensures no duplicates/gaps that could raise audit flags).
- **Rounding:** round final invoice total to nearest ₹1 per standard Indian practice; store `roundOff` explicitly as its own line for reconciliation.
- **Unregistered dealers:** if `shop.gstNumber` is empty, suppress GST block entirely rather than showing ₹0 GST (avoids implying a false GST-registered status).
- **Financial year handling:** invoice number reset options must align to India's April–March financial year, not just calendar year — expose this choice in `invoiceSettings.resetCycle`.
- **Record retention:** financial documents (invoices, payments, expenses) must be retained a minimum of 6–8 years per Indian tax record-keeping norms — Section 12's soft-delete (`isDeleted`) rather than hard-delete supports this; hard purges should require an explicit, logged owner action after the retention window.
- **Profit reporting integrity:** Section 7.4's profit formula must always be derived live from ledger data (payments/expenses), never from a manually-editable "profit" field, to prevent silent misstatement.

---

## 14. Non-Functional Requirements

- App cold-start < 2s on mid-range Android; list screens virtualized for 10k+ orders/customers.
- Offline capacity: minimum 5,000 orders + full customer/measurement history stored locally without perceptible lag.
- 99.5% sync success rate target; conflicts surfaced, never silently dropped.
- Accessibility: minimum tap target 44x44px, color-contrast AA compliant even with gold accents.

---

## 15. Phased Build Plan (apply the Section 0 Loop to every module)

| Phase | Modules | Exit Criteria |
|---|---|---|
| **0 — Foundation** | Repo scaffold, auth, RBAC, shops/users schema, design tokens | Login works, roles enforced, empty dashboard renders |
| **1 — Core Data** | Customers, Measurements (+versioning) | CRUD + measurement history browsing works |
| **2 — Orders** | Orders, Order Items, Timeline state machine | Full status flow + timeline logged |
| **3 — Money** | Payments, Invoices (+GST+numbering), Expenses, Cash Book | Invoice PDF generated, cash book auto-calcs, mismatch alert fires |
| **4 — Comms** | WhatsApp templates, Notifications | Order-ready/delivered messages fire correctly, rate-limited |
| **5 — Offline & Sync** | SQLite mirror, Sync Queue, Sync Loop (Section 9) | Airplane-mode CRUD works, reconnect syncs cleanly, conflicts surfaced |
| **6 — Query AI** | Intent engine, entity extraction, templates (Section 10) | 90%+ accuracy on the sample intent list, safe fallback on unknowns |
| **7 — Reports & Dashboard** | Analytics, graphs, PDF/Excel export | All Section 3 dashboard numbers reconcile against raw ledger data |
| **8 — Security & Compliance Pass** | Full Section 12 checklist + Section 13 CA review | All checklist boxes ticked, `npm audit` clean, pen-test pass |
| **9 — Polish/Launch** | Dark mode, animations, onboarding, backup/restore UI | Store-ready build, crash-free rate > 99% in beta |

---

## 16. Testing Strategy

- Unit tests for every Section 7 algorithm (invoice numbering race conditions, GST rounding edge cases, payment status derivation, cash mismatch math).
- Integration tests per API module against a test MongoDB instance.
- Offline simulation tests: force airplane mode mid-write, verify sync queue recovers with zero data loss.
- Query AI regression suite: run the full intent table (10.2) as test cases on every change.
- Security tests: OWASP ZAP scan + manual RBAC boundary tests (staff cannot access another shop's data) before each release.

---

## 17. Definition of Done (per module, checked in Loop step 6)

- [ ] Matches schema in Section 6 exactly (field names, types).
- [ ] Business logic matches Section 7 formulas exactly — no shortcuts.
- [ ] Relevant Section 12 security items applied and verified.
- [ ] Offline write + sync verified for this module's data.
- [ ] Unit + integration tests passing, coverage on core logic.
- [ ] UI matches design tokens in Section 11 (light + dark mode both checked).
- [ ] Audit log entries created for financial writes.

---

## 18. Roadmap (Post-v1, do not build in Phase 0–9)

Multi-shop/branch management · Employee attendance & performance · Customer self-service portal · Inventory module · Loyalty/coupon system · SMS integration · Barcode/QR · AI measurement suggestions, delivery prediction, and sales forecast (these WOULD require an external AI API and are explicitly out of scope for the no-API Query AI in Section 10 — evaluate separately as an opt-in premium add-on).