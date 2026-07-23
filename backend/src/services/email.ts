import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { env } from '../env';
import type { CamperChange } from '../lib/camper-diff';

let cached: Transporter | null = null;

function transporter(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    // Connection POOLING is essential for bulk sends. Without it nodemailer
    // opens a fresh SMTP connection — and a fresh Gmail LOGIN — for every
    // single message, and Gmail blocks after ~100 logins with
    // "454-4.7.0 Too many login attempts". Pooling reuses ONE authenticated
    // connection for the whole batch, so Gmail sees one login, not hundreds.
    pool: true,
    maxConnections: 1, // a single reused connection → a single login
    maxMessages: Infinity, // never recycle the connection mid-batch (avoids re-login)
    service: 'gmail',
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  });
  return cached;
}

// RFC 2606 reserved test domains + the TLDs reserved for testing
// (.test / .example / .invalid / .localhost). Any address ending in one of
// these is a stub from seed:random or a developer's manual test — we MUST
// NOT actually send mail to them. Real bounces from example.com mailboxes
// would put our Gmail sender reputation in the bin within a few hundred
// messages and could get the account suspended.
const TEST_EMAIL_PATTERN =
  /@(?:[\w-]+\.)*(?:example\.com|example\.org|example\.net|example|test|invalid|localhost)$/i;

function isTestEmail(addr: unknown): boolean {
  return typeof addr === 'string' && TEST_EMAIL_PATTERN.test(addr.trim());
}

// Drop-in replacement for transporter().sendMail() that respects the
// reserved-domain guard above. Skips the whole send when `to` is a test
// address; strips `cc` when only the cc is a test address.
async function safeSendMail(opts: SendMailOptions): Promise<void> {
  if (isTestEmail(opts.to)) {
    console.log(
      `[email] SKIP (reserved test address): to=${opts.to} subject="${opts.subject}"`
    );
    return;
  }
  if (opts.cc && isTestEmail(opts.cc)) {
    console.log(`[email] strip cc (reserved test address): cc=${opts.cc}`);
    opts = { ...opts, cc: undefined };
  }
  await transporter().sendMail(opts);
}

export async function sendMagicLink(to: string, firstName: string, url: string): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    subject: 'Power Camp 2026 — your sign-in link',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'Click this link to access your Power Camp registration:',
      url,
      '',
      'The link expires in 30 minutes.',
      `If you didn't request this, you can safely ignore this email.`,
      '',
      '— Power Camp',
    ].join('\n'),
    html: magicLinkHtml(firstName || 'there', url),
  });
}

function magicLinkHtml(firstName: string, url: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px 32px;">
                <h1 style="margin:0 0 8px 0; font-size:22px; color:#111827;">Power Camp 2026</h1>
                <p style="margin:0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, click the button below to access your registration.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px 32px;">
                <a href="${url}"
                   style="display:inline-block; background-color:#16a34a; color:#ffffff; text-decoration:none; font-weight:600; font-size:16px; padding:14px 28px; border-radius:8px;">
                  Open my registration
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0 0 8px 0; color:#6b7280; font-size:13px; line-height:20px;">
                  The link expires in 30 minutes. If the button doesn't work, copy and paste this URL into your browser:
                </p>
                <p style="margin:0; color:#374151; font-size:13px; word-break:break-all;">
                  <a href="${url}" style="color:#374151;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">
                  If you didn't request this, you can safely ignore this email.<br/>
                  — Power Camp Admin
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// A consent-focused variant of the magic link, sent when an admin needs a
// parent to complete the consent block for a camper we already hold the
// details for (an imported registration, or a family just moved off the
// waiting list). The link opens the same edit/consent form; the wording makes
// clear that only consent is outstanding. `url` carries a 12-hour token.
export async function sendConsentRequest(to: string, firstName: string, url: string): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    subject: 'Power Camp 2026 — action needed: complete your consent',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      `We have ${firstName || 'your camper'}'s details for Power Camp 2026 — all that's`,
      'left is your consent.',
      '',
      'Click this link to review the details and complete the consent form:',
      url,
      '',
      'The link expires in 12 hours.',
      "If you didn't expect this, you can safely ignore this email.",
      '',
      '— Power Camp',
    ].join('\n'),
    html: consentRequestHtml(firstName || 'there', url),
  });
}

function consentRequestHtml(firstName: string, url: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px 32px;">
                <h1 style="margin:0 0 8px 0; font-size:22px; color:#111827;">Power Camp 2026</h1>
                <p style="margin:0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, we have your camper's details — all that's left is your consent.
                  Tap the button below to review and complete the consent form.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px 32px;">
                <a href="${url}"
                   style="display:inline-block; background-color:#16a34a; color:#ffffff; text-decoration:none; font-weight:600; font-size:16px; padding:14px 28px; border-radius:8px;">
                  Complete my consent
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0 0 8px 0; color:#6b7280; font-size:13px; line-height:20px;">
                  The link expires in 12 hours. If the button doesn't work, copy and paste this URL into your browser:
                </p>
                <p style="margin:0; color:#374151; font-size:13px; word-break:break-all;">
                  <a href="${url}" style="color:#374151;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">
                  If you didn't expect this, you can safely ignore this email.<br/>
                  — Power Camp Admin
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendRegistrationReceived(
  to: string,
  firstName: string,
  cc?: string | null
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  // Send to parent_email; CC the camper's own email when we have one and it's
  // different so the camper sees the confirmation too.
  const ccList = cc && cc.trim().toLowerCase() !== to.trim().toLowerCase() ? cc : undefined;
  const infoUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/info`;
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    cc: ccList,
    subject: 'Power Camp 2026 — registration received',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      "We've received your Power Camp 2026 registration — thank you!",
      '',
      'Your spot is provisionally held. Your registration will be CONFIRMED once payment',
      'is complete.',
      '',
      `For payment details and everything you need to know, head to the camp info page:`,
      infoUrl,
      '',
      'Need to change something later? You can update your details anytime — go back to the',
      'registration page, search your name, and request a sign-in link. Editing does NOT affect',
      'your registration or your spot.',
      '',
      '— Power Camp',
    ].join('\n'),
    html: registrationReceivedHtml(firstName || 'there', infoUrl),
  });
}

// Sent when an EXISTING current-year registration is edited (vs a brand-new
// one). Reassures the family the change saved, without re-stating "we've
// received your registration" — which reads as a confusing duplicate.
export async function sendRegistrationUpdated(
  to: string,
  firstName: string,
  cc?: string | null,
  changes?: CamperChange[]
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  const ccList = cc && cc.trim().toLowerCase() !== to.trim().toLowerCase() ? cc : undefined;
  const infoUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/info`;
  const list = changes ?? [];
  // Plain-text "what changed" block — only when we have changes to show.
  const changeLines = list.length
    ? ['', "Here's what changed:", ...list.map((c) => `  • ${c.label}: ${c.from || '(blank)'} → ${c.to || '(blank)'}`), '']
    : [];
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    cc: ccList,
    subject: 'Power Camp 2026 — your details were updated',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'Your Power Camp 2026 registration details have been updated — thank you.',
      ...changeLines,
      "Nothing else is needed. Your spot remains held; it's confirmed once payment is",
      'complete. Payment details and camp info are here:',
      infoUrl,
      '',
      "If you didn't make this change, request a sign-in link from the registration page",
      'and review your details.',
      '',
      '— Power Camp',
    ].join('\n'),
    html: registrationUpdatedHtml(firstName || 'there', infoUrl, list),
  });
}

// Renders the "what changed" rows as an HTML table (old → new). Empty values
// render as a muted "(blank)" so a cleared field reads sensibly. Returns ''
// when there's nothing to show, so the email simply omits the section.
function changesHtml(changes: CamperChange[]): string {
  if (!changes.length) return '';
  const blank = '<span style="color:#9ca3af;">(blank)</span>';
  const rows = changes
    .map(
      (c) => `<tr>
        <td style="padding:6px 12px 6px 0; color:#6b7280; font-size:13px; vertical-align:top; white-space:nowrap;">${escapeHtml(c.label)}</td>
        <td style="padding:6px 0; color:#374151; font-size:14px;">
          ${c.from ? escapeHtml(c.from) : blank}
          <span style="color:#9ca3af;">&rarr;</span>
          <strong>${c.to ? escapeHtml(c.to) : blank}</strong>
        </td>
      </tr>`
    )
    .join('\n');
  return `<div style="margin:0 0 16px 0; background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px;">
    <p style="margin:0 0 6px 0; color:#111827; font-size:14px; font-weight:600;">What changed</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
  </div>`;
}

function registrationUpdatedHtml(
  firstName: string,
  infoUrl: string,
  changes: CamperChange[] = []
): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px 0; font-size:22px; color:#111827;">Your details were updated</h1>
                <p style="margin:0 0 16px 0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, your Power Camp 2026 registration details have been updated — thank you. Nothing else is needed; your spot remains held and is confirmed once payment is complete.
                </p>
                ${changesHtml(changes)}
                <a href="${infoUrl}" style="display:inline-block; background-color:#16a34a; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 24px; border-radius:8px;">
                  View camp info &amp; payment details
                </a>
                <p style="margin:16px 0 0 0; color:#6b7280; font-size:13px; line-height:20px;">
                  If you didn't make this change, request a sign-in link from the registration page and review your details.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:16px 0 0 0; color:#9ca3af; font-size:12px;">— Power Camp</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function registrationReceivedHtml(firstName: string, infoUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px 0; font-size:22px; color:#111827;">Registration received</h1>
                <p style="margin:0 0 12px 0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, thanks for registering for Power Camp 2026.
                </p>
                <p style="margin:0 0 12px 0; color:#374151; font-size:15px; line-height:22px;">
                  Your spot is <strong>provisionally held</strong>. Your registration will be
                  <strong>confirmed once payment is complete</strong>.
                </p>
                <p style="margin:0 0 16px 0; color:#374151; font-size:15px; line-height:22px;">
                  For payment details and everything you need to know, head to the camp info page.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 20px 32px;">
                <a href="${infoUrl}"
                   style="display:inline-block; background-color:#16a34a; color:#ffffff; text-decoration:none; font-weight:600; font-size:16px; padding:14px 28px; border-radius:8px;">
                  View camp info &amp; payment details
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0; color:#374151; font-size:14px; line-height:21px;">
                  <strong>Need to change something later?</strong> You can update your details
                  anytime — go back to the registration page, search your name, and request a
                  sign-in link. Editing your details does <strong>not</strong> affect your
                  registration or your spot.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendPaymentConfirmed(
  to: string,
  firstName: string,
  cc?: string | null
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  const ccList = cc && cc.trim().toLowerCase() !== to.trim().toLowerCase() ? cc : undefined;
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    cc: ccList,
    subject: 'Power Camp 2026 — payment confirmed 🎉',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'Your payment for Power Camp 2026 has been confirmed — your spot is locked in!',
      '',
      `See you at camp from Friday 31 July to Sunday 2 August 2026.`,
      `If anything changes between now and then, request a sign-in link from the`,
      'registration page and update your details.',
      '',
      '— Power Camp',
    ].join('\n'),
    html: paymentConfirmedHtml(firstName || 'there'),
  });
}

function paymentConfirmedHtml(firstName: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px 0; font-size:22px; color:#111827;">Payment confirmed 🎉</h1>
                <p style="margin:0 0 12px 0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, your payment for Power Camp 2026 has been received and your spot is <strong>locked in</strong>.
                </p>
                <p style="margin:0 0 12px 0; color:#374151; font-size:15px; line-height:22px;">
                  Mark your calendar — Power Camp 2026 runs <strong>Friday 31 July – Sunday 2 August 2026</strong>.
                </p>
                <p style="margin:0; color:#6b7280; font-size:13px; line-height:20px;">
                  If anything changes between now and then, request a sign-in link from the
                  registration page and update your details.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// =====================================================================
// Leader application — Neil-facing notifications + leader-side invites.
// =====================================================================

// Sent to Neil whenever someone submits the public /leader-apply form.
// Keeps Neil in the loop without him having to refresh the admin page.
export async function sendLeaderApplicationNotice(
  neilEmail: string,
  applicant: { firstName: string; lastName: string; email: string; church?: string; applicationNotes?: string }
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  const subject = `Power Camp leader application — ${applicant.firstName} ${applicant.lastName}`;
  const lines = [
    `${applicant.firstName} ${applicant.lastName} has applied to lead at Power Camp 2026.`,
    '',
    `Email: ${applicant.email}`,
    applicant.church ? `Church: ${applicant.church}` : '',
    '',
    'They have been asked to email you directly with why they want to lead —',
    'check your inbox for a message from them before approving.',
    '',
    'When you are ready, review and approve in the admin panel. Once approved,',
    'send them an invite link from there and they will fill in the rest of their',
    'details (cell, age, t-shirt, etc.) themselves.',
  ].filter(Boolean).join('\n');

  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to: neilEmail,
    subject,
    text: lines,
    html: leaderApplicationNoticeHtml(applicant),
  });
}

function leaderApplicationNoticeHtml(applicant: {
  firstName: string;
  lastName: string;
  email: string;
  church?: string;
}): string {
  const fullName = `${applicant.firstName} ${applicant.lastName}`;
  const churchRow = applicant.church
    ? `<tr><td style="padding:4px 0; color:#6b7280; font-size:13px; width:90px;">Church</td><td style="padding:4px 0; color:#374151; font-size:14px;">${escapeHtml(applicant.church)}</td></tr>`
    : '';
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 4px 0; font-size:22px; color:#111827;">New leader application</h1>
                <p style="margin:0; color:#6b7280; font-size:14px;">Power Camp 2026</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:4px 0; color:#6b7280; font-size:13px; width:90px;">Applicant</td>
                    <td style="padding:4px 0; color:#111827; font-size:15px; font-weight:600;">${escapeHtml(fullName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; color:#6b7280; font-size:13px;">Email</td>
                    <td style="padding:4px 0; color:#374151; font-size:14px;">
                      <a href="mailto:${escapeHtml(applicant.email)}" style="color:#16a34a; text-decoration:none;">${escapeHtml(applicant.email)}</a>
                    </td>
                  </tr>
                  ${churchRow}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <div style="background-color:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px;">
                  <p style="margin:0; color:#78350f; font-size:14px; line-height:20px;">
                    They've been asked to <strong>email you directly</strong> with why they want to lead.
                    Check your inbox for a message from them before approving.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px;">
                <p style="margin:0; color:#374151; font-size:14px; line-height:22px;">
                  When you're ready, review and approve in the admin panel. Once approved, send them an invite
                  link from there and they'll fill in the rest of their details themselves.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp Admin</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Sent TO the leader after Neil clicks Invite. Magic link drops them on
// /leader-register?token=… so they can finish their full registration
// (t-shirt size, emergency contact, dietary, etc.).
export async function sendLeaderInvite(
  to: string,
  firstName: string,
  url: string
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    subject: 'Power Camp 2026 — you are invited to lead',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'Great news — your Power Camp leader application has been approved.',
      '',
      'Click this link to finish your registration:',
      url,
      '',
      'The link is valid for 7 days. If anything goes wrong, reply to this email',
      'and we will sort it out.',
      '',
      '— Power Camp',
    ].join('\n'),
    html: leaderInviteHtml(firstName || 'there', url),
  });
}

function leaderInviteHtml(firstName: string, url: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px 32px;">
                <h1 style="margin:0 0 8px 0; font-size:22px; color:#111827;">You're invited to lead</h1>
                <p style="margin:0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, your application has been approved. Click below to finish your Power Camp 2026 registration.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px 32px;">
                <a href="${url}" style="display:inline-block; background-color:#16a34a; color:#ffffff; text-decoration:none; font-weight:600; font-size:16px; padding:14px 28px; border-radius:8px;">
                  Finish my registration
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0 0 8px 0; color:#6b7280; font-size:13px; line-height:20px;">
                  The link is valid for 7 days. If the button doesn't work, paste this URL into your browser:
                </p>
                <p style="margin:0; color:#374151; font-size:13px; word-break:break-all;">
                  <a href="${url}" style="color:#374151;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Receipt to Neil after he clicks Invite — closes the loop on the admin
// side ("yes the invite went out, here is a copy of what they got").
export async function sendInviteSentReceipt(
  neilEmail: string,
  leader: { firstName: string; lastName: string; email: string }
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to: neilEmail,
    subject: `Invite sent — ${leader.firstName} ${leader.lastName}`,
    text: [
      `An invite email has just been sent to ${leader.firstName} ${leader.lastName} (${leader.email}).`,
      '',
      'They have a 7-day window to follow the magic link and finish their registration.',
      '',
      '— Power Camp Admin',
    ].join('\n'),
    html: inviteSentReceiptHtml(leader),
  });
}

function inviteSentReceiptHtml(leader: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  const fullName = `${leader.firstName} ${leader.lastName}`;
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 4px 0; font-size:22px; color:#111827;">Leader invite sent</h1>
                <p style="margin:0; color:#6b7280; font-size:14px;">Power Camp 2026</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <div style="background-color:#dcfce7; border-left:4px solid #16a34a; padding:12px 16px; border-radius:6px;">
                  <p style="margin:0; color:#14532d; font-size:14px; line-height:20px;">
                    A registration invite has just been emailed to <strong>${escapeHtml(fullName)}</strong>.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:4px 0; color:#6b7280; font-size:13px; width:90px;">Sent to</td>
                    <td style="padding:4px 0; color:#374151; font-size:14px;">
                      <a href="mailto:${escapeHtml(leader.email)}" style="color:#16a34a; text-decoration:none;">${escapeHtml(leader.email)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; color:#6b7280; font-size:13px;">Link valid</td>
                    <td style="padding:4px 0; color:#374151; font-size:14px;">7 days</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px;">
                <p style="margin:0; color:#374151; font-size:14px; line-height:22px;">
                  They'll follow the magic link in their inbox to finish their registration
                  (cell, age, t-shirt size, etc.). If they don't act inside the window,
                  re-issue the invite from the admin panel.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp Admin</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Sent to a leader applicant the moment they submit /leaders/apply, so they
// get an immediate acknowledgement instead of silence while they wait for
// Neil to review. Reminds them to email Neil their motivation — without that,
// Neil can't approve them.
export async function sendLeaderApplicationReceived(
  to: string,
  firstName: string
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  const neilEmail = env.NEIL_EMAIL ?? env.GMAIL_USER;
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    subject: 'Power Camp 2026 — we received your leader application',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      "Thanks for applying to lead at Power Camp 2026! Your application is now",
      "with Neil for review.",
      '',
      `One important next step: please email Neil at ${neilEmail} and tell him`,
      "why you'd like to lead this year. He can't approve your application without it.",
      '',
      "Once you're approved, you'll get a follow-up email with a link to finish",
      'your registration.',
      '',
      '— Power Camp',
    ].join('\n'),
    html: leaderApplicationReceivedHtml(firstName || 'there', neilEmail),
  });
}

function leaderApplicationReceivedHtml(firstName: string, neilEmail: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 8px 0; font-size:22px; color:#111827;">Application received</h1>
                <p style="margin:0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, thanks for applying to lead at Power Camp 2026. Your application is now with Neil for review.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 8px 32px;">
                <div style="background-color:#fef9c3; border-left:4px solid #ca8a04; padding:12px 16px; border-radius:6px;">
                  <p style="margin:0; color:#713f12; font-size:14px; line-height:20px;">
                    <strong>One more step:</strong> email Neil at
                    <a href="mailto:${escapeHtml(neilEmail)}" style="color:#854d0e;">${escapeHtml(neilEmail)}</a>
                    and tell him why you'd like to lead. He can't approve your application without it.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px;">
                <p style="margin:0; color:#374151; font-size:14px; line-height:22px;">
                  Once you're approved, you'll get a follow-up email with a link to finish your registration.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Sent to a leader applicant when Neil rejects their application. Kept warm
// and brief — a decline, not a door slammed.
export async function sendLeaderRejection(
  to: string,
  firstName: string
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  const neilEmail = env.NEIL_EMAIL ?? env.GMAIL_USER;
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    subject: 'Power Camp 2026 — your leader application',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'Thank you for applying to lead at Power Camp 2026. After careful',
      'consideration, we are not able to offer you a leader place this year.',
      '',
      'We appreciate the time you took to apply and wish you everything of the best.',
      '',
      `If you have any questions, you can contact Neil at ${neilEmail}.`,
      '',
      '— Power Camp',
    ].join('\n'),
    html: leaderRejectionHtml(firstName || 'there', neilEmail),
  });
}

function leaderRejectionHtml(firstName: string, neilEmail: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px 32px;">
                <h1 style="margin:0 0 8px 0; font-size:22px; color:#111827;">Your leader application</h1>
                <p style="margin:0 0 12px 0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, thank you for applying to lead at Power Camp 2026. After careful consideration, we are not able to offer you a leader place this year.
                </p>
                <p style="margin:0; color:#374151; font-size:15px; line-height:22px;">
                  We appreciate the time you took to apply and wish you everything of the best. If you have any questions, you can contact Neil at
                  <a href="mailto:${escapeHtml(neilEmail)}" style="color:#16a34a;">${escapeHtml(neilEmail)}</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Sent when a leader completes /leaders/register (fills in cell/age/t-shirt/
// emergency contact after approval). Closes the loop so they know the camp
// has their full details and nothing else is outstanding.
export async function sendLeaderRegistrationComplete(
  to: string,
  firstName: string
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    subject: 'Power Camp 2026 — your leader registration is complete',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      "You're all set — your Power Camp 2026 leader registration is complete and we",
      'have your details. Thank you for stepping up to lead!',
      '',
      "Neil will be in touch closer to the date (31 July – 2 August 2026) with",
      'logistics. If anything changes, just reply to this email.',
      '',
      'See you at camp.',
      '',
      '— Power Camp',
    ].join('\n'),
    html: leaderRegistrationCompleteHtml(firstName || 'there'),
  });
}

function leaderRegistrationCompleteHtml(firstName: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 8px 0; font-size:22px; color:#111827;">You're all set to lead 🎉</h1>
                <p style="margin:0; color:#374151; font-size:15px; line-height:22px;">
                  Hi ${escapeHtml(firstName)}, your Power Camp 2026 leader registration is complete and we have your details. Thank you for stepping up to lead!
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px;">
                <p style="margin:0; color:#374151; font-size:14px; line-height:22px;">
                  Neil will be in touch closer to the date (31 July – 2 August 2026) with logistics. If anything changes, just reply to this email. See you at camp.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// =====================================================================
// Bulk email — admin composer.
// =====================================================================

export type EmailBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'button'; text: string; url: string }
  | { kind: 'divider' };

export function renderBlocksToHtml(
  subject: string,
  blocks: EmailBlock[],
  unsubscribeUrl?: string
): string {
  const body = blocks
    .map((b) => {
      switch (b.kind) {
        case 'heading':
          return `<h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">${escapeHtml(b.text)}</h2>`;
        case 'paragraph':
          return `<p style="margin:0 0 14px 0; color:#374151; font-size:15px; line-height:22px;">${escapeHtml(b.text).replace(/\n/g, '<br>')}</p>`;
        case 'button':
          return `<p style="margin:18px 0; text-align:center;"><a href="${escapeAttr(b.url)}" style="display:inline-block; background-color:#16a34a; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 24px; border-radius:8px;">${escapeHtml(b.text)}</a></p>`;
        case 'divider':
          return `<hr style="margin:18px 0; border:none; border-top:1px solid #e5e7eb;">`;
        default:
          return '';
      }
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:24px 32px 4px 32px;">
                <h1 style="margin:0; font-size:14px; color:#3D71D9; letter-spacing:0.06em; text-transform:uppercase;">Power Camp 2026</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">— Power Camp · ${escapeHtml(subject)}</p>
                ${unsubscribeUrl ? `<p style="margin:8px 0 0 0; color:#9ca3af; font-size:11px;">Don't want these? <a href="${escapeAttr(unsubscribeUrl)}" style="color:#9ca3af; text-decoration:underline;">Unsubscribe</a>.</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export async function sendBulkEmail(
  subject: string,
  recipients: string[],
  renderFor: (email: string) => { html: string; text: string }
): Promise<{ sent: number; failed: { to: string; error: string }[] }> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  let sent = 0;
  const failed: { to: string; error: string }[] = [];

  for (const to of recipients) {
    try {
      const { html, text } = renderFor(to);
      await safeSendMail({
        from: `"${fromName}" <${env.GMAIL_USER}>`,
        to,
        subject,
        html,
        text,
      });
      sent++;
      // Gentle pacing — Gmail SMTP throttles past ~500/day; even within the
      // limit, hammering causes intermittent 421s. 700ms keeps us safe and
      // still fast enough for ~150 recipients in under 2 minutes.
      await new Promise((resolve) => setTimeout(resolve, 700));
    } catch (err) {
      failed.push({ to, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { sent, failed };
}

export function blocksToPlainText(blocks: EmailBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.kind) {
        case 'heading':
          return `\n${b.text.toUpperCase()}\n`;
        case 'paragraph':
          return b.text;
        case 'button':
          return `${b.text}: ${b.url}`;
        case 'divider':
          return '\n---\n';
        default:
          return '';
      }
    })
    .join('\n\n');
}

// Notifies the camp admin mailbox that a family has asked to join the
// waiting list (registrations being closed). Best-effort, like the other
// notification sends — the row is already persisted before this runs.
export async function sendWaitlistNotification(
  to: string,
  entry: {
    camperName: string;
    parentName?: string | null;
    parentEmail: string;
    phone?: string | null;
    grade?: string | null;
    note?: string | null;
  }
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  const lines = [
    'A new waiting-list request has come in for Power Camp:',
    '',
    `Camper: ${entry.camperName}`,
    `Parent/guardian: ${entry.parentName || '—'}`,
    `Parent email: ${entry.parentEmail}`,
    `Phone: ${entry.phone || '—'}`,
    `Grade: ${entry.grade || '—'}`,
    `Note: ${entry.note || '—'}`,
    '',
    'They appear in the admin Waiting List view.',
    '',
    '— Power Camp',
  ];
  await safeSendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    replyTo: entry.parentEmail,
    subject: `Power Camp waiting list — ${entry.camperName}`,
    text: lines.join('\n'),
  });
}

// Test seam.
export function _resetEmailTransporter(): void {
  cached = null;
}
