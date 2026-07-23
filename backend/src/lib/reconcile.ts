// Read-only reconciliation between the Registrations sheet and the campers
// table. Pure functions — the route fetches both sides and hands them here, so
// the diff logic is testable without touching Google or the DB.
//
// Why this exists: the DB is the source of truth, with the sheet as a
// write-through mirror. When an admin types a camper straight into the sheet
// (or hand-edits a row), the DB never learns about it and the two drift apart.
// This surfaces that drift in three buckets so an admin can act on it. It
// writes NOTHING — conflicts are flagged for a human to resolve.

// The subset of camper columns we compare. Column indexes follow the shared
// Registrations layout in registration-sheet.ts (0-based). Free-text and
// consent columns are intentionally excluded — they're noisy and not the point
// of a drift check.
const COMPARABLE_FIELDS: { label: string; sheetIndex: number; dbKey: keyof ReconcileDbCamper }[] = [
  { label: 'First name', sheetIndex: 0, dbKey: 'firstName' },
  { label: 'Last name', sheetIndex: 1, dbKey: 'lastName' },
  { label: 'Gender', sheetIndex: 3, dbKey: 'gender' },
  { label: 'Camper email', sheetIndex: 4, dbKey: 'email' },
  { label: 'Age', sheetIndex: 5, dbKey: 'age' },
  { label: 'Grade', sheetIndex: 6, dbKey: 'grade' },
  { label: 'Parent name', sheetIndex: 9, dbKey: 'parentName' },
  { label: 'Parent phone', sheetIndex: 10, dbKey: 'parentPhone' },
  { label: 'Parent email', sheetIndex: 11, dbKey: 'parentEmail' },
  { label: 'Church', sheetIndex: 12, dbKey: 'church' },
  { label: 'T-shirt', sheetIndex: 13, dbKey: 'tshirt' },
  { label: 'Date of birth', sheetIndex: 15, dbKey: 'dob' },
];

const SHEET_ID_INDEX = 17; // col R — the stable camper id an appended row carries
const SHEET_YEAR_INDEX = 23; // col X — the camp year

export interface ReconcileDbCamper {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  parentEmail: string;
  grade: string | null;
  age: string | null;
  gender: string | null;
  parentName: string | null;
  parentPhone: string | null;
  dob: string | null;
  tshirt: string | null;
  church: string | null;
}

export interface FieldDiff {
  field: string; // human label
  sheet: string;
  db: string;
}

export interface SheetOnlyRow {
  rowNumber: number; // 1-based sheet row, for the admin to find it
  camperId: number | null;
  firstName: string;
  lastName: string;
  parentEmail: string;
  grade: string;
}

export interface DbOnlyRow {
  id: number;
  firstName: string;
  lastName: string;
  parentEmail: string;
  grade: string;
}

export interface ConflictRow {
  camperId: number | null;
  rowNumber: number;
  firstName: string;
  lastName: string;
  parentEmail: string;
  diffs: FieldDiff[];
}

export interface ReconcileResult {
  counts: {
    sheetRows: number; // real camper rows considered (excludes header/blank/other-year)
    dbCampers: number;
    matched: number; // matched with no differences
    sheetOnly: number;
    dbOnly: number;
    conflicts: number;
  };
  sheetOnly: SheetOnlyRow[];
  dbOnly: DbOnlyRow[];
  conflicts: ConflictRow[];
}

const norm = (v: unknown): string => String(v ?? '').trim().toLowerCase();
const disp = (v: unknown): string => String(v ?? '').trim();

function looksLikeHeader(row: (string | number | null)[]): boolean {
  const a = norm(row[0]);
  const l = norm(row[11]);
  return a === 'firstname' || a === 'first name' || l === 'parentemail' || l === 'parent email';
}

function isBlankRow(row: (string | number | null)[]): boolean {
  return row.every((c) => disp(c) === '');
}

function parseSheetId(raw: unknown): number | null {
  const t = disp(raw);
  if (t === '') return null;
  const n = Number(t);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function reconcileRegistrations(
  sheetRows: (string | number | null)[][],
  dbCampers: ReconcileDbCamper[],
  campYear: number
): ReconcileResult {
  const dbById = new Map<number, ReconcileDbCamper>();
  const dbByComposite = new Map<string, ReconcileDbCamper>();
  const compositeKey = (first: unknown, last: unknown, email: unknown) =>
    [norm(first), norm(last), norm(email)].join('|');
  for (const c of dbCampers) {
    dbById.set(c.id, c);
    // First writer wins on a duplicate composite; id matching still
    // disambiguates true duplicates.
    const key = compositeKey(c.firstName, c.lastName, c.parentEmail);
    if (!dbByComposite.has(key)) dbByComposite.set(key, c);
  }

  const matchedDbIds = new Set<number>();
  const sheetOnly: SheetOnlyRow[] = [];
  const conflicts: ConflictRow[] = [];
  let realSheetRows = 0;
  let matchedClean = 0;

  sheetRows.forEach((row, i) => {
    if (isBlankRow(row)) return;
    if (i === 0 && looksLikeHeader(row)) return;

    // Skip rows that explicitly belong to a different camp year; a blank year
    // (common on hand-added rows) is treated as current.
    const rawYear = disp(row[SHEET_YEAR_INDEX]);
    if (rawYear !== '' && Number.isFinite(Number(rawYear)) && Number(rawYear) !== campYear) return;

    realSheetRows++;
    const rowNumber = i + 1;
    const id = parseSheetId(row[SHEET_ID_INDEX]);
    const firstName = disp(row[0]);
    const lastName = disp(row[1]);
    const parentEmail = disp(row[11]);
    const grade = disp(row[6]);

    const match =
      (id !== null ? dbById.get(id) : undefined) ??
      dbByComposite.get(compositeKey(firstName, lastName, parentEmail));

    if (!match) {
      sheetOnly.push({ rowNumber, camperId: id, firstName, lastName, parentEmail, grade });
      return;
    }

    matchedDbIds.add(match.id);
    const diffs: FieldDiff[] = [];
    for (const f of COMPARABLE_FIELDS) {
      const sheetVal = row[f.sheetIndex];
      const dbVal = match[f.dbKey];
      if (norm(sheetVal) !== norm(dbVal)) {
        diffs.push({ field: f.label, sheet: disp(sheetVal), db: disp(dbVal) });
      }
    }
    if (diffs.length > 0) {
      conflicts.push({ camperId: match.id, rowNumber, firstName, lastName, parentEmail, diffs });
    } else {
      matchedClean++;
    }
  });

  const dbOnly: DbOnlyRow[] = dbCampers
    .filter((c) => !matchedDbIds.has(c.id))
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      parentEmail: c.parentEmail,
      grade: disp(c.grade),
    }));

  return {
    counts: {
      sheetRows: realSheetRows,
      dbCampers: dbCampers.length,
      matched: matchedClean,
      sheetOnly: sheetOnly.length,
      dbOnly: dbOnly.length,
      conflicts: conflicts.length,
    },
    sheetOnly,
    dbOnly,
    conflicts,
  };
}
