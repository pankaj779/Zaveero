import { prisma } from "@/lib/prisma";
import type { ContactFormData } from "@/lib/types";
import { notifyOwner } from "./notifications";

export async function saveAndSendInquiry(data: ContactFormData) {
  const inquiry = await prisma.contactInquiry.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      service: data.service,
      message: data.message,
      emailed: false,
    },
  });

  const text = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Service: ${data.service}`,
    "",
    `Message:\n${data.message}`,
  ].join("\n");

  const { emailed, whatsapped, emailError, whatsappError } = await notifyOwner({
    subject: `New contact inquiry from ${data.name}`,
    text,
    replyTo: data.email,
  });

  if (emailed) {
    await prisma.contactInquiry.update({
      where: { id: inquiry.id },
      data: { emailed: true },
    });
  }

  return { inquiry, emailed, whatsapped, emailError, whatsappError };
}

export async function getInquiries() {
  return prisma.contactInquiry.findMany({
    orderBy: { createdAt: "desc" },
  });
}
