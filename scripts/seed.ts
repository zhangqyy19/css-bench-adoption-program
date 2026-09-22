import { todayInPark } from "../src/lib/dates";
import { createDb, type Db } from "../src/lib/db";
import { generateSeed } from "../src/lib/seed-data";
import type { AdoptionRecord } from "../src/lib/service";
import type { Bench } from "../src/lib/types";

// Loads the demo benches and adoptions.
//
//   npm run seed            local file database (or DATABASE_URL if set)
//   npm run seed -- --force wipe and reload a database that already has data
//
// Refuses to touch a non-empty database without --force, so the production
// database cannot be reset by accident.

const CHUNK = 200;

async function insertBenches(db: Db, benches: Bench[]) {
  for (let i = 0; i < benches.length; i += CHUNK) {
    await db.batch(
      benches.slice(i, i + CHUNK).map((b) => ({
        sql: `INSERT INTO benches (id, code, area, description, lat, lng, style, length_ft, sides, retired)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [b.id, b.code, b.area, b.description, b.lat, b.lng, b.style, b.lengthFt, b.sides, b.retired ? 1 : 0],
      })),
      "write",
    );
  }
}

async function insertAdoptions(db: Db, adoptions: AdoptionRecord[]) {
  for (let i = 0; i < adoptions.length; i += CHUNK) {
    await db.batch(
      adoptions.slice(i, i + CHUNK).map((a) => ({
        sql: `INSERT INTO adoptions
                (id, bench_id, side, donor_name, donor_email, honoree, notes, display_name, dedication,
                 start_date, end_date, term_months, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          a.id, a.benchId, a.side, a.donorName, a.donorEmail, a.honoree, a.notes, a.displayName, a.dedication,
          a.startDate, a.endDate, a.termMonths, a.status, a.createdAt,
        ],
      })),
      "write",
    );
  }
}

export async function seed(db: Db, { force = false, today = todayInPark() } = {}) {
  const existing = Number((await db.execute("SELECT count(*) AS n FROM benches")).rows[0].n);
  if (existing > 0 && !force) {
    throw new Error(`Database already has ${existing} benches. Re-run with --force to replace them.`);
  }
  if (existing > 0) {
    await db.executeMultiple("DELETE FROM adoptions; DELETE FROM benches;");
  }

  const { benches, adoptions } = generateSeed(today);
  await insertBenches(db, benches);
  await insertAdoptions(db, adoptions); // the overlap trigger checks every row
  return { benches: benches.length, adoptions: adoptions.length };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:data/benches.db";
  const db = await createDb(url, process.env.DATABASE_AUTH_TOKEN);
  try {
    const counts = await seed(db, { force: process.argv.includes("--force") });
    console.log(`Seeded ${counts.benches} benches and ${counts.adoptions} adoptions into ${url}`);
  } finally {
    db.close();
  }
}

// run only when executed directly, so tests can import seed()
if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
