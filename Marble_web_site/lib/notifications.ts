import { sendOwnerWhatsApp } from "./whatsapp";

type OwnerNotificationInput = {
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

async function sendEmailViaResend(options: {
  subject: string;
  html: string;
  to: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
  });

  return true;
}

async function sendEmailViaSmtp(options: {
  subject: string;
  html: string;
  text: string;
  to: string;
  replyTo?: string;
}) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass || pass.includes("your-gmail-app-password")) return false;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Sanjana Stone Arts Website" <${user}>`,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return true;
}

async function sendOwnerEmail(input: OwnerNotificationInput) {
  const to = process.env.CONTACT_EMAIL_TO ?? "prajapathipankaj321@gmail.com";
  const html =
    input.html ??
    `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${input.text.replace(/</g, "&lt;")}</div>`;

  if (
    await sendEmailViaResend({
      subject: input.subject,
      html,
      to,
      replyTo: input.replyTo,
    })
  ) {
    return { success: true, provider: "resend" as const };
  }

  if (
    await sendEmailViaSmtp({
      subject: input.subject,
      html,
      text: input.text,
      to,
      replyTo: input.replyTo,
    })
  ) {
    return { success: true, provider: "smtp" as const };
  }

  throw new Error(
    "Email is not configured. Add SMTP_USER/SMTP_PASS or RESEND_API_KEY to your .env file."
  );
}

export async function notifyOwner(input: OwnerNotificationInput) {
  let emailed = false;
  let whatsapped = false;
  let emailError: string | null = null;
  let whatsappError: string | null = null;

  try {
    await sendOwnerEmail(input);
    emailed = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : "Email delivery failed";
    console.error("[Notify]", emailError);
  }

  try {
    whatsapped = await sendOwnerWhatsApp(`${input.subject}\n\n${input.text}`);
  } catch (err) {
    whatsappError = err instanceof Error ? err.message : "WhatsApp delivery failed";
    console.error("[Notify]", whatsappError);
  }

  return { emailed, whatsapped, emailError, whatsappError };
}
