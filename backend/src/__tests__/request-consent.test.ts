import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    APP_BASE_URL: 'http://localhost:4200',
    ADMIN_PASSWORD_HASH: 'unused',
  },
}));

const selectMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => selectMock() }),
      }),
    }),
  },
}));

// The admin router pulls in a lot of collaborators; stub the ones the
// request-consent path (and module load) touches.
jest.mock('../services/sheets', () => ({ appendToSheet: jest.fn(), upsertToSheet: jest.fn() }));
const sendConsentMock = jest.fn();
jest.mock('../services/email', () => ({
  sendConsentRequest: (...args: unknown[]) => sendConsentMock(...args),
  sendPaymentConfirmed: jest.fn(),
  renderBlocksToHtml: jest.fn(),
  blocksToPlainText: jest.fn(),
  sendBulkEmail: jest.fn(),
  sendLeaderInvite: jest.fn(),
  sendInviteSentReceipt: jest.fn(),
  sendLeaderRejection: jest.fn(),
  sendRegistrationUpdated: jest.fn(),
}));

import { signAdminToken } from '../services/auth';
import { adminRouter } from '../routes/admin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  return app;
}

const authed = () => `Bearer ${signAdminToken()}`;

describe('POST /admin/campers/:id/request-consent', () => {
  beforeEach(() => {
    selectMock.mockReset();
    sendConsentMock.mockReset().mockResolvedValue(undefined);
  });

  it('requires an admin token', async () => {
    const res = await request(buildApp()).post('/admin/campers/7/request-consent');
    expect(res.status).toBe(401);
    expect(sendConsentMock).not.toHaveBeenCalled();
  });

  it('emails a 12h consent link to the parent when the camper exists', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 7, firstName: 'Ryan', parentEmail: 'parent@example.com', deletedAt: null },
    ]);

    const res = await request(buildApp())
      .post('/admin/campers/7/request-consent')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, sentTo: 'parent@example.com' });
    expect(sendConsentMock).toHaveBeenCalledTimes(1);
    const [to, firstName, url] = sendConsentMock.mock.calls[0]!;
    expect(to).toBe('parent@example.com');
    expect(firstName).toBe('Ryan');
    expect(url).toMatch(/^http:\/\/localhost:4200\/verify-link\?token=/);
  });

  it('404s for a missing or soft-deleted camper', async () => {
    selectMock.mockResolvedValueOnce([]);
    expect(
      (await request(buildApp()).post('/admin/campers/7/request-consent').set('Authorization', authed())).status
    ).toBe(404);

    selectMock.mockResolvedValueOnce([
      { id: 7, firstName: 'X', parentEmail: 'x@x.com', deletedAt: new Date() },
    ]);
    expect(
      (await request(buildApp()).post('/admin/campers/7/request-consent').set('Authorization', authed())).status
    ).toBe(404);
    expect(sendConsentMock).not.toHaveBeenCalled();
  });

  it('400s for an invalid id', async () => {
    const res = await request(buildApp())
      .post('/admin/campers/abc/request-consent')
      .set('Authorization', authed());
    expect(res.status).toBe(400);
  });

  it('500s when the email send fails (awaited, so failure surfaces)', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 7, firstName: 'X', parentEmail: 'x@x.com', deletedAt: null },
    ]);
    sendConsentMock.mockRejectedValueOnce(new Error('SMTP down'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(buildApp())
      .post('/admin/campers/7/request-consent')
      .set('Authorization', authed());

    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });
});
