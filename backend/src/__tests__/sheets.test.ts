jest.mock('../env', () => ({
  env: {
    GOOGLE_SHEET_ID: 'sheet-id',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sa@example.iam.gserviceaccount.com',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'fake-key',
  },
}));

const appendMock = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: { JWT: jest.fn() },
    sheets: () => ({
      spreadsheets: { values: { append: appendMock } },
    }),
  },
}));

import { appendToSheet, _resetSheetsClient } from '../services/sheets';

describe('appendToSheet', () => {
  beforeEach(() => {
    appendMock.mockReset().mockResolvedValue({ data: {} });
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
});
