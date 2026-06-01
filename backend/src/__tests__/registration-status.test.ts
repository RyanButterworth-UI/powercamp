import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    REGISTRATION_ADMIN_EMAIL: 'powercamplife@gmail.com',
  },
}));

jest.mock('../services/settings', () => ({
  getRegistrationsOpen: jest.fn(),
  setRegistrationsOpen: jest.fn(),
}));

// adminRouter pulls in db/client at import time; stub it so the module loads.
jest.mock('../db/client', () => ({ db: {} }));

import { getRegistrationsOpen, setRegistrationsOpen } from '../services/settings';
import { signAdminToken } from '../services/auth';
import { registrationStatusRouter } from '../routes/registration-status';
import { adminRouter } from '../routes/admin';

const mockGet = getRegistrationsOpen as jest.MockedFunction<typeof getRegistrationsOpen>;
const mockSet = setRegistrationsOpen as jest.MockedFunction<typeof setRegistrationsOpen>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(registrationStatusRouter);
  app.use(adminRouter);
  return app;
}

function adminAuth() {
  return `Bearer ${signAdminToken()}`;
}

describe('GET /registration-status (public)', () => {
  beforeEach(() => mockGet.mockReset());

  it('returns the open flag and the waiting-list email, no auth required', async () => {
    mockGet.mockResolvedValue(true);
    const res = await request(buildApp()).get('/registration-status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      registrationsOpen: true,
      waitlistEmail: 'powercamplife@gmail.com',
    });
  });

  it('reflects a closed state', async () => {
    mockGet.mockResolvedValue(false);
    const res = await request(buildApp()).get('/registration-status');
    expect(res.body.registrationsOpen).toBe(false);
  });

  it('fails OPEN if the settings read throws', async () => {
    mockGet.mockRejectedValue(new Error('db down'));
    const res = await request(buildApp()).get('/registration-status');
    expect(res.status).toBe(200);
    expect(res.body.registrationsOpen).toBe(true);
  });
});

describe('admin registration-status', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it('GET requires an admin token', async () => {
    const res = await request(buildApp()).get('/admin/registration-status');
    expect(res.status).toBe(401);
  });

  it('GET returns the current flag for an authed admin', async () => {
    mockGet.mockResolvedValue(false);
    const res = await request(buildApp())
      .get('/admin/registration-status')
      .set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ registrationsOpen: false });
  });

  it('POST closes registrations and echoes the persisted value', async () => {
    mockSet.mockResolvedValue(false);
    const res = await request(buildApp())
      .post('/admin/registration-status')
      .set('Authorization', adminAuth())
      .send({ open: false });
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith(false);
    expect(res.body).toEqual({ registrationsOpen: false });
  });

  it('POST rejects a non-boolean body with 400', async () => {
    const res = await request(buildApp())
      .post('/admin/registration-status')
      .set('Authorization', adminAuth())
      .send({ open: 'nope' });
    expect(res.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
