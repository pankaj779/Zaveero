import { prisma } from "@/lib/prisma";
import type { PricingItemRecord, ProjectRecord, TestimonialRecord } from "@/lib/types";
import { parseJsonArray } from "@/lib/utils";

function mapProject(project: {
  id: string;
  name: string;
  clientName: string;
  location: string;
  description: string;
  category: string;
  photos: string;
  videos: string;
  featured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): ProjectRecord {
  return {
    ...project,
    photos: parseJsonArray(project.photos),
    videos: parseJsonArray(project.videos),
  };
}

export async function getProjects(): Promise<ProjectRecord[]> {
  const projects = await prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return projects.map(mapProject);
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const project = await prisma.project.findUnique({ where: { id } });
  return project ? mapProject(project) : null;
}

export async function getPricingItems(): Promise<PricingItemRecord[]> {
  return prisma.pricingItem.findMany({
    orderBy: [{ materialType: "asc" }, { category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getTestimonials(): Promise<TestimonialRecord[]> {
  return prisma.testimonial.findMany({
    where: { status: "approved" },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllTestimonials(): Promise<TestimonialRecord[]> {
  return prisma.testimonial.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getDashboardStats() {
  const [projectCount, pricingCount, testimonialCount, inquiryCount, quotationCount] =
    await Promise.all([
      prisma.project.count(),
      prisma.pricingItem.count(),
      prisma.testimonial.count(),
      prisma.contactInquiry.count(),
      prisma.quotation.count(),
    ]);
  return { projectCount, pricingCount, testimonialCount, inquiryCount, quotationCount };
}
