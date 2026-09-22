# Van Cortlandt Park Bench Adoption Program

Van Cortlandt Park has more than 500 adoptable benches and no single source of truth for which are adopted, by whom, for how long, and which are still available. This app is that source of truth.

**Live site:** https://bench-adoption-program-iota.vercel.app

Anyone can:

- **Browse benches** in a list or on a map and see each one's status, adopter, plaque text and term.
- **Adopt a bench** (or one side of an 8 ft bench) for a chosen term, with the details the Alliance's inquiry form asks for. There is no payment step, per the brief.

Park staff can sign in to see donor contact details, cancel adoptions and export a CSV.

Program details (prices, the ten-year term, plaque rules, contact details) come from [vancortlandt.org/bench](https://vancortlandt.org/bench/). Bench locations and donors are sample data.

## Getting started

Requires Node 20 or later. No database server to install: development uses a local SQLite file.

```bash
npm install
npm run seed      # creates data/benches.db with 520 benches and ~600 adoptions
npm run dev       # http://localhost:3000
```

```bash
npm test          # 31 tests: date maths, adoption rules, seed data, rate limit
npm run typecheck
npm run lint
```

To enable the staff page at `/admin`, put `ADMIN_TOKEN=any-secret-string` in `.env.local` (see `.env.example`).

`npm run seed -- --force` resets the demo data.

## What was built

| Page | What it does |
|---|---|
| `/` | Introduction to the program, the two options and prices, plaque and term rules, FAQ, contact. |
| `/benches` | Every bench with status, adopter, term and time remaining. Filter by status and area, search by bench code, area or adopter. Paginated; filters live in the URL so views are shareable. |
| `/benches/:id` | One bench: each side's current adopter and plaque text, upcoming reservations, past adopters, a map, and the adoption form. |
| `/map` | All benches as markers coloured by status. Click through to a bench. |
| `/admin` | Staff only. Every adoption with donor name, email, honoree and notes; cancel; CSV export. |

The adoption form collects name, email, the name to show publicly (or anonymous), who the bench honours, the plaque text (up to 7 lines and 300 characters, as the Alliance specifies), a start date, a term (10 years by default), questions for staff, and the 6–8 week timeline acknowledgement. Validation runs in the browser for instant feedback and again on the server.

### API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/benches/:id/adoptions` | Adopt. `201` with a receipt; `400` invalid input (per-field messages); `404` unknown or retired bench; `409` the dates overlap, with the next available date; `429` rate limited. |
| POST | `/api/admin/adoptions/:id/cancel` | Staff. Cancel an adoption. |
| GET | `/api/admin/export` | Staff. CSV of all adoptions. |

Pages read through the same service functions directly rather than over HTTP.

## Stack

- **Next.js 16 (App Router) + TypeScript.** One process serves the pages and the API.
- **SQLite via libSQL** (`@libsql/client`). A local file in development, [Turso](https://turso.tech) in production; same driver, same SQL.
- **Zod** for validation, shared by the form and the API.
- **Leaflet** with OpenStreetMap tiles for the maps.
- **Tailwind CSS** with a small custom palette; EB Garamond via `next/font`.
- **Vitest** for tests.

## Project structure

```
src/
  app/
    page.tsx                       introduction
    benches/page.tsx               directory
    benches/[id]/page.tsx          bench detail + adoption form
    map/page.tsx                   map
    admin/                         staff page and sign-in action
    api/benches/[id]/adoptions/    the adopt endpoint
    api/admin/                     cancel and CSV export
  lib/
    schema.ts                      tables, index and the no-overlap trigger
    db.ts                          connection (file locally, Turso in production)
    service.ts                     all reads and writes; takes db and "today" explicitly
    data.ts                        service bound to the app's connection and today's date
    dates.ts                       month arithmetic, park-local "today", overlap test
    validation.ts                  zod schemas (form and API)
    seed-data.ts                   deterministic demo data generator
    rate-limit.ts, admin-auth.ts
  components/
scripts/seed.ts                    loads demo data; refuses to overwrite without --force
tests/
```

Pages and route handlers stay thin. The rules live in `src/lib/service.ts`, which is tested against an in-memory database with a fixed date.

## Design

### The core idea

**An adoption is a date range on one side of a bench. Availability is derived from those ranges and never stored.**

A side is adopted today if an active adoption covers today. A bench is available if any of its sides is free. There is no status column that can drift out of sync and no nightly job to expire adoptions: when an end date passes, the bench shows as available the next time anyone looks. Expired adoptions stay as history.

The one rule the system must never break: **two active adoptions of the same side of a bench cannot overlap.**

### Data model

```sql
benches   (id, code, area, description, lat, lng, style, length_ft, sides, retired)
adoptions (id, bench_id, side, donor_name, donor_email, honoree, notes,    -- private
           display_name, dedication,                                        -- public
           start_date, end_date, term_months, status, created_at)
```

Dates are `YYYY-MM-DD` strings in park-local time (America/New_York). Ranges are half-open, `[start, end)`, with `end = start + N months`, clamped at month end (Jan 31 + 1 month = Feb 28). Half-open ranges mean back-to-back terms share a boundary date without overlapping, and text dates in this format compare correctly without any time zone handling.

An 8 ft bench has two plaque positions, adopted separately, which is how the Alliance runs it. A 4 ft bench has one. The rule above is per side.

### Enforcing no overlap

Two layers, because this is the rule that matters:

1. **Service layer.** `createAdoption` opens a write transaction, which takes the database's write lock, then checks for an overlapping active adoption on that side and inserts. Two simultaneous requests for the same side cannot both pass the check; the loser gets a `409` with the next available date.
2. **Database trigger.** A `BEFORE INSERT` trigger aborts any overlapping active row. It protects against scripts, manual edits and future bugs that bypass the service. The tests confirm it fires when the service is bypassed.

### Private and public data

Donor name, email, honoree and notes are private. The service exposes two shapes: `PublicAdoption`, which has none of those fields, and the staff view. Public pages and the adopt API only ever receive `PublicAdoption`, so a page cannot leak contact details by accident. A test checks the receipt has no private fields.

### Assumptions

| Topic | Assumption | Why |
|---|---|---|
| Users | The public browses and adopts; park staff oversee. No donor accounts. | Accounts add friction for a once-a-decade action. |
| Confirmation | An adoption is recorded as soon as the form is submitted. | There is no payment step to gate it. In production a `pending` status would sit between submission and payment. |
| Term | Any whole number of months up to 120; the default is 10 years. | The brief says "a specific number of months/years"; the Alliance's standard is ten years. |
| Reservations | A bench that is adopted now can be reserved from the day the current term ends. | It falls out of the date-range model at no cost, and it is what a waiting donor would want. |
| Plaque text | Required, up to 7 lines and 300 characters. | Taken from the Alliance's inquiry form. |
| Bench data | No real inventory was provided, so a deterministic generator makes 520 benches across real park areas. | Shows the system at realistic scale. A real inventory would replace the generator; nothing else changes. |
| Staff access | A shared token, entered once, kept in an httpOnly cookie. | Enough to demonstrate the public/private split. Real staff logins are a next step. |

### Decisions and trade-offs

- **SQLite (libSQL) over Postgres.** Nothing for a reviewer to install, and the same driver talks to Turso in production so the hosted app runs the same SQL and the same trigger. Postgres would allow an `EXCLUDE` constraint that enforces no-overlap declaratively; at this scale the trigger does the same job.
- **Status derived in code, not SQL.** With hundreds of benches and a few hundred live adoptions, the live set loads in two queries and the per-side derivation lives in one TypeScript function used by every page. At tens of thousands of benches the filtering and pagination would move into SQL.
- **The URL is the state for browsing.** Filters and pagination are query parameters rendered on the server. Views are shareable, the back button works, and there is no client-side data store.
- **No ORM.** Two tables and a handful of queries are clearer as SQL.
- **In-memory rate limit** of five successful adoptions per hour per connection. Per server instance, so it blunts a script rather than stopping a determined attacker; a shared store would be the production answer.
- **Seed data covers every state** the UI must handle: active, ending soon, expired, reserved for the future, back-to-back terms, both sides of an 8 ft bench, anonymous donors, retired benches.

### Testing

Effort went where mistakes would be expensive:

- Date maths: month-end clamping, leap years, half-open overlap, park time zone.
- Adoption rules on an in-memory database with a fixed "today": success, overlap rejected with the right next date, back-to-back accepted, gaps found, sides independent, past dates and retired benches rejected, private fields kept off public records, cancellation frees the dates, adoptions expire with time.
- The trigger blocks a bypassing insert and allows the other side.
- The seed generator is deterministic, covers every state, loads through the trigger, and refuses to overwrite without `--force`.

### Out of scope

Payments, donor accounts, confirmation and renewal emails, moderation of plaque text, importing the park's existing records, first refusal on renewal for the current adopter, the "install a new bench" option (which has no fixed location to pick).

### Next steps for production

- Real staff authentication.
- A `pending` status between submission and payment, with a short hold so a bench cannot be taken mid-checkout.
- Importing existing adoption records, with a report of conflicts found in the legacy data. Likely the hardest real-world part.
- A shared rate-limit store, and email verification for donors.
- Renewal reminders and first refusal for the current adopter.

## Deployment

The app runs on Vercel with the database on Turso. Both free tiers.

1. Create a Turso database: `turso db create bench-adoption`, then `turso db show bench-adoption --url` and `turso db tokens create bench-adoption`.
2. Seed it once: `DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run seed`.
3. Create a Vercel project and set `DATABASE_URL`, `DATABASE_AUTH_TOKEN` and `ADMIN_TOKEN` (`vercel env add`).
4. Deploy with `vercel --prod`, or connect the GitHub repo in the Vercel dashboard so every push to `main` redeploys.
