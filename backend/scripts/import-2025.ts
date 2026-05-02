import 'dotenv/config';
import path from 'path';
import * as XLSX from 'xlsx';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { campers } from '../src/db/schema';
import { mapCamperRow, IMPORT_2025_SOURCE } from '../src/lib/import-mapper';

const TARGET_YEAR = 2025;
const SHEET_NAME = 'Campers';

const filePath =
  process.argv[2] ?? path.resolve(__dirname, '../../assets/Power Camp Admin 2025.xlsx');

async function main() {
  console.log(`Reading ${filePath}…`);
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Sheet '${SHEET_NAME}' not found. Sheets: ${wb.SheetNames.join(', ')}`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  console.log(`Read ${rows.length} data rows from '${SHEET_NAME}'.`);

  const inserts: (typeof campers.$inferInsert)[] = [];
  const skipped: { row: number; reason: string }[] = [];

  rows.forEach((row, i) => {
    const result = mapCamperRow(row, TARGET_YEAR);
    if (result.skip) {
      skipped.push({ row: i + 2, reason: result.reason });
    } else {
      inserts.push(result.value);
    }
  });

  console.log(`Mapping result: ${inserts.length} importable, ${skipped.length} skipped.`);
  if (skipped.length > 0) {
    console.log('Skipped rows:');
    skipped.slice(0, 10).forEach((s) => console.log(`  - row ${s.row}: ${s.reason}`));
    if (skipped.length > 10) console.log(`  … and ${skipped.length - 10} more.`);
  }

  console.log(
    `\nClearing existing rows where year=${TARGET_YEAR} AND source='${IMPORT_2025_SOURCE}'…`
  );

  await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(campers)
      .where(and(eq(campers.year, TARGET_YEAR), eq(campers.source, IMPORT_2025_SOURCE)))
      .returning({ id: campers.id });
    console.log(`Deleted ${deleted.length} existing import rows.`);

    if (inserts.length > 0) {
      const inserted = await tx.insert(campers).values(inserts).returning({ id: campers.id });
      console.log(`Inserted ${inserted.length} campers.`);
    }
  });

  const uniqueParents = new Set(inserts.map((i) => i.parentEmail));
  console.log(
    `\n✓ Done. Imported ${inserts.length} campers (${uniqueParents.size} unique parent emails) for year ${TARGET_YEAR}.`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
