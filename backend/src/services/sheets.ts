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

export type SheetTab = 'Registrations' | 'Consent' | 'Feedback';

export async function appendToSheet(tab: SheetTab, row: (string | number | null)[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${tab}!A:Z`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

// Resets the cached client. Test-only seam.
export function _resetSheetsClient(): void {
  cachedClient = null;
}
