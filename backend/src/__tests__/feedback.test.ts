import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
  },
}));

const mockInsert = jest.fn();
const mockCamperRows = jest.fn();
const mockLeaderRows = jest.fn();
const mockFeedbackRows = jest.fn();

// Dispatches on the table identity so campers, leaders and feedback can be
// stubbed independently — loadRoster() reads two of them in one Promise.all,
// so call-order stubbing would be far too brittle.
jest.mock('../db/client', () => {
  const schema = jest.requireActual('../db/schema');
  const sourceFor = (table: unknown) => {
    if (table === schema.campers) return mockCamperRows;
    if (table === schema.leaders) return mockLeaderRows;
    return mockFeedbackRows;
  };
  return {
    db: {
      insert: () => ({
        values: (vals: unknown) => ({
          onConflictDoNothing: () => ({ returning: () => mockInsert(vals) }),
        }),
      }),
      select: () => ({
        from: (table: unknown) => {
          const source = sourceFor(table);
          return {
            where: () => ({
              orderBy: () => Promise.resolve(source()),
              then: (
                resolve: (v: unknown) => void,
                reject: (e: unknown) => void
              ) => Promise.resolve(source()).then(resolve, reject),
            }),
          };
        },
      }),
    },
  };
});

jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn(),
}));

import { appendToSheet } from '../services/sheets';
import { signAdminToken } from '../services/auth';
import {
  feedbackRouter,
  nameKey,
  matchRoster,
  RosterPerson,
} from '../routes/feedback';

const mockAppend = appendToSheet as jest.MockedFunction<typeof appendToSheet>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(feedbackRouter);
  return app;
}

const answers = {
  camperName: 'Timothy Cable',
  campOrganization: '5',
  spiritualInput: '5',
  activities: '4',
  facilities: '4',
  userComment: 'Loved the devotions',
  oneWord: 'Organised',
  requiresFeedback: 'No',
  additionalInfo: '',
};

const ROSTER: RosterPerson[] = [
  { id: 42, firstName: 'Timothy', lastName: 'Cable', kind: 'camper' },
  { id: 43, firstName: 'Emma', lastName: 'Cable', kind: 'camper' },
  { id: 7, firstName: 'Jody', lastName: 'Marais', kind: 'leader' },
];

// The register as the DB mock serves it (no `kind` — that's added by loadRoster).
const CAMPER_ROWS = [
  { id: 42, firstName: 'Timothy', lastName: 'Cable' },
  { id: 43, firstName: 'Emma', lastName: 'Cable' },
];
const LEADER_ROWS = [{ id: 7, firstName: 'Jody', lastName: 'Marais' }];

describe('nameKey', () => {
  it('collapses case, spacing, punctuation and accents to one key', () => {
    expect(nameKey('Timothy  Cable')).toBe('timothy cable');
    expect(nameKey('  timothy CABLE ')).toBe('timothy cable');
    expect(nameKey('Tímothy Cable!')).toBe('timothy cable');
    expect(nameKey("Alexa J v'Rensburg")).toBe('alexa j v rensburg');
  });
});

describe('matchRoster', () => {
  it('matches a full name and resolves the camper', () => {
    expect(matchRoster('timothy cable', ROSTER)).toEqual({
      found: true,
      camperId: 42,
      canonicalKey: 'timothy cable',
      canonicalName: 'Timothy Cable',
    });
  });

  it('matches a first name when it is unique this year', () => {
    expect(matchRoster('emma', ROSTER)).toEqual({
      found: true,
      camperId: 43,
      // Short form resolves to the REGISTERED name, so it can't buy a second go.
      canonicalKey: 'emma cable',
      canonicalName: 'Emma Cable',
    });
  });

  it('accepts a leader but leaves camperId null — they still get a say', () => {
    expect(matchRoster('jody marais', ROSTER)).toEqual({
      found: true,
      camperId: null,
      canonicalKey: 'jody marais',
      canonicalName: 'Jody Marais',
    });
  });

  it('rejects a name nobody at camp has — the spam gate', () => {
    expect(matchRoster('random spammer', ROSTER)).toEqual({
      found: false,
      camperId: null,
      canonicalKey: null,
      canonicalName: null,
    });
    expect(matchRoster('cable', ROSTER)).toEqual({
      found: false,
      camperId: null,
      canonicalKey: null,
      canonicalName: null,
    });
  });

  it('rejects a joint entry — each camper answers for themselves', () => {
    expect(matchRoster('timothy and emma cable', ROSTER)).toEqual({
      found: false,
      camperId: null,
      canonicalKey: null,
      canonicalName: null,
    });
  });

  it('accepts a shared name but attributes it to nobody', () => {
    const twins: RosterPerson[] = [
      { id: 1, firstName: 'Sam', lastName: 'Smith', kind: 'camper' },
      { id: 2, firstName: 'Sam', lastName: 'Smith', kind: 'camper' },
    ];
    expect(matchRoster('sam smith', twins)).toEqual({
      found: true,
      camperId: null,
      canonicalKey: 'sam smith',
      canonicalName: 'Sam Smith',
    });
  });

  it('does not match a first name two people share', () => {
    const roster: RosterPerson[] = [
      { id: 1, firstName: 'Sam', lastName: 'Smith', kind: 'camper' },
      { id: 2, firstName: 'Sam', lastName: 'Jones', kind: 'camper' },
    ];
    expect(matchRoster('sam', roster)).toEqual({
      found: false,
      camperId: null,
      canonicalKey: null,
      canonicalName: null,
    });
  });
});

describe('POST /feedback', () => {
  beforeEach(() => {
    mockInsert.mockReset().mockResolvedValue([{ id: 11 }]);
    mockCamperRows.mockReset().mockReturnValue(CAMPER_ROWS);
    mockLeaderRows.mockReset().mockReturnValue(LEADER_ROWS);
    mockFeedbackRows.mockReset().mockReturnValue([]);
    mockAppend.mockReset().mockResolvedValue(undefined);
  });

  it('stores the response against the camp year with a normalised name key', async () => {
    const res = await request(buildApp()).post('/feedback').send(answers);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 11, camperId: 42 });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        camperId: 42,
        camperName: 'Timothy Cable',
        nameKey: 'timothy cable',
        campOrganization: 5,
        spiritualInput: 5,
        activities: 4,
        facilities: 4,
        userComment: 'Loved the devotions',
        oneWord: 'Organised',
        requiresFollowUp: false,
        // '' on the form becomes NULL in the column.
        additionalInfo: null,
      })
    );
  });

  it('rejects a name that is not on this year\'s register with 422', async () => {
    const res = await request(buildApp())
      .post('/feedback')
      .send({ ...answers, camperName: 'Random Spammer' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: 'unknown_camper',
      camperName: 'Random Spammer',
    });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it('accepts a leader — they were at camp too', async () => {
    const res = await request(buildApp())
      .post('/feedback')
      .send({ ...answers, camperName: 'Jody Marais' });

    expect(res.status).toBe(200);
    expect(res.body.camperId).toBeNull();
  });

  it('rejects a second response for the same camper with 409', async () => {
    // onConflictDoNothing returns no row when the unique (year, nameKey)
    // index rejects the insert.
    mockInsert.mockResolvedValueOnce([]);

    const res = await request(buildApp()).post('/feedback').send(answers);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'already_submitted',
      camperName: 'Timothy Cable',
    });
    expect(mockAppend).not.toHaveBeenCalled();
  });

  // Regression: "Lexi" and "Lexi Butterworth" are different strings, so the
  // (year, name_key) index saw two different people and let the same camper
  // answer twice. Every submission now keys on the REGISTERED name.
  it('stores the registered name key, not the short form that was typed', async () => {
    await request(buildApp())
      .post('/feedback')
      .send({ ...answers, camperName: 'Emma' });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ camperName: 'Emma', nameKey: 'emma cable' })
    );
  });

  it('blocks a second go under a different spelling of the same name', async () => {
    // Already on file under the full registered name…
    mockFeedbackRows.mockReturnValue([
      { id: 1, nameKey: 'emma cable', camperId: 43 },
    ]);

    // …so the short form must be turned away too.
    const res = await request(buildApp())
      .post('/feedback')
      .send({ ...answers, camperName: 'Emma' });

    expect(res.status).toBe(409);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('blocks a repeat even when an older row was keyed on whatever was typed', async () => {
    // A row written before keys were canonicalised: name_key is the short form.
    mockFeedbackRows.mockReturnValue([
      { id: 1, nameKey: 'emma', camperId: 43 },
    ]);

    const res = await request(buildApp())
      .post('/feedback')
      .send({ ...answers, camperName: 'Emma Cable' });

    // Matched on camper_id rather than the key.
    expect(res.status).toBe(409);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('mirrors to the Feedback tab in a fixed column order', async () => {
    await request(buildApp()).post('/feedback').send(answers);

    expect(mockAppend).toHaveBeenCalledWith('Feedback', [
      expect.any(String), // timestamp
      'Timothy Cable',
      5,
      5,
      4,
      4,
      'Loved the devotions',
      'Organised',
      'No',
      '',
    ]);
  });

  it('still succeeds when the sheet append fails — the row is saved', async () => {
    mockAppend.mockRejectedValueOnce(new Error('sheets down'));

    const res = await request(buildApp()).post('/feedback').send(answers);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 500 when the insert fails', async () => {
    mockInsert.mockRejectedValueOnce(new Error('boom'));
    const res = await request(buildApp()).post('/feedback').send(answers);
    expect(res.status).toBe(500);
  });

  it('rejects a submission with no name or an out-of-range rating', async () => {
    const app = buildApp();

    expect((await request(app).post('/feedback').send({})).status).toBe(400);
    expect(
      (await request(app).post('/feedback').send({ ...answers, camperName: ' ' }))
        .status
    ).toBe(400);
    expect(
      (await request(app).post('/feedback').send({ ...answers, activities: '9' }))
        .status
    ).toBe(400);
  });

  it('records a follow-up request', async () => {
    await request(buildApp())
      .post('/feedback')
      .send({ ...answers, requiresFeedback: 'Yes' });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ requiresFollowUp: true })
    );
  });
});

describe('POST /feedback/suggest', () => {
  beforeEach(() => {
    mockCamperRows.mockReset().mockReturnValue(CAMPER_ROWS);
    mockLeaderRows.mockReset().mockReturnValue(LEADER_ROWS);
    mockFeedbackRows.mockReset().mockReturnValue([]);
  });

  const suggest = (q: string) =>
    request(buildApp()).post('/feedback/suggest').send({ q });

  it('offers matching names once there are enough characters', async () => {
    const res = await suggest('tim');
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toEqual([
      { name: 'Timothy Cable', kind: 'camper', alreadySubmitted: false },
    ]);
  });

  it('matches on surname too, so a family finds themselves', async () => {
    const res = await suggest('cable');
    expect(res.body.suggestions.map((s: any) => s.name)).toEqual([
      'Timothy Cable',
      'Emma Cable',
    ]);
  });

  it('returns nothing below the character floor — one letter must not list the camp', async () => {
    expect((await suggest('t')).body.suggestions).toEqual([]);
    expect((await suggest('ti')).body.suggestions).toEqual([]);
  });

  it('only prefix-matches, so a common fragment cannot sweep the register', async () => {
    // "able" appears inside "Cable" but starts nothing.
    expect((await suggest('able')).body.suggestions).toEqual([]);
  });

  it('flags a name that has already been used', async () => {
    mockFeedbackRows.mockReturnValue([{ nameKey: 'timothy cable' }]);
    const res = await suggest('timothy');
    expect(res.body.suggestions[0]).toEqual({
      name: 'Timothy Cable',
      kind: 'camper',
      alreadySubmitted: true,
    });
  });

  it('includes leaders and says so', async () => {
    const res = await suggest('jody');
    expect(res.body.suggestions[0]).toEqual({
      name: 'Jody Marais',
      kind: 'leader',
      alreadySubmitted: false,
    });
  });

  it('never returns contact details', async () => {
    const res = await suggest('tim');
    expect(Object.keys(res.body.suggestions[0]).sort()).toEqual([
      'alreadySubmitted',
      'kind',
      'name',
    ]);
  });

  it('caps the number of results', async () => {
    mockCamperRows.mockReturnValue(
      Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        firstName: 'Sam',
        lastName: `Surname${i}`,
      }))
    );
    const res = await suggest('sam');
    expect(res.body.suggestions.length).toBe(8);
  });
});

describe('POST /feedback/check-name', () => {
  beforeEach(() => {
    mockCamperRows.mockReset().mockReturnValue(CAMPER_ROWS);
    mockLeaderRows.mockReset().mockReturnValue(LEADER_ROWS);
    mockFeedbackRows.mockReset().mockReturnValue([]);
  });

  it('confirms someone who was at camp and has not responded', async () => {
    const res = await request(buildApp())
      .post('/feedback/check-name')
      .send({ camperName: 'Timothy Cable' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      found: true,
      alreadySubmitted: false,
      name: 'Timothy Cable',
    });
  });

  it('reports a name that is not on the register', async () => {
    const res = await request(buildApp())
      .post('/feedback/check-name')
      .send({ camperName: 'Random Spammer' });

    expect(res.body).toEqual({
      found: false,
      alreadySubmitted: false,
      name: null,
    });
  });

  it('flags someone who has already had their say', async () => {
    mockFeedbackRows.mockReturnValue([
      { id: 3, nameKey: 'timothy cable', camperId: 42 },
    ]);

    const res = await request(buildApp())
      .post('/feedback/check-name')
      .send({ camperName: 'Timothy Cable' });

    expect(res.body).toEqual({
      found: true,
      alreadySubmitted: true,
      name: 'Timothy Cable',
    });
  });

  it('flags a short form of a name that has already responded', async () => {
    mockFeedbackRows.mockReturnValue([
      { id: 3, nameKey: 'emma cable', camperId: 43 },
    ]);

    const res = await request(buildApp())
      .post('/feedback/check-name')
      .send({ camperName: 'Emma' });

    expect(res.body).toEqual({
      found: true,
      alreadySubmitted: true,
      name: 'Emma Cable',
    });
  });

  it('leaks nothing beyond the two booleans', async () => {
    const res = await request(buildApp())
      .post('/feedback/check-name')
      .send({ camperName: 'Timothy Cable' });

    expect(Object.keys(res.body).sort()).toEqual([
      'alreadySubmitted',
      'found',
      'name',
    ]);
  });

  it('returns the registered spelling so a short form can be completed', async () => {
    const res = await request(buildApp())
      .post('/feedback/check-name')
      .send({ camperName: 'emma' });

    expect(res.body.name).toBe('Emma Cable');
  });

  it('rejects an empty name', async () => {
    const res = await request(buildApp())
      .post('/feedback/check-name')
      .send({ camperName: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/feedback', () => {
  const rows = [
    {
      id: 1,
      camperId: 42,
      camperName: 'Timothy Cable',
      campOrganization: 5,
      spiritualInput: 5,
      activities: 4,
      facilities: 4,
      requiresFollowUp: true,
    },
    {
      id: 2,
      camperId: null,
      camperName: 'Amelie and Louise',
      campOrganization: 4,
      spiritualInput: 3,
      activities: 4,
      facilities: 2,
      requiresFollowUp: false,
    },
  ];

  const contacts = [
    {
      id: 42,
      firstName: 'Timothy',
      lastName: 'Cable',
      grade: '9',
      email: 'tim@example.com',
      camperCell: '0820000001',
      parentName: 'Pat Cable',
      parentEmail: 'pat@example.com',
      parentPhone: '0820000002',
    },
    {
      id: 43,
      firstName: 'Emma',
      lastName: 'Cable',
      grade: '7',
      email: null,
      camperCell: null,
      parentName: 'Pat Cable',
      parentEmail: 'pat@example.com',
      parentPhone: '0820000002',
    },
  ];

  beforeEach(() => {
    mockFeedbackRows.mockReset().mockReturnValue(rows);
    mockCamperRows.mockReset().mockReturnValue(contacts);
    mockLeaderRows.mockReset().mockReturnValue([]);
  });

  it('requires an admin token', async () => {
    const res = await request(buildApp()).get('/admin/feedback');
    expect(res.status).toBe(401);
  });

  it('returns the responses with category averages and a chase list', async () => {
    const res = await request(buildApp())
      .get('/admin/feedback')
      .set('Authorization', `Bearer ${signAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.summary).toEqual(
      expect.objectContaining({
        campOrganization: 4.5,
        spiritualInput: 4,
        activities: 4,
        facilities: 3,
        followUpRequested: 1,
        registeredCampers: 2,
        // Timothy's response is linked, Emma's isn't — so only Emma is
        // still to chase.
        awaiting: [{ id: 43, name: 'Emma Cable' }],
      })
    );
  });

  it('attaches contact details so a callback can be actioned from this page', async () => {
    const res = await request(buildApp())
      .get('/admin/feedback')
      .set('Authorization', `Bearer ${signAdminToken()}`);

    expect(res.body.feedback[0].camper).toEqual(
      expect.objectContaining({
        parentName: 'Pat Cable',
        parentEmail: 'pat@example.com',
        parentPhone: '0820000002',
        camperCell: '0820000001',
      })
    );
    // Unmatched entries have nobody to attach.
    expect(res.body.feedback[1].camper).toBeNull();
  });
});
