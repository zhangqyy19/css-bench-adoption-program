# Van Cortlandt Park Bench Adoption Program

Van Cortlandt Park has more than 500 adoptable benches and no single source of truth for which are adopted, by whom, for how long, and which are still available. This app is that source of truth. Anyone can:

- **Browse benches** and see each one's status, adopter, and term.
- **Adopt a bench** for a chosen number of months or years. There is no payment step, per the brief.

## Getting started

Requires Node 20 or later.

```bash
npm install
npm run seed     # creates data/benches.db with 520 benches and sample adoptions
npm run dev      # http://localhost:3000
```

```bash
npm test         # unit and service tests
```


## Features

### Public

- **Bench directory** (home page)
  - Summary counts: total, adopted, available, expiring within 60 days.
  - Table of benches: code, area, status, adopter, term, time remaining.
  - Filter by status and area, search by bench code or adopter name, paginated.
- **Bench detail**
  - Location, current adoption (who, dedication, start, end, time remaining), upcoming reserved terms, past adopters.
  - Shows "Available now" or "Available from <date>".
- **Adopt form** on the bench detail page
  - Name, email, public display name with an "adopt anonymously" option, optional dedication, start date, term length.
  - Presets for 6 months, 1, 2, 3 and 5 years, or any number of months from 1 to 120.
  - Live preview of the resulting date range. A successful adoption shows a confirmation with a reference number.
- **Map view**: benches as markers coloured by status.


## Stack

- **Next.js (App Router) + TypeScript**: one project and one command to run; server-rendered pages plus API routes.
- **SQLite** via `better-sqlite3`: nothing for a reviewer to install or configure, with real SQL and real transactions.
- **Zod** for validation, shared by the form and the API.
- **Vitest** for tests.
- **Leaflet + OpenStreetMap** for the map view.

## Project structure

```
src/
  app/
    page.tsx                     directory
    benches/[id]/page.tsx        detail + adopt form
    map/page.tsx                 map view
    admin/page.tsx               staff page
    api/                         route handlers
  lib/
    db.ts                        connection and schema bootstrap
    schema.sql
    dates.ts                     month arithmetic, "today" in park time, overlap test
    benches.ts                   read queries and derived status
    adoptions.ts                 adopt() and cancel(): the transactional core
    validation.ts                zod schemas
  components/
scripts/seed.ts                  deterministic seed data
tests/
data/                            SQLite file, gitignored
```


## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/benches?status=&area=&q=&page=` | Paginated list with derived status and current adopter |
| GET | `/api/benches/:id` | Bench with current, upcoming and past adoptions (public fields only) |
| POST | `/api/benches/:id/adoptions` | Adopt. `201` on success, `400` invalid input, `404` unknown bench, `409` dates overlap |
| GET | `/api/stats` | Summary counts |
| POST | `/api/admin/adoptions/:id/cancel` | Staff only |

## Design

### The core idea

**An adoption is a date range on a bench. Availability is derived from those ranges and never stored.**

A bench is adopted today if a non-cancelled adoption covers today, and available otherwise. There is no status column on the bench that can drift out of sync, and no nightly job to expire adoptions. When an end date passes, the bench is available the next time anyone looks.

The one rule the system must never break is that **two adoptions of the same bench cannot overlap**. Everything else is presentation.

### Data model

```sql
CREATE TABLE benches (
  id          INTEGER PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,     -- human-facing, e.g. "VCP-0142"
  area        TEXT NOT NULL,            -- "Parade Ground", "Putnam Trail", ...
  description TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  retired     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE adoptions (
  id           INTEGER PRIMARY KEY,
  bench_id     INTEGER NOT NULL REFERENCES benches(id),
  donor_name   TEXT NOT NULL,           -- private
  donor_email  TEXT NOT NULL,           -- private
  display_name TEXT NOT NULL,           -- public; "Anonymous" if the donor opts out
  dedication   TEXT,                    -- public, max 140 characters
  start_date   TEXT NOT NULL,           -- YYYY-MM-DD, inclusive
  end_date     TEXT NOT NULL,           -- YYYY-MM-DD, exclusive
  term_months  INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'cancelled'
  created_at   TEXT NOT NULL,
  CHECK (end_date > start_date)
);
```

"Expired" is not a status. It means `end_date <= today` and is computed in queries. Expired adoptions are kept as history.

### Enforcing no overlap

Two layers, because this is the rule that matters.

1. **Service layer.** `adopt()` runs in a `BEGIN IMMEDIATE` transaction that checks for an overlapping active adoption (`start_date < :new_end AND end_date > :new_start`) and then inserts. SQLite serialises writers, so two simultaneous requests for the same bench cannot both pass the check. The loser gets a `409` and a message giving the next available date.
2. **Database trigger.** A `BEFORE INSERT` trigger aborts on overlap, which covers any script or manual edit that bypasses the service.

### Assumptions

| Topic | Assumption | Why |
|---|---|---|
| Users | Two audiences: the public (browse, adopt) and park staff (oversee). No donor accounts. | Accounts add hours of work and friction for a one-time action. |
| Confirmation | An adoption is active as soon as the form is submitted. | There is no payment step to gate it. In production, payment or staff approval would sit here, and the `status` field leaves room for a `pending` state. |
| Term | The donor picks a start date (default today) and a length in whole months. | The brief says "a specific number of months/years". |
| Future adoptions | A bench that is adopted now can be reserved for a term that starts after the current one ends. | It falls out of the date-range model at no cost, and it is what a waiting donor would want. |
| Privacy | The public sees a donor-chosen display name (or "Anonymous") and an optional dedication. Email is collected but shown only to staff. | "By whom" has to be public. Contact details must not be. |
| Dates | Calendar dates in park-local time (America/New_York). Ranges are half-open, `[start, end)`, with `end = start + N months`, clamped at month end (Jan 31 + 1 month = Feb 28). | Avoids time zone and off-by-one bugs. Back-to-back adoptions share a boundary date without overlapping. |
| Bench data | No real inventory was provided, so the seed script creates 520 synthetic benches across real park areas with plausible coordinates. | Shows the system at realistic scale. A real inventory would replace the seed script. |
| Scale | Hundreds of benches, low write volume, occasional contention on a popular bench. | Drives the database choice. |

### Decisions and trade-offs

- **SQLite over Postgres.** Zero setup for reviewers, and a single-writer database makes the overlap check trivially safe. The cost is that it does not suit serverless hosting or multiple app servers. See "Next steps" for the Postgres design.
- **Raw SQL over an ORM.** Two tables do not justify Prisma, and the interesting queries (derived status, overlap) are clearer in SQL.
- **One Next.js app over a separate frontend and backend.** One process to run and no benefit to splitting at this size. The API routes still exist so the behaviour is explicit, testable and usable by other clients. Pages call the same service functions directly.
- **Server-side filtering and pagination.** 500 rows would fit in the browser, but adopter search and derived status belong in SQL, and this keeps working at 5,000.
- **Shared-token admin.** A stand-in for real authentication, enough to show that private donor data is separated from public data.
- **Seed data covers every state**: active, expired, expiring soon, reserved for the future, back-to-back terms, anonymous donors, a retired bench.

### Testing approach

Effort goes where bugs would be expensive.

- `dates.ts`: month arithmetic including month-end clamping and leap years; the overlap test including the shared-boundary case.
- `adoptions.ts` against an in-memory database: success, overlap rejected, back-to-back accepted, cancelled adoptions free their dates, retired bench rejected, trigger fires when the service is bypassed.
- One API test for status codes on the adopt route.

### Out of scope

Payments, donor accounts, confirmation and renewal emails, moderation of dedication text, importing the park's existing records, first refusal on renewal for the current adopter.

### Next steps for production

- **Postgres** with a `daterange` column and an exclusion constraint, `EXCLUDE USING gist (bench_id WITH =, term WITH &&)`, which enforces no-overlap declaratively across any number of app servers.
- Real staff authentication, and email verification for donors.
- A payment or approval step using a `pending` status with a short hold, so a bench cannot be taken mid-checkout.
- Import of existing adoption records with a report of conflicts found in the legacy data. This is likely the hardest real-world part of the project.
- Renewal reminders and first refusal for the current adopter.
- Moderation of dedications and rate limiting on the adopt endpoint.
