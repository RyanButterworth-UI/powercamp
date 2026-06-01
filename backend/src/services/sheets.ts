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

// Resets the cached client. Test-only seam.
export function _resetSheetsClient(): void {
  cachedClient = null;
}
