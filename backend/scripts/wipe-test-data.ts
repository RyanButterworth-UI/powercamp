import 'dotenv/config';
import { ne, sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { campers, leaders } from '../src/db/schema';
import { clearSheetBelowHeader } from '../src/services/sheets';

const args = process.argv.slice(2);
const CONFIRM = args.includes('--yes');
const INCLUDE_SHEETS = args.includes('--include-sheets');

async function counts() {
  const [{ campersCount }] = await db
    .select({ campersCount: sql<number>`count(*)::int` })
    .from(campers)
    .where(ne(campers.source, 'import-2025'));
  const [{ leadersCount }] = await db
    .select({ leadersCount: sql<number>`count(*)::int` })
    .from(leaders);
  return { campersCount, leadersCount };
}

async function main() {
  const before = await counts();
  console.log('Wipe target:');
  console.log(`  campers (NOT source='import-2025'): ${before.campersCount} rows`);
  console.log(`  leaders (all): ${before.leadersCount} rows`);
  if (INCLUDE_SHEETS) {
    console.log(`  sheets: clear 'Registrations' and 'Leaders' tabs (rows 2+)`);
  }

  if (!CONFIRM) {
    console.log('\nDRY RUN — re-run with --yes to actually wipe.');
    console.log('Add --include-sheets to also clear the sheet tabs (header row preserved).');
    process.exit(0);
  }

  const camperDeleted = await db
    .delete(campers)
    .where(ne(campers.source, 'import-2025'))
    .returning({ id: campers.id });
  console.log(`Deleted ${camperDeleted.length} camper rows.`);

  const leaderDeleted = await db.delete(leaders).returning({ id: leaders.id });
  console.log(`Deleted ${leaderDeleted.length} leader rows.`);

  if (INCLUDE_SHEETS) {
    try {
      await clearSheetBelowHeader('Registrations');
      console.log("Cleared Registrations sheet (rows 2+).");
    } catch (err) {
      console.error('Failed to clear Registrations sheet:', err);
    }
    try {
      await clearSheetBelowHeader('Leaders');
      console.log("Cleared Leaders sheet (rows 2+).");
    } catch (err) {
      console.error('Failed to clear Leaders sheet:', err);
    }
  }

  console.log('\nDone. The 2025 import rows are untouched.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
