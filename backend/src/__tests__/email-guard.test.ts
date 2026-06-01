jest.mock('../env', () => ({
  env: {
    FROM_NAME: 'Power Camp',
    GMAIL_USER: 'send@powercamp.test',
    GMAIL_APP_PASSWORD: 'fake-pw',
    APP_BASE_URL: 'https://powercamp.test',
  },
}));

const sendMailMock = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
  createTransport: () => ({ sendMail: sendMailMock }),
}));

import {
  sendMagicLink,
  sendRegistrationReceived,
  sendPaymentConfirmed,
  sendBulkEmail,
  _resetEmailTransporter,
} from '../services/email';

describe('safeSendMail guard (RFC 2606 reserved test domains)', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    sendMailMock.mockClear();
    _resetEmailTransporter();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it.each([
    ['parent@example.com'],
    ['camper@example.org'],
    ['leader@example.net'],
    ['user@something.test'],
    ['user@invalid'],
    ['user@localhost'],
  ])('skips sendMail entirely when "to" is the reserved address %s', async (addr) => {
    await sendRegistrationReceived(addr, 'Jane');
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SKIP'));
  });

  it('still sends when "to" is a real address', async () => {
    await sendRegistrationReceived('parent@gmail.com', 'Jane');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'parent@gmail.com' })
    );
  });

  it('strips a reserved-domain cc but still sends to a real "to"', async () => {
    await sendRegistrationReceived('parent@gmail.com', 'Jane', 'jane@example.com');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'parent@gmail.com', cc: undefined })
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('strip cc'));
  });

  it('guards sendMagicLink', async () => {
    await sendMagicLink('parent@example.com', 'Jane', 'https://x.test/sign-in');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('guards sendPaymentConfirmed', async () => {
    await sendPaymentConfirmed('parent@example.com', 'Jane');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('guards each recipient in sendBulkEmail independently', async () => {
    const result = await sendBulkEmail(
      'subject',
      ['real@gmail.com', 'fake@example.com', 'real2@hotmail.com'],
      () => ({ html: '<p>x</p>', text: 'x' })
    );
    expect(sendMailMock).toHaveBeenCalledTimes(2);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'real@gmail.com' }));
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'real2@hotmail.com' }));
    // Sent counter increments for skipped messages too — they're "successful"
    // from the API's perspective; the bounce was prevented at the boundary.
    expect(result.sent).toBe(3);
    expect(result.failed).toEqual([]);
  }, 10_000);

  it('case-insensitive on the test-domain check', async () => {
    await sendRegistrationReceived('PARENT@EXAMPLE.COM', 'Jane');
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
