jest.mock('../env', () => ({
  env: { JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long' },
}));

import jwt from 'jsonwebtoken';
import { signMagicToken, verifyMagicToken } from '../services/auth';

describe('magic token', () => {
  it('signs a token that verifies back to the same camperId', () => {
    const token = signMagicToken(42);
    const claims = verifyMagicToken(token);
    expect(claims).toEqual({ camperId: 42, kind: 'magic' });
  });

  it('rejects a tampered token', () => {
    const token = signMagicToken(42);
    const tampered = token.slice(0, -2) + 'aa';
    expect(verifyMagicToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(
      { camperId: 42, kind: 'magic' },
      'test-secret-must-be-at-least-32-chars-long',
      { expiresIn: '-1m' }
    );
    expect(verifyMagicToken(expired)).toBeNull();
  });

  it("rejects a token with the wrong kind (e.g. someone else's signed JWT)", () => {
    const wrongKind = jwt.sign(
      { camperId: 42, kind: 'session' },
      'test-secret-must-be-at-least-32-chars-long',
      { expiresIn: '30m' }
    );
    expect(verifyMagicToken(wrongKind)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const foreign = jwt.sign({ camperId: 42, kind: 'magic' }, 'a-totally-different-secret-string-here', {
      expiresIn: '30m',
    });
    expect(verifyMagicToken(foreign)).toBeNull();
  });

  it('rejects garbage strings', () => {
    expect(verifyMagicToken('not-a-token')).toBeNull();
    expect(verifyMagicToken('')).toBeNull();
  });
});
