import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../env';

let cached: Transporter | null = null;

function transporter(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  });
  return cached;
}

export async function sendMagicLink(to: string, firstName: string, url: string): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  await transporter().sendMail({
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

export async function sendRegistrationReceived(to: string, firstName: string): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  await transporter().sendMail({
    from: `"${fromName}" <${env.GMAIL_USER}>`,
    to,
    subject: 'Power Camp 2026 — registration received',
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      "We've received your Power Camp 2026 registration — thank you!",
      '',
      'Your spot is provisionally held. Your registration will be CONFIRMED once payment',
      'is complete. We will follow up shortly with payment details.',
      '',
      'If anything looks wrong, request a sign-in link from the registration page',
      'and update your details.',
      '',
      '— Power Camp',
    ].join('\n'),
    html: registrationReceivedHtml(firstName || 'there'),
  });
}

function registrationReceivedHtml(firstName: string): string {
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
                  <strong>confirmed once payment is complete</strong>. We'll follow up shortly with
                  payment details.
                </p>
                <p style="margin:0; color:#6b7280; font-size:13px; line-height:20px;">
                  If anything looks wrong, request a sign-in link from the registration page
                  and update your details.
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

// Test seam.
export function _resetEmailTransporter(): void {
  cached = null;
}
