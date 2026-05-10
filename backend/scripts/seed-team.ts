import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { campers, leaders } from '../src/db/schema';
import { env } from '../src/env';

// Wipes the current camp year's campers + all leaders, then seeds with
// the actual team Ryan wants logging in to test (Cable family + named
// testers + Nadia) plus a small spread of filler campers so admin views
// have enough rows to feel real.
//
// Real emails where Ryan provided them; @example.com placeholders for
// the rest (the email guard skips outbound mail to those automatically).
//
//   npm run seed:team             # dry run
//   npm run seed:team -- --yes    # actually wipe + seed

const args = process.argv.slice(2);
const CONFIRM = args.includes('--yes');

interface CamperSeed {
  firstName: string;
  lastName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  email?: string | null;
  cell?: string | null;
  age: string;
  grade: string;
  gender: 'Male' | 'Female';
  dob: string;
  church: string;
  tshirt: string;
  friends?: string[];
  consented?: boolean;
  paid?: boolean;
  medical?: string;
}

interface LeaderSeed {
  firstName: string;
  lastName: string;
  email: string;
  cell?: string;
  gender: 'Male' | 'Female';
  age: string;
  church: string;
  tshirt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedByNeil: boolean;
  applicationNotes?: string;
}

// ----- Team Ryan asked for -----
const cableKidsCampers: CamperSeed[] = [
  {
    firstName: 'Ben',
    lastName: 'Cable',
    parentName: 'Jill Cable',
    parentEmail: 'jill.cable@me.com',
    parentPhone: '0828756784',
    age: '14',
    grade: '8',
    gender: 'Male',
    dob: '2012-03-15',
    church: 'Hatfield Christian Church',
    tshirt: 'medium',
    friends: ['Joel Oommen', 'Stuart Chase'],
    consented: true,
    paid: true,
  },
];

const cableLeaders: LeaderSeed[] = [
  {
    firstName: 'Luke',
    lastName: 'Cable',
    email: 'luke.cable@icloud.com',
    cell: '0828756785',
    gender: 'Male',
    age: '21',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Returning leader from 2024.',
  },
  {
    firstName: 'Tim',
    lastName: 'Cable',
    email: 'tim.cable@example.com',
    cell: '0828756786',
    gender: 'Male',
    age: '19',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Was a camper in 2024 — now stepping up to lead.',
  },
  {
    firstName: 'Emma',
    lastName: 'Cable',
    email: 'emma.cable@example.com',
    cell: '0828756787',
    gender: 'Female',
    age: '18',
    church: 'Hatfield Christian Church',
    tshirt: 'small',
    status: 'pending',
    approvedByNeil: false,
    applicationNotes: 'Was a camper in 2024 — first year leading.',
  },
];

// Named testers — Ryan gave Nadia's real email; the rest use
// @example.com placeholders that the email guard will skip.
const namedTesters: LeaderSeed[] = [
  {
    firstName: 'Ryan',
    lastName: 'Butterworth',
    email: 'ryanbutterworthza@gmail.com',
    cell: '0820000001',
    gender: 'Male',
    age: '36',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Camp tech / app maintainer.',
  },
  {
    firstName: 'Nadia',
    lastName: 'Butterworth',
    email: 'nadia@after8designstudio.com',
    cell: '0820000002',
    gender: 'Female',
    age: '34',
    church: 'Hatfield Christian Church',
    tshirt: 'medium',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Design / branding.',
  },
  {
    firstName: 'Stuart',
    lastName: 'Chase',
    email: 'stuart.chase@example.com',
    cell: '0820000003',
    gender: 'Male',
    age: '32',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Tester — placeholder email.',
  },
  {
    firstName: 'Gareth',
    lastName: 'Payne',
    email: 'gareth.payne@example.com',
    cell: '0820000004',
    gender: 'Male',
    age: '45',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Tester — placeholder email; real email TBD.',
  },
  {
    firstName: 'Debbie',
    lastName: 'Payne',
    email: 'debbie.payne@mweb.co.za',
    cell: '0823014440',
    gender: 'Female',
    age: '42',
    church: 'Hatfield Christian Church',
    tshirt: 'medium',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Returning leader from 2024.',
  },
  {
    firstName: 'Joel',
    lastName: 'Oommen',
    email: 'joel2josh@gmail.com',
    cell: '0820000006',
    gender: 'Male',
    age: '29',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Returning leader from 2024.',
  },
  {
    firstName: 'Jill',
    lastName: 'Cable',
    email: 'jill.cable@me.com',
    cell: '0828756784',
    gender: 'Female',
    age: '47',
    church: 'Hatfield Christian Church',
    tshirt: 'medium',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Returning leader from 2024.',
  },
  {
    firstName: 'Shaylen',
    lastName: 'Tester',
    email: 'shaylen@example.com',
    cell: '0820000008',
    gender: 'Male',
    age: '30',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Tester — placeholder email; real email TBD.',
  },
  {
    firstName: 'Nathan',
    lastName: 'Tester',
    email: 'nathan@example.com',
    cell: '0820000009',
    gender: 'Male',
    age: '28',
    church: 'Hatfield Christian Church',
    tshirt: 'large',
    status: 'approved',
    approvedByNeil: true,
    applicationNotes: 'Tester — placeholder email; real email TBD.',
  },
];

// Filler campers so the admin views have a meaningful spread for testing
// search / filter / paid / consent flows. All use @example.com so the
// email guard never tries to send to them.
const fillerNames = [
  ['Olivia', 'Pretorius'], ['Liam', 'Steyn'], ['Aiden', 'Hing'],
  ['Sophia', 'Mokoena'], ['Noah', 'Naidoo'], ['Emma', 'Botha'],
  ['Mason', 'Khumalo'], ['Ava', 'Pillay'], ['Lucas', 'Ndlovu'],
  ['Mia', 'van der Merwe'], ['Ethan', 'Phillips'], ['Charlotte', 'Adams'],
  ['Caleb', 'Brown'], ['Harper', 'Davies'], ['Joshua', 'Visser'],
  ['Zoe', 'Mostert'], ['Daniel', 'Calitz'], ['Layla', 'Jordaan'],
];

function fillerCamper(i: number, [first, last]: string[]): CamperSeed {
  const grade = String(8 + (i % 5));
  const age = String(13 + (i % 5));
  const gender: 'Male' | 'Female' = i % 2 === 0 ? 'Male' : 'Female';
  const slug = `${first}.${last}.${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return {
    firstName: first,
    lastName: last,
    parentName: `${first === 'Olivia' ? 'Mike' : 'Mum'} ${last}`,
    parentEmail: `parent.${slug}@example.com`,
    parentPhone: `08${String(20000000 + i * 7).padStart(8, '0')}`,
    email: `camper.${slug}@example.com`,
    cell: `08${String(30000000 + i * 11).padStart(8, '0')}`,
    age,
    grade,
    gender,
    dob: `${env.CAMP_YEAR - parseInt(age)}-0${(i % 9) + 1}-1${i % 9}`,
    church: ['Hatfield Christian Church', 'Hope Bedfordview', 'Brackenhurst Baptist'][i % 3],
    tshirt: ['small', 'medium', 'large'][i % 3],
    friends: i % 3 === 0 ? [fillerNames[(i + 1) % fillerNames.length][0]] : [],
    consented: i % 4 !== 0,
    paid: i % 5 === 0,
  };
}

function camperRow(s: CamperSeed): typeof campers.$inferInsert {
  return {
    year: env.CAMP_YEAR,
    source: 'seed-team',
    firstName: s.firstName,
    lastName: s.lastName,
    dob: s.dob,
    gender: s.gender,
    age: s.age,
    grade: s.grade,
    email: s.email ?? null,
    camperCell: s.cell ?? null,
    medical: s.medical ?? '',
    tshirt: s.tshirt,
    church: s.church,
    generalInfo: '',
    friends: s.friends ?? [],
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    parentEmail: s.parentEmail.toLowerCase(),
    consentGeneral: s.consented ? 'accept' : null,
    consentLocation: s.consented ? 'accept' : null,
    consentRisk: s.consented ? 'accept' : null,
    consentPowerCamp: s.consented ? 'accept' : null,
    consentBehaviour: s.consented ? 'accept' : null,
    consentPhoto: s.consented ? 'accept' : null,
    consentEmergencyName: s.consented ? s.parentName : null,
    consentEmergencyContact: s.consented ? s.parentPhone : null,
    consentMedicalAidName: s.consented ? 'NONE' : null,
    consentMedicalAidNumber: s.consented ? 'NONE' : null,
    consentDate: s.consented ? new Date().toISOString().slice(0, 10) : null,
    consentAcceptedAt: s.consented ? new Date() : null,
    paymentReceivedAt: s.paid ? new Date() : null,
  };
}

function leaderRow(s: LeaderSeed): typeof leaders.$inferInsert {
  return {
    year: env.CAMP_YEAR,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email.toLowerCase(),
    cell: s.cell ?? null,
    gender: s.gender,
    age: s.age,
    grade: 'Leader',
    church: s.church,
    tshirt: s.tshirt,
    parentName: null,
    parentPhone: null,
    parentEmail: null,
    applicationNotes: s.applicationNotes ?? null,
    status: s.status,
    approvedByNeil: s.approvedByNeil,
    approvedAt: s.status === 'approved' ? new Date() : null,
  };
}

async function main() {
  const allCampers: CamperSeed[] = [
    ...cableKidsCampers,
    ...fillerNames.map((n, i) => fillerCamper(i, n)),
  ];
  const allLeaders: LeaderSeed[] = [...namedTesters, ...cableLeaders];

  console.log('Seed (team flavour):');
  console.log(`  Target year: ${env.CAMP_YEAR}`);
  console.log(`  Will delete ALL campers where year=${env.CAMP_YEAR} (any source).`);
  console.log(`  Will delete ALL leaders.`);
  console.log(`  Will insert ${allCampers.length} campers + ${allLeaders.length} leaders.`);
  console.log(`  Real emails: ${[...allCampers.map(c => c.parentEmail), ...allLeaders.map(l => l.email)].filter(e => !e.endsWith('@example.com')).length}; placeholders: ${[...allCampers.map(c => c.parentEmail), ...allLeaders.map(l => l.email)].filter(e => e.endsWith('@example.com')).length}.`);
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

    const inserted = await tx
      .insert(campers)
      .values(allCampers.map(camperRow))
      .returning({ id: campers.id });
    console.log(`Inserted ${inserted.length} campers.`);

    const insertedL = await tx
      .insert(leaders)
      .values(allLeaders.map(leaderRow))
      .returning({ id: leaders.id });
    console.log(`Inserted ${insertedL.length} leaders.`);
  });

  console.log('\n✓ Done. /admin to verify, /admin/leaders to see invitable approvees.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed-team failed:', err);
  process.exit(1);
});
