// The database schema, applied on every connection (everything is IF NOT EXISTS).
// Kept as a string rather than a .sql file so serverless bundles always include it.
export const SCHEMA = `
-- Benches and adoptions. Dates are YYYY-MM-DD text in park-local time and
-- adoption ranges are half-open: [start_date, end_date).

CREATE TABLE IF NOT EXISTS benches (
  id          INTEGER PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,          -- human-facing, e.g. "VCP-0142"
  area        TEXT NOT NULL,
  description TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  style       TEXT NOT NULL CHECK (style IN ('worlds-fair', 'concrete')),
  length_ft   INTEGER NOT NULL CHECK (length_ft IN (4, 8)),
  sides       INTEGER NOT NULL CHECK (sides IN (1, 2)),   -- plaque positions
  retired     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS adoptions (
  id           INTEGER PRIMARY KEY,
  bench_id     INTEGER NOT NULL REFERENCES benches(id),
  side         INTEGER NOT NULL CHECK (side IN (1, 2)),
  donor_name   TEXT NOT NULL,                -- private
  donor_email  TEXT NOT NULL,                -- private
  honoree      TEXT,                         -- private
  notes        TEXT,                         -- private
  display_name TEXT NOT NULL,                -- public
  dedication   TEXT,                         -- public: the plaque text
  start_date   TEXT NOT NULL,                -- inclusive
  end_date     TEXT NOT NULL,                -- exclusive
  term_months  INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at   TEXT NOT NULL,
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_adoptions_bench ON adoptions (bench_id, side, status, start_date);

-- Last line of defence for the one rule that matters: no two active adoptions
-- of the same side of a bench may overlap. The service checks this inside a
-- write transaction; the trigger catches anything that bypasses the service.
CREATE TRIGGER IF NOT EXISTS adoptions_no_overlap
BEFORE INSERT ON adoptions
WHEN NEW.status = 'active'
BEGIN
  SELECT RAISE(ABORT, 'adoption overlaps an existing adoption')
  FROM adoptions
  WHERE bench_id = NEW.bench_id
    AND side = NEW.side
    AND status = 'active'
    AND start_date < NEW.end_date
    AND end_date > NEW.start_date;
END;
`;
