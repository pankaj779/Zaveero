import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { ContactFormData } from "./types";
import type { Quotation, QuotationItem } from "@prisma/client";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildItemRows(items: QuotationItem[]) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(item.itemName)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(item.unit)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">₹${item.rate.toLocaleString("en-IN")}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(item.notes)}</td>
      </tr>`
    )
    .join("");
}

function buildQuotationHtml(quotation: Quotation & { items: QuotationItem[] }) {
  const itemRows = buildItemRows(quotation.items);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #C9A962; border-bottom: 2px solid #C9A962; padding-bottom: 10px;">
        Quotation ${escapeHtml(quotation.referenceCode)} — Sanjana Stone Arts
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px 0; font-weight: bold;">Reference</td><td>${escapeHtml(quotation.referenceCode)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Client</td><td>${escapeHtml(quotation.clientName)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email</td><td>${escapeHtml(quotation.clientEmail || "—")}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Phone</td><td>${escapeHtml(quotation.clientPhone)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Project</td><td>${escapeHtml(quotation.projectTitle)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Location</td><td>${escapeHtml(quotation.location)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Service</td><td>${escapeHtml(quotation.serviceType)}</td></tr>
      </table>
      <p style="font-weight: bold;">Work Description:</p>
      <p style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px;">${escapeHtml(quotation.description)}</p>
      <p style="font-weight: bold;">Line Items:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Item</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Unit</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Qty</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Rate</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Notes</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
  `;
}

function quotationText(quotation: Quotation & { items: QuotationItem[] }) {
  return [
    `Reference: ${quotation.referenceCode}`,
    `Client: ${quotation.clientName}`,
    `Phone: ${quotation.clientPhone}`,
    `Email: ${quotation.clientEmail || "—"}`,
    `Project: ${quotation.projectTitle}`,
    `Location: ${quotation.location}`,
    `Service: ${quotation.serviceType}`,
    "",
    `Description:\n${quotation.description}`,
    "",
    "Line Items:",
    ...quotation.items.map(
      (i) => `- ${i.itemName} | ${i.unit} | Qty: ${i.quantity} | Rate: ₹${i.rate} | ${i.notes}`
    ),
  ].join("\n");
}

async function sendEmailViaResend(options: {
  subject: string;
  html: string;
  to: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

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
  if (!user || !pass) return false;

  const transporter = nodemailer.createTransport({
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

async function sendEmail(options: {
  subject: string;
  html: string;
  text: string;
  to: string;
  replyTo?: string;
}) {
  if (
    await sendEmailViaResend({
      subject: options.subject,
      html: options.html,
      to: options.to,
      replyTo: options.replyTo,
    })
  ) {
    return { success: true, provider: "resend" };
  }

  if (await sendEmailViaSmtp(options)) {
    return { success: true, provider: "smtp" };
  }

  throw new Error(
    "Email service is not configured. Add RESEND_API_KEY or SMTP_USER/SMTP_PASS to your .env file."
  );
}

export async function sendContactEmail(data: ContactFormData) {
  const to = process.env.CONTACT_EMAIL_TO ?? "prajapathipankaj321@gmail.com";
  return sendEmail({
    subject: `New Inquiry from ${data.name} — ${data.service}`,
    html: buildContactHtml(data),
    text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nService: ${data.service}\n\nMessage:\n${data.message}`,
    to,
    replyTo: data.email,
  });
}

function buildContactHtml(data: ContactFormData) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #C9A962; border-bottom: 2px solid #C9A962; padding-bottom: 10px;">
        New Contact Inquiry — Sanjana Stone Arts
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold;">Name</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email</td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Phone</td><td>${escapeHtml(data.phone)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Service</td><td>${escapeHtml(data.service)}</td></tr>
      </table>
      <div style="margin-top: 20px;">
        <p style="font-weight: bold;">Message:</p>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 4px;">${escapeHtml(data.message)}</p>
      </div>
    </div>
  `;
}

export async function sendQuotationToOwner(quotation: Quotation & { items: QuotationItem[] }) {
  const to = process.env.CONTACT_EMAIL_TO ?? "prajapathipankaj321@gmail.com";
  const html = buildQuotationHtml(quotation);
  const text = quotationText(quotation);

  return sendEmail({
    subject: `New Quotation ${quotation.referenceCode} from ${quotation.clientName}`,
    html,
    text,
    to,
    replyTo: quotation.clientEmail || undefined,
  });
}

export async function sendQuotationConfirmationToClient(
  quotation: Quotation & { items: QuotationItem[] }
) {
  if (!quotation.clientEmail) return;

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const trackUrl = `${baseUrl}/get-quote/track?ref=${encodeURIComponent(quotation.referenceCode)}`;

  const html = `
    ${buildQuotationHtml(quotation)}
    <p style="margin-top: 24px; font-size: 14px;">
      Save your reference number: <strong>${escapeHtml(quotation.referenceCode)}</strong><br/>
      Track your quote anytime: <a href="${trackUrl}">${trackUrl}</a>
    </p>
  `;

  return sendEmail({
    subject: `Your Quotation ${quotation.referenceCode} — Sanjana Stone Arts`,
    html,
    text: `${quotationText(quotation)}\n\nTrack: ${trackUrl}`,
    to: quotation.clientEmail,
    replyTo: process.env.CONTACT_EMAIL_TO,
  });
}
