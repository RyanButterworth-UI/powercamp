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

export async function sendRegistrationReceived(
  to: string,
  firstName: string,
  cc?: string | null
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  // Send to parent_email; CC the camper's own email when we have one and it's
  // different so the camper sees the confirmation too.
  const ccList = cc && cc.trim().toLowerCase() !== to.trim().toLowerCase() ? cc : undefined;
  await transporter().sendMail({
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

export async function sendPaymentConfirmed(
  to: string,
  firstName: string,
  cc?: string | null
): Promise<void> {
  const fromName = env.FROM_NAME ?? 'Power Camp';
  const ccList = cc && cc.trim().toLowerCase() !== to.trim().toLowerCase() ? cc : undefined;
  await transporter().sendMail({
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
      await transporter().sendMail({
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

// Test seam.
export function _resetEmailTransporter(): void {
  cached = null;
}
