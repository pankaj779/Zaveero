import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/notifications";
import { sendQuotationConfirmationToClient } from "./email";
import { normalizePhone } from "./utils";

export type QuotationItemInput = {
  itemName: string;
  unit: string;
  quantity: number;
  rate: number;
  notes?: string;
};

export type GuestQuotationInput = {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  projectTitle: string;
  location: string;
  serviceType: string;
  description: string;
  items: QuotationItemInput[];
};

async function generateReferenceCode(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await prisma.quotation.count();
    const code = `SSA-${year}-${String(count + 1 + attempt).padStart(4, "0")}`;
    const exists = await prisma.quotation.findFirst({ where: { referenceCode: code } });
    if (!exists) return code;
  }
  return `SSA-${year}-${Date.now().toString().slice(-4)}`;
}

export async function saveAndSendGuestQuotation(data: GuestQuotationInput) {
  const referenceCode = await generateReferenceCode();
  const clientPhone = normalizePhone(data.clientPhone);

  const quotation = await prisma.quotation.create({
    data: {
      referenceCode,
      clientName: data.clientName.trim(),
      clientPhone,
      clientEmail: data.clientEmail?.trim() ?? "",
      projectTitle: data.projectTitle.trim(),
      location: data.location.trim(),
      serviceType: data.serviceType,
      description: data.description.trim(),
      items: {
        create: data.items.map((item) => ({
          itemName: item.itemName.trim(),
          unit: item.unit.trim(),
          quantity: item.quantity,
          rate: item.rate,
          notes: item.notes?.trim() ?? "",
        })),
      },
    },
    include: { items: true },
  });

  let emailed = false;
  let whatsapped = false;
  let clientEmailed = false;
  let emailError: string | null = null;
  let whatsappError: string | null = null;

  const ownerText = [
    `Reference: ${quotation.referenceCode}`,
    `Client: ${quotation.clientName}`,
    `Phone: ${quotation.clientPhone}`,
    `Email: ${quotation.clientEmail || "—"}`,
    `Project: ${quotation.projectTitle}`,
    `Location: ${quotation.location}`,
    `Services: ${quotation.serviceType}`,
    "",
    `Description:\n${quotation.description}`,
    "",
    "Line Items:",
    ...quotation.items.map(
      (i) => `- ${i.itemName} | ${i.unit} | Qty: ${i.quantity} | Rate: ₹${i.rate}`
    ),
  ].join("\n");

  try {
    const result = await notifyOwner({
      subject: `New quotation ${quotation.referenceCode} from ${quotation.clientName}`,
      text: ownerText,
      replyTo: quotation.clientEmail || undefined,
    });
    emailed = result.emailed;
    whatsapped = result.whatsapped;
    emailError = result.emailError;
    whatsappError = result.whatsappError;

    if (quotation.clientEmail) {
      await sendQuotationConfirmationToClient(quotation);
      clientEmailed = true;
    }
    if (emailed) {
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: { emailed: true },
      });
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : "Notification delivery failed";
    console.error("[Quotation]", emailError);
  }

  return { quotation, emailed, whatsapped, clientEmailed, emailError, whatsappError };
}

export async function lookupGuestQuotation(referenceCode: string, phone: string) {
  const normalized = normalizePhone(phone);
  const quotation = await prisma.quotation.findUnique({
    where: { referenceCode: referenceCode.trim().toUpperCase() },
    include: { items: true },
  });

  if (!quotation || quotation.clientPhone !== normalized) {
    return null;
  }

  return quotation;
}

export async function getQuotations() {
  return prisma.quotation.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuotationCount() {
  return prisma.quotation.count();
}
