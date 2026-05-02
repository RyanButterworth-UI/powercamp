import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { campers } from '../src/db/schema';

const TEST_EMAIL = 'ryanbutterworthza@gmail.com';
const TEST_FIRST = 'Ryan';
const TEST_LAST = 'Butterworth';
const TEST_SOURCE = 'seed-test';

// Use last year's tag so this user shows up in the lookup search the way
// imported 2025 campers do — no mixing with the live current-year flow.
const TARGET_YEAR = 2025;

async function main() {
  console.log(`Seeding test user (${TEST_FIRST} ${TEST_LAST} <${TEST_EMAIL}>)…`);

  const deleted = await db
    .delete(campers)
    .where(and(eq(campers.parentEmail, TEST_EMAIL), eq(campers.source, TEST_SOURCE)))
    .returning({ id: campers.id });
  if (deleted.length > 0) {
    console.log(`Removed ${deleted.length} existing seed-test row(s).`);
  }

  const [inserted] = await db
    .insert(campers)
    .values({
      year: TARGET_YEAR,
      source: TEST_SOURCE,
      firstName: TEST_FIRST,
      lastName: TEST_LAST,
      parentEmail: TEST_EMAIL,
      email: TEST_EMAIL,
      parentName: 'Test Parent',
      parentPhone: '0820000000',
      camperCell: '0820000001',
      gender: 'Male',
      age: '16',
      grade: '11',
      church: 'Test Church',
      tshirt: 'M',
      friends: [],
      medical: '',
      generalInfo: 'Seeded for magic-link testing',
      dob: '2009-01-01',
    })
    .returning({ id: campers.id });

  console.log(`✓ Inserted test user with id=${inserted.id}.`);
  console.log(`  Search the UI for "${TEST_FIRST}" or "${TEST_LAST}" to find this row.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
