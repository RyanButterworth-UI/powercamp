jest.mock('../env', () => ({
  env: {
    GOOGLE_SHEET_ID: 'sheet-id',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sa@example.iam.gserviceaccount.com',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'fake-key',
  },
}));

const appendMock = jest.fn();
const batchUpdateMock = jest.fn();
const getMock = jest.fn();
const updateMock = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: { JWT: jest.fn() },
    sheets: () => ({
      spreadsheets: {
        values: { append: appendMock, get: getMock, update: updateMock },
        batchUpdate: batchUpdateMock,
      },
    }),
  },
}));

import { appendToSheet, upsertToSheet, _resetSheetsClient } from '../services/sheets';

describe('appendToSheet', () => {
  beforeEach(() => {
    appendMock.mockReset().mockResolvedValue({ data: {} });
    batchUpdateMock.mockReset().mockResolvedValue({ data: {} });
    getMock.mockReset().mockResolvedValue({ data: { values: [] } });
    updateMock.mockReset().mockResolvedValue({ data: {} });
    _resetSheetsClient();
  });

  it('appends a Registrations row to the configured sheet in column-major order', async () => {
    await appendToSheet('Registrations', ['Jane', 'Doe', '', '', 'jane@x.com']);

    expect(appendMock).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      range: 'Registrations!A:Z',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [['Jane', 'Doe', '', '', 'jane@x.com']] },
    });
  });

  it('appends to the Consent tab when called with Consent', async () => {
    await appendToSheet('Consent', ['2026-01-01T00:00:00Z', 'true']);

    expect(appendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        range: 'Consent!A:Z',
        requestBody: { values: [['2026-01-01T00:00:00Z', 'true']] },
      })
    );
  });

  it('appends to the Feedback tab when called with Feedback', async () => {
    await appendToSheet('Feedback', ['t', '5']);

    expect(appendMock).toHaveBeenCalledWith(
      expect.objectContaining({ range: 'Feedback!A:Z' })
    );
  });

  it('propagates the underlying API error so callers can catch it', async () => {
    appendMock.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(appendToSheet('Registrations', ['x'])).rejects.toThrow('quota exceeded');
  });

  it('creates the tab and retries when the first append fails with "Unable to parse range"', async () => {
    const missing = Object.assign(new Error('Unable to parse range: Payments!A:Z'), {
      cause: { message: 'Unable to parse range: Payments!A:Z' },
    });
    appendMock.mockRejectedValueOnce(missing).mockResolvedValueOnce({ data: {} });

    await appendToSheet('Payments', ['ts', '1', 'name', 'email']);

    expect(batchUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      requestBody: {
        requests: [{ addSheet: { properties: { title: 'Payments' } } }],
      },
    });
    expect(appendMock).toHaveBeenCalledTimes(2);
  });

  it('does not auto-create on unrelated errors', async () => {
    appendMock.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(appendToSheet('Payments', ['x'])).rejects.toThrow('quota exceeded');
    expect(batchUpdateMock).not.toHaveBeenCalled();
  });
});

describe('upsertToSheet', () => {
  const KEYS = [0, 1, 11]; // firstName, lastName, parentEmail

  // A 12-column Registrations-style row: name in A/B, parent email in L.
  const sheetRow = (first: string, last: string, parentEmail: string) => [
    first, last, '', '', '', '', '', '', '', '', '', parentEmail,
  ];

  beforeEach(() => {
    appendMock.mockReset().mockResolvedValue({ data: {} });
    batchUpdateMock.mockReset().mockResolvedValue({ data: {} });
    getMock.mockReset().mockResolvedValue({ data: { values: [] } });
    updateMock.mockReset().mockResolvedValue({ data: {} });
    _resetSheetsClient();
  });

  it('UPDATEs the matching row in place (by name + parent email) and does NOT append', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        values: [
          sheetRow('Jane', 'Doe', 'jane.parent@x.com'),       // row 1
          sheetRow('Lexi', 'Butterworth', 'rb@x.com'),         // row 2 — target
        ],
      },
    });

    const updated = sheetRow('Lexi', 'Butterworth', 'rb@x.com');
    updated[13] = 'large'; // changed t-shirt
    await upsertToSheet('Registrations', updated, KEYS);

    expect(updateMock).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      range: 'Registrations!A2', // 0-based index 1 → sheet row 2
      valueInputOption: 'RAW',
      requestBody: { values: [updated] },
    });
    expect(appendMock).not.toHaveBeenCalled();
  });

  it('matches case-insensitively and ignores surrounding whitespace', async () => {
    getMock.mockResolvedValueOnce({
      data: { values: [sheetRow('LEXI', 'butterworth', 'RB@x.com')] },
    });

    await upsertToSheet('Registrations', sheetRow(' Lexi ', 'Butterworth', 'rb@x.com '), KEYS);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ range: 'Registrations!A1' })
    );
    expect(appendMock).not.toHaveBeenCalled();
  });

  it('APPENDs when no existing row matches (acts like a new registration)', async () => {
    getMock.mockResolvedValueOnce({
      data: { values: [sheetRow('Jane', 'Doe', 'jane.parent@x.com')] },
    });

    const row = sheetRow('New', 'Camper', 'new@x.com');
    await upsertToSheet('Registrations', row, KEYS);

    expect(updateMock).not.toHaveBeenCalled();
    expect(appendMock).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      range: 'Registrations!A:Z',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
  });

  it('APPENDs (and creates the tab) when the tab does not exist yet', async () => {
    const missing = Object.assign(new Error('Unable to parse range: Registrations!A:Z'), {
      cause: { message: 'Unable to parse range: Registrations!A:Z' },
    });
    getMock.mockRejectedValueOnce(missing);

    const row = sheetRow('First', 'Ever', 'first@x.com');
    await upsertToSheet('Registrations', row, KEYS);

    expect(appendMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('upsertToSheet with id-primary key + composite fallback', () => {
  const ID_KEY = [17];        // primary: stable camper id in col R
  const COMPOSITE = [0, 1, 11]; // fallback: firstName, lastName, parentEmail

  // An 18-column Registrations row: name A/B, parentEmail L (11), id R (17).
  const regRow = (
    first: string,
    last: string,
    parentEmail: string,
    id: string | number
  ): (string | number)[] => {
    const r: (string | number)[] = new Array(18).fill('');
    r[0] = first; r[1] = last; r[11] = parentEmail; r[17] = id;
    return r;
  };

  beforeEach(() => {
    appendMock.mockReset().mockResolvedValue({ data: {} });
    getMock.mockReset().mockResolvedValue({ data: { values: [] } });
    updateMock.mockReset().mockResolvedValue({ data: {} });
    _resetSheetsClient();
  });

  it('matches by stable id even when the camper\'s NAME changed (no duplicate)', async () => {
    getMock.mockResolvedValueOnce({
      data: { values: [regRow('Lexi', 'Butterworth', 'rb@x.com', 5)] }, // row 1
    });

    // Same id (5), but the parent corrected the name + email on edit.
    const incoming = regRow('Alexis', 'Butterworth-Jones', 'newrb@x.com', 5);
    await upsertToSheet('Registrations', incoming, ID_KEY, COMPOSITE);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ range: 'Registrations!A1', requestBody: { values: [incoming] } })
    );
    expect(appendMock).not.toHaveBeenCalled();
  });

  it('falls back to the composite for a legacy row that has no id yet', async () => {
    getMock.mockResolvedValueOnce({
      data: { values: [regRow('Lexi', 'Butterworth', 'rb@x.com', '')] }, // legacy: blank id
    });

    // Incoming now carries id 9, but no sheet row has id 9 → fall back to A/B/L.
    const incoming = regRow('Lexi', 'Butterworth', 'rb@x.com', 9);
    await upsertToSheet('Registrations', incoming, ID_KEY, COMPOSITE);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ range: 'Registrations!A1' })
    );
    expect(appendMock).not.toHaveBeenCalled();
  });

  it('APPENDs when neither the id nor the composite matches', async () => {
    getMock.mockResolvedValueOnce({
      data: { values: [regRow('Sam', 'Doe', 'sam@x.com', 3)] },
    });

    const incoming = regRow('New', 'Kid', 'new@x.com', 8);
    await upsertToSheet('Registrations', incoming, ID_KEY, COMPOSITE);

    expect(appendMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
