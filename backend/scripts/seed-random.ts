import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { campers, leaders } from '../src/db/schema';
import { env } from '../src/env';

// Wipes the current camp year's campers + all leaders, then seeds 20 of each
// with realistic randomized data so the admin views (search, filters, year
// tabs, payment / consent pills, leader status pills) have something to chew
// on. The 2025 import rows are left untouched — they live under year=2025.
//
//   npm run seed:random          # dry run (prints what it would do)
//   npm run seed:random -- --yes # actually wipe + seed

const args = process.argv.slice(2);
const CONFIRM = args.includes('--yes');
const COUNT = 20;

const FIRST_NAMES = [
  'Olivia', 'Liam', 'Aiden', 'Sophia', 'Noah', 'Emma', 'Mason', 'Ava',
  'Lucas', 'Mia', 'Ethan', 'Isabella', 'Caleb', 'Charlotte', 'Joel',
  'Amelia', 'Daniel', 'Harper', 'Benjamin', 'Layla', 'Joshua', 'Zoe',
  'Nathan', 'Aria', 'Samuel', 'Lily', 'David', 'Grace', 'Jacob', 'Ruth',
];

const LAST_NAMES = [
  'Butterworth', 'Pretorius', 'Steyn', 'Hing', 'Cable', 'Wright',
  'Smith', 'Roberts', 'Howard', 'Mokoena', 'Naidoo', 'van der Merwe',
  'Botha', 'Ndlovu', 'Khumalo', 'Pillay', 'Brown', 'Davies', 'Adams',
  'Phillips', 'Mostert', 'Calitz', 'Brink', 'Visser', 'Jordaan',
];

const CHURCHES = [
  'Hope Bedfordview',
  'Brackenhurst Baptist',
  'Germiston Baptist',
  'Rosebank Union',
  'Hatfield Christian Church',
  'Christ Church Midrand',
  'Doxa Deo',
  'Fountain Vineyard',
];

const TSHIRT_SIZES = ['small', 'medium', 'large', 'xlarge'];

const MEDICAL_NOTES = [
  '', '', '', '',
  'Mild asthma — uses inhaler as needed.',
  'Peanut allergy.',
  'No known conditions.',
  'Wears glasses.',
];

const APPLICATION_NOTES = [
  'I helped at camp last year and want to come back.',
  'Youth leader at my home church for two years.',
  'I love working with teens and want to give back.',
  'Studying theology, want practical youth-ministry experience.',
  'Friend recommended me — I think this would stretch my faith.',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p: number): boolean {
  return Math.random() < p;
}

function randomCellNumber(): string {
  // SA mobile prefixes: 06/07/08 + 8 digits — matches the FE Validators.pattern.
  const prefix = pick(['06', '07', '08']);
  let rest = '';
  for (let i = 0; i < 8; i++) rest += Math.floor(Math.random() * 10);
  return prefix + rest;
}

function randomDob(forAge: number): string {
  // Ballpark — pick a year that puts the camper at the desired age this camp.
  const year = env.CAMP_YEAR - forAge;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomCamper(i: number): typeof campers.$inferInsert {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const ageYears = 13 + Math.floor(Math.random() * 5); // 13–17
  const grade = String(ageYears - 5); // grade 8–12 ish

  // Slug helps keep emails unique even when two campers share a first/last
  // name — the index `i` is appended so a re-seed never collides with itself.
  const slug = `${firstName}.${lastName}.${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
  const parentEmail = `parent.${slug}@example.com`;
  const camperEmail = chance(0.7) ? `camper.${slug}@example.com` : null;

  // ~70% have completed consent, ~50% have paid. Independent rolls so we get
  // every combination — paid+consented, consented-not-paid, neither, etc.
  const consented = chance(0.7);
  const paid = chance(0.5);

  return {
    year: env.CAMP_YEAR,
    source: 'seed-random',
    firstName,
    lastName,
    dob: randomDob(ageYears),
    gender: pick(['Male', 'Female']),
    age: String(ageYears),
    grade,
    email: camperEmail,
    camperCell: chance(0.6) ? randomCellNumber() : null,
    medical: pick(MEDICAL_NOTES),
    tshirt: pick(TSHIRT_SIZES),
    church: pick(CHURCHES),
    generalInfo: chance(0.2) ? 'Vegetarian.' : '',
    friends: chance(0.5) ? [pick(FIRST_NAMES), pick(FIRST_NAMES)] : [],
    parentName: `${pick(FIRST_NAMES)} ${lastName}`,
    parentPhone: randomCellNumber(),
    parentEmail,
    consentGeneral: consented ? 'accept' : null,
    consentLocation: consented ? 'accept' : null,
    consentRisk: consented ? 'accept' : null,
    consentPowerCamp: consented ? 'accept' : null,
    consentBehaviour: consented ? 'accept' : null,
    consentPhoto: consented ? 'accept' : null,
    consentEmergencyName: consented ? `${pick(FIRST_NAMES)} ${lastName}` : null,
    consentEmergencyContact: consented ? randomCellNumber() : null,
    consentMedicalAidName: consented ? (chance(0.2) ? 'NONE' : pick(['Discovery', 'Bonitas', 'Medihelp', 'Bestmed'])) : null,
    consentMedicalAidNumber: consented ? (chance(0.2) ? 'NONE' : String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')) : null,
    consentDate: consented ? new Date().toISOString().slice(0, 10) : null,
    consentAcceptedAt: consented ? new Date() : null,
    paymentReceivedAt: paid ? new Date() : null,
  };
}

function randomLeader(i: number): typeof leaders.$inferInsert {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const slug = `${firstName}.${lastName}.${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
  const email = `leader.${slug}@example.com`;

  // Status mix: 60% approved, 20% pending, 20% rejected. Of the approved
  // ones, ~70% are also flagged approvedByNeil so the "By Neil" pill column
  // shows both states.
  const r = Math.random();
  const status: 'pending' | 'approved' | 'rejected' =
    r < 0.6 ? 'approved' : r < 0.8 ? 'pending' : 'rejected';
  const approvedByNeil = status === 'approved' && chance(0.7);

  return {
    year: env.CAMP_YEAR,
    firstName,
    lastName,
    email,
    cell: randomCellNumber(),
    gender: pick(['Male', 'Female']),
    age: String(20 + Math.floor(Math.random() * 15)),
    grade: 'Leader',
    church: pick(CHURCHES),
    tshirt: pick(TSHIRT_SIZES),
    parentName: null,
    parentPhone: null,
    parentEmail: null,
    applicationNotes: pick(APPLICATION_NOTES),
    status,
    approvedByNeil,
    approvedAt: status === 'approved' ? new Date() : null,
  };
}

async function main() {
  console.log('Seed random data:');
  console.log(`  Target year: ${env.CAMP_YEAR}`);
  console.log(`  Will delete ALL campers where year=${env.CAMP_YEAR} (any source).`);
  console.log(`  Will delete ALL leaders.`);
  console.log(`  Will insert ${COUNT} campers + ${COUNT} leaders (source='seed-random').`);
  console.log(`  The 2025 import rows are NOT touched.`);

  if (!CONFIRM) {
    console.log('\nDRY RUN — re-run with --yes to actually wipe + seed.');
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    const camperDel = await tx
      .delete(campers)
      .where(eq(campers.year, env.CAMP_YEAR))
      .returning({ id: campers.id });
    console.log(`Deleted ${camperDel.length} camper rows for year ${env.CAMP_YEAR}.`);

    const leaderDel = await tx.delete(leaders).returning({ id: leaders.id });
    console.log(`Deleted ${leaderDel.length} leader rows (all years).`);

    const camperRows = Array.from({ length: COUNT }, (_, i) => randomCamper(i));
    const inserted = await tx.insert(campers).values(camperRows).returning({ id: campers.id });
    console.log(`Inserted ${inserted.length} random campers.`);

    const leaderRows = Array.from({ length: COUNT }, (_, i) => randomLeader(i));
    const insertedL = await tx.insert(leaders).values(leaderRows).returning({ id: leaders.id });
    console.log(`Inserted ${insertedL.length} random leaders.`);
  });

  console.log('\n✓ Done. Open /admin to see the new rows.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed-random failed:', err);
  process.exit(1);
});
