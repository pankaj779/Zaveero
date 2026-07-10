export interface EmailVerificationTemplateInput {
  appName: string;
  recipientName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export function buildEmailVerificationHtml(
  input: EmailVerificationTemplateInput,
): string {
  const { appName, recipientName, verificationUrl, expiresInHours } = input;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your email</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:32px 28px 12px;font-size:22px;letter-spacing:0.02em;">
                ${escapeHtml(appName)}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;font-size:18px;">
                Verify your email
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;color:#333333;">
                Hi ${escapeHtml(recipientName)},
                <br /><br />
                Please confirm your email address to finish setting up your account.
                This link expires in ${String(expiresInHours)} hours.
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;">
                <a href="${escapeHtml(verificationUrl)}" style="display:inline-block;background:#1f3a2e;color:#ffffff;text-decoration:none;padding:12px 20px;font-size:14px;">
                  Verify email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font-size:12px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;color:#6b7280;">
                If the button does not work, copy and paste this URL into your browser:
                <br />
                <span style="word-break:break-all;">${escapeHtml(verificationUrl)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildEmailVerificationText(
  input: EmailVerificationTemplateInput,
): string {
  return [
    `Hi ${input.recipientName},`,
    '',
    `Please verify your email for ${input.appName}.`,
    `This link expires in ${String(input.expiresInHours)} hours:`,
    input.verificationUrl,
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
