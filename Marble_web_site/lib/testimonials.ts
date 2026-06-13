import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/notifications";

export type PublicTestimonialInput = {
  name: string;
  role?: string;
  quote: string;
  rating: number;
};

export async function submitPublicTestimonial(data: PublicTestimonialInput) {
  const testimonial = await prisma.testimonial.create({
    data: {
      name: data.name.trim(),
      role: data.role?.trim() || "Client",
      quote: data.quote.trim(),
      rating: Math.min(5, Math.max(1, Math.round(data.rating))),
      status: "pending",
      sortOrder: 999,
    },
  });

  const stars = "★".repeat(testimonial.rating) + "☆".repeat(5 - testimonial.rating);
  const text = [
    `Name: ${testimonial.name}`,
    `Role: ${testimonial.role}`,
    `Rating: ${stars} (${testimonial.rating}/5)`,
    "",
    `"${testimonial.quote}"`,
    "",
    "Approve it in Admin → Testimonials to show on the website.",
  ].join("\n");

  const { emailed, whatsapped } = await notifyOwner({
    subject: `New client review from ${testimonial.name}`,
    text,
    replyTo: undefined,
  });

  return { testimonial, emailed, whatsapped };
}

export async function approveTestimonial(id: string) {
  return prisma.testimonial.update({
    where: { id },
    data: { status: "approved" },
  });
}

export async function rejectTestimonial(id: string) {
  return prisma.testimonial.delete({ where: { id } });
}
