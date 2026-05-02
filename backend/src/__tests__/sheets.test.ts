jest.mock('../env', () => ({
  env: { APPS_SCRIPT_URL: 'https://example.test/exec' },
}));

import { postToAppsScript } from '../services/sheets';

describe('postToAppsScript', () => {
  const fetchMock = jest.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('does NOT add formType for registration submissions (preserves existing sheet contract)', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ ok: true }) });
    await postToAppsScript({ firstName: 'X' }, 'registration');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/exec',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ firstName: 'X' }),
      })
    );
  });

  it('adds formType=consent for consent submissions', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ ok: true }) });
    await postToAppsScript({ agree: true }, 'consent');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/exec',
      expect.objectContaining({
        body: JSON.stringify({ agree: true, formType: 'consent' }),
      })
    );
  });

  it('adds formType=feedback for feedback submissions', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ ok: true }) });
    await postToAppsScript({ rating: 5 }, 'feedback');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/exec',
      expect.objectContaining({
        body: JSON.stringify({ rating: 5, formType: 'feedback' }),
      })
    );
  });
});
