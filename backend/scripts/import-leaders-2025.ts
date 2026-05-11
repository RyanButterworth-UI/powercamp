import 'dotenv/config';
import path from 'path';
import * as XLSX from 'xlsx';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { leaders } from '../src/db/schema';

// Imports the 2025 leader roster from the legacy spreadsheet export
// (`assets/Power Camp Admin 2025 - Leaders.csv`). Idempotent — wipes
// every existing year=2025 leader row before re-inserting, so running
// the script a second time after a column tweak just replays cleanly.
//
// Run:  cd backend && npm run import:leaders-2025
//                  ^ optional override: pass a path as the first arg.

const TARGET_YEAR = 2025;

const DEFAULT_PATH = path.resolve(
  __dirname,
  '../../assets/Power Camp Admin 2025 - Leaders.csv'
);

interface CsvRow {
  'First Name'?: string;
  'Last Name'?: string;
  Cell?: string | number;
  Gender?: string;
  Email?: string;
  Age?: string;
  Grade?: string;
  "Parent's Name"?: string;
  "Parent's Phone"?: string | number;
  "Parent's Email"?: string;
  Church?: string;
  'T-shirt'?: string;
}

function trimOr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

// Excel/CSV exports routinely strip the leading zero from SA cell numbers
// (which start with `0` but are 10 digits total — `0828517405` becomes the
// number 828517405). Re-pad so the value matches what the admin would
// expect to see in the table.
function normalizePhone(v: unknown): string | undefined {
  const s = trimOr(v);
  if (!s) return undefined;
  const digits = s.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.length === 9 && !digits.startsWith('0')) return `0${digits}`;
  return digits;
}

function normalizeEmail(v: unknown): string | undefined {
  return trimOr(v)?.toLowerCase();
}

async function main() {
  const filePath = process.argv[2] ?? DEFAULT_PATH;
  console.log(`Reading ${filePath}…`);

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error(`No sheets in ${filePath}.`);
  }

  const rows = XLSX.utils.sheet_to_json<CsvRow>(sheet, { defval: '' });
  console.log(`Read ${rows.length} rows.`);

  // The legacy CSV has `Staff` and `Team Leaders` section-header rows
  // and a few blank separators. Drop anything that doesn't have both a
  // first name and an email — those are the only two fields we need.
  const valid: CsvRow[] = [];
  const skipped: { row: number; reason: string }[] = [];
  rows.forEach((r, i) => {
    const firstName = trimOr(r['First Name']);
    const email = trimOr(r.Email);
    if (!firstName && !email) {
      // Truly empty row — silently skip.
      return;
    }
    if (!firstName) {
      skipped.push({ row: i + 2, reason: 'missing first name' });
      return;
    }
    if (!email) {
      // The 'Staff' / 'Team Leaders' header rows land here.
      skipped.push({ row: i + 2, reason: `section header or no email (${firstName})` });
      return;
    }
    valid.push(r);
  });

  console.log(`  ${valid.length} importable rows after filtering.`);
  if (skipped.length > 0) {
    console.log('  Skipped:');
    for (const s of skipped) console.log(`    row ${s.row}: ${s.reason}`);
  }

  // Idempotent: wipe + reinsert ALL year=2025 leaders. The historical
  // roster is small (~30) and there's no `source` column on leaders to
  // narrow this down — full reset is the simplest contract.
  const deleted = await db
    .delete(leaders)
    .where(eq(leaders.year, TARGET_YEAR))
    .returning({ id: leaders.id });
  if (deleted.length > 0) {
    console.log(`Removed ${deleted.length} existing year=${TARGET_YEAR} leaders.`);
  }

  const toInsert: (typeof leaders.$inferInsert)[] = valid.map((r) => ({
    year: TARGET_YEAR,
    firstName: trimOr(r['First Name'])!,
    lastName: trimOr(r['Last Name']) ?? '',
    email: normalizeEmail(r.Email)!,
    cell: normalizePhone(r.Cell),
    gender: trimOr(r.Gender),
    age: trimOr(r.Age),
    grade: trimOr(r.Grade),
    church: trimOr(r.Church),
    tshirt: trimOr(r['T-shirt'])?.toLowerCase(),
    parentName: trimOr(r["Parent's Name"]),
    parentPhone: normalizePhone(r["Parent's Phone"]),
    parentEmail: normalizeEmail(r["Parent's Email"]),
    // Historical roster — these all served at camp last year, mark them
    // as already-approved so they show up correctly on the Leaders tab
    // without Neil needing to re-approve.
    status: 'approved',
    approvedByNeil: true,
    approvedAt: new Date(`${TARGET_YEAR}-08-22T00:00:00Z`),
  }));

  if (toInsert.length > 0) {
    await db.insert(leaders).values(toInsert);
  }

  console.log(`✓ Imported ${toInsert.length} leaders for year ${TARGET_YEAR}.`);
  console.log(`  Visible in admin under the ${TARGET_YEAR} year tab on the Leaders page.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Leader import failed:', err);
  process.exit(1);
});
