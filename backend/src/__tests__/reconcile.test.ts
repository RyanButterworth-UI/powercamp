import { reconcileRegistrations, ReconcileDbCamper } from '../lib/reconcile';

// Build a 24-wide Registrations row (see registration-sheet.ts layout). Only
// the columns a test cares about are set; the rest default to ''.
function sheetRow(over: Partial<Record<number, string | number>>): (string | number | null)[] {
  const r: (string | number | null)[] = new Array(24).fill('');
  for (const [k, v] of Object.entries(over)) if (v !== undefined) r[Number(k)] = v;
  return r;
}
// Column shorthands for readability.
const FIRST = 0, LAST = 1, GENDER = 3, EMAIL = 4, GRADE = 6, PEMAIL = 11, ID = 17, YEAR = 23;

function dbCamper(over: Partial<ReconcileDbCamper> & { id: number }): ReconcileDbCamper {
  return {
    firstName: '', lastName: '', email: null, parentEmail: '', grade: null, age: null,
    gender: null, parentName: null, parentPhone: null, dob: null, tshirt: null, church: null,
    ...over,
  };
}

describe('reconcileRegistrations', () => {
  it('reports a matched-clean camper with no drift', () => {
    const sheet = [sheetRow({ [FIRST]: 'Sam', [LAST]: 'Smith', [PEMAIL]: 'pat@x.com', [ID]: 5, [YEAR]: 2026 })];
    const db = [dbCamper({ id: 5, firstName: 'Sam', lastName: 'Smith', parentEmail: 'pat@x.com' })];

    const r = reconcileRegistrations(sheet, db, 2026);
    expect(r.counts).toMatchObject({ sheetRows: 1, dbCampers: 1, matched: 1, sheetOnly: 0, dbOnly: 0, conflicts: 0 });
  });

  it('flags a sheet row with no DB match as sheet-only', () => {
    const sheet = [sheetRow({ [FIRST]: 'Hand', [LAST]: 'Added', [PEMAIL]: 'new@x.com' })];
    const r = reconcileRegistrations(sheet, [], 2026);
    expect(r.counts.sheetOnly).toBe(1);
    expect(r.sheetOnly[0]).toMatchObject({ rowNumber: 1, firstName: 'Hand', lastName: 'Added', camperId: null });
  });

  it('flags a DB camper missing from the sheet as db-only', () => {
    const db = [dbCamper({ id: 9, firstName: 'Only', lastName: 'Indb', parentEmail: 'db@x.com', grade: '10' })];
    const r = reconcileRegistrations([], db, 2026);
    expect(r.counts.dbOnly).toBe(1);
    expect(r.dbOnly[0]).toMatchObject({ id: 9, firstName: 'Only', grade: '10' });
  });

  it('matches on the id even when the name was hand-edited, and reports the diff', () => {
    const sheet = [sheetRow({ [FIRST]: 'Samuel', [LAST]: 'Smith', [GRADE]: '9', [PEMAIL]: 'pat@x.com', [ID]: 5 })];
    const db = [dbCamper({ id: 5, firstName: 'Sam', lastName: 'Smith', grade: '8', parentEmail: 'pat@x.com' })];

    const r = reconcileRegistrations(sheet, db, 2026);
    expect(r.counts).toMatchObject({ conflicts: 1, sheetOnly: 0, dbOnly: 0, matched: 0 });
    const fields = r.conflicts[0].diffs.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['First name', 'Grade']));
    const firstDiff = r.conflicts[0].diffs.find((d) => d.field === 'First name')!;
    expect(firstDiff).toMatchObject({ sheet: 'Samuel', db: 'Sam' });
  });

  it('matches on the name+email composite when the sheet row has no id (legacy/manual)', () => {
    const sheet = [sheetRow({ [FIRST]: 'Sam', [LAST]: 'Smith', [PEMAIL]: 'PAT@X.com' })];
    const db = [dbCamper({ id: 5, firstName: 'sam', lastName: 'SMITH', parentEmail: 'pat@x.com' })];

    const r = reconcileRegistrations(sheet, db, 2026);
    expect(r.counts).toMatchObject({ matched: 1, sheetOnly: 0, dbOnly: 0, conflicts: 0 });
  });

  it('treats blank vs. empty and case/whitespace as equal (no false conflict)', () => {
    const sheet = [sheetRow({ [FIRST]: '  Sam ', [LAST]: 'Smith', [GENDER]: 'Male', [PEMAIL]: 'pat@x.com', [ID]: 5 })];
    const db = [dbCamper({ id: 5, firstName: 'sam', lastName: 'smith', gender: 'male', parentEmail: 'pat@x.com' })];
    const r = reconcileRegistrations(sheet, db, 2026);
    expect(r.counts.conflicts).toBe(0);
    expect(r.counts.matched).toBe(1);
  });

  it('skips a header row and blank rows', () => {
    const sheet = [
      sheetRow({ [FIRST]: 'First Name', [LAST]: 'Last Name', [PEMAIL]: 'Parent Email' }), // header
      new Array(24).fill(''), // blank
      sheetRow({ [FIRST]: 'Sam', [LAST]: 'Smith', [PEMAIL]: 'pat@x.com', [ID]: 5 }),
    ];
    const db = [dbCamper({ id: 5, firstName: 'Sam', lastName: 'Smith', parentEmail: 'pat@x.com' })];
    const r = reconcileRegistrations(sheet, db, 2026);
    expect(r.counts.sheetRows).toBe(1);
    expect(r.counts.matched).toBe(1);
  });

  it('ignores sheet rows tagged to a different camp year', () => {
    const sheet = [sheetRow({ [FIRST]: 'Old', [LAST]: 'Timer', [PEMAIL]: 'old@x.com', [YEAR]: 2025 })];
    const r = reconcileRegistrations(sheet, [], 2026);
    expect(r.counts.sheetRows).toBe(0);
    expect(r.counts.sheetOnly).toBe(0);
  });
});
