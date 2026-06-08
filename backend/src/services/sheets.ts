import { google, sheets_v4 } from 'googleapis';
import { env } from '../env';

let cachedClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  cachedClient = google.sheets({ version: 'v4', auth });
  return cachedClient;
}

export type SheetTab = 'Registrations' | 'Consent' | 'Feedback' | 'Leaders' | 'Payments' | 'Subscriptions' | 'Waitlist';

// "Unable to parse range: Foo!A:Z" — what Google returns when a tab doesn't
// exist. Match defensively on the message rather than the status code so a
// future tweak to their error format keeps working.
function isMissingRangeError(err: unknown): boolean {
  const msg = (err as { message?: string; cause?: { message?: string } } | null | undefined);
  const text = msg?.cause?.message ?? msg?.message ?? '';
  return /Unable to parse range/i.test(text);
}

async function createSheetTab(sheets: sheets_v4.Sheets, tab: string): Promise<void> {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: tab } } }],
    },
  });
}

export async function appendToSheet(tab: SheetTab, row: (string | number | null)[]): Promise<void> {
  const sheets = getSheetsClient();
  const doAppend = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range: `${tab}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

  try {
    await doAppend();
  } catch (err) {
    // First-time use of a never-created tab (e.g. Payments before any camper
    // has been marked paid). Create the tab and retry once. If the second
    // attempt also fails — or the original error wasn't a missing-range —
    // bubble up to the caller, which already has a best-effort .catch.
    if (!isMissingRangeError(err)) throw err;
    await createSheetTab(sheets, tab);
    await doAppend();
  }
}

// Find-or-update a row by a composite key, instead of always appending.
// Used by the edit flow (POST /update) so editing an existing registration
// overwrites that camper's existing row in place rather than appending a
// duplicate — which is exactly the bug where a returning family's edit
// spawned a second Registrations row.
//
// `keyColumnIndexes` are 0-based column positions whose combined (trimmed,
// case-insensitive) values identify the row.
//
// `fallbackKeyColumnIndexes` (optional) is tried only when the primary key
// finds no match. The Registrations primary key is the camper's stable DB id
// (a trailing column): keying on the id means editing a camper's NAME or
// EMAIL no longer spawns a duplicate row. Rows written before the id column
// existed have a blank id, so for those we fall back to the old composite
// (firstName + lastName + parentEmail). The primary key is skipped when the
// incoming row's key cells are blank, so an id-less row never matches another
// id-less row on an all-empty key.
//
// If neither key matches (a never-before-seen camper, or a tab that doesn't
// exist yet) we fall back to appendToSheet, so this is a safe drop-in.
export async function upsertToSheet(
  tab: SheetTab,
  row: (string | number | null)[],
  keyColumnIndexes: number[],
  fallbackKeyColumnIndexes?: number[]
): Promise<void> {
  const sheets = getSheetsClient();

  const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
  const keyOf = (r: (string | number | null)[], cols: number[]) =>
    cols.map((i) => norm(r[i])).join(' ');

  let existing: (string | number | null)[][] = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range: `${tab}!A:Z`,
    });
    existing = (res.data.values as (string | number | null)[][] | undefined) ?? [];
  } catch (err) {
    // Tab doesn't exist yet → nothing to match against; append (which
    // creates the tab on first write). Re-throw anything else.
    if (!isMissingRangeError(err)) throw err;
  }

  // Primary match — only when every primary key cell of the incoming row is
  // non-empty (otherwise an id-less row would match another on an empty key).
  let rowIndex = -1;
  if (keyColumnIndexes.every((i) => norm(row[i]) !== '')) {
    const primaryKey = keyOf(row, keyColumnIndexes);
    rowIndex = existing.findIndex((r) => keyOf(r, keyColumnIndexes) === primaryKey);
  }

  // Fallback composite match (e.g. legacy rows written before the id column).
  if (rowIndex === -1 && fallbackKeyColumnIndexes && fallbackKeyColumnIndexes.length > 0) {
    const fbKey = keyOf(row, fallbackKeyColumnIndexes);
    rowIndex = existing.findIndex((r) => keyOf(r, fallbackKeyColumnIndexes) === fbKey);
  }

  if (rowIndex === -1) {
    await appendToSheet(tab, row);
    return;
  }

  // Sheet rows are 1-based; rowIndex is 0-based into the returned values.
  const sheetRowNumber = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${tab}!A${sheetRowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

// Resets the cached client. Test-only seam.
export function _resetSheetsClient(): void {
  cachedClient = null;
}
