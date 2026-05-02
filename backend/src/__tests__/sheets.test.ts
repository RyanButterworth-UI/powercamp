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

  const okJson = (data: unknown) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
  });

  it('does NOT add formType for registration submissions (preserves existing sheet contract)', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ ok: true }));
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
    fetchMock.mockResolvedValueOnce(okJson({ ok: true }));
    await postToAppsScript({ agree: true }, 'consent');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/exec',
      expect.objectContaining({
        body: JSON.stringify({ agree: true, formType: 'consent' }),
      })
    );
  });

  it('adds formType=feedback for feedback submissions', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ ok: true }));
    await postToAppsScript({ rating: 5 }, 'feedback');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/exec',
      expect.objectContaining({
        body: JSON.stringify({ rating: 5, formType: 'feedback' }),
      })
    );
  });

  it('throws a clean error (does NOT call .json()) when Apps Script returns a non-OK response with HTML', async () => {
    // Mirrors the real-world Google "Sign in" page when the script is not deployed as Anyone-can-execute.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => '<!doctype html><html>...</html>',
    });

    await expect(postToAppsScript({ firstName: 'X' }, 'registration')).rejects.toThrow(
      'Apps Script returned HTTP 401'
    );
  });

  it('returns { raw } when Apps Script responds 200 with non-JSON text', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'OK appended row',
    });

    const result = await postToAppsScript({ firstName: 'X' }, 'registration');
    expect(result).toEqual({ raw: 'OK appended row' });
  });

  it('parses JSON when Apps Script responds 200 with a JSON string', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, row: 5 }),
    });

    const result = await postToAppsScript({ firstName: 'X' }, 'registration');
    expect(result).toEqual({ ok: true, row: 5 });
  });
});
