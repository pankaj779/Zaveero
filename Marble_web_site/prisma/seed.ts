import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { STONE_IMAGES } from "../lib/images";

const prisma = new PrismaClient();

const PROJECTS = [
  {
    name: "Luxury Villa Marble Flooring",
    clientName: "Private Residence",
    location: "Jaipur, Rajasthan",
    description:
      "Complete Italian marble flooring with book-matched patterns, inlay borders, and mirror-polish finish across 8,000 sq ft.",
    category: "marble",
    photos: JSON.stringify([
      STONE_IMAGES.marbleFloor,
      STONE_IMAGES.marbleInlay,
      STONE_IMAGES.marblePolish,
    ]),
    videos: JSON.stringify([]),
    featured: true,
    sortOrder: 1,
  },
  {
    name: "Hotel Lobby Granite Cladding",
    clientName: "Heritage Hotels Group",
    location: "Udaipur, Rajasthan",
    description:
      "Premium black granite wall cladding for a 5-star hotel lobby with precision edge detailing and stone feature panels.",
    category: "commercial",
    photos: JSON.stringify([
      STONE_IMAGES.graniteCladding,
      STONE_IMAGES.graniteFloor,
      STONE_IMAGES.commercialStone,
    ]),
    videos: JSON.stringify([]),
    featured: true,
    sortOrder: 2,
  },
  {
    name: "Penthouse Marble Staircase",
    clientName: "Mr. Sharma",
    location: "New Delhi",
    description:
      "Custom floating marble staircase with hand-crafted treads, risers, and imported Statuario marble throughout.",
    category: "residential",
    photos: JSON.stringify([
      STONE_IMAGES.marbleStaircase,
      STONE_IMAGES.marbleWall,
    ]),
    videos: JSON.stringify([]),
    featured: true,
    sortOrder: 3,
  },
  {
    name: "Corporate Office Granite Flooring",
    clientName: "TechCorp India",
    location: "Bangalore, Karnataka",
    description:
      "Granite flooring for 15,000 sq ft corporate office with anti-slip finish and professional stone laying.",
    category: "granite",
    photos: JSON.stringify([
      STONE_IMAGES.graniteFloor,
      STONE_IMAGES.graniteCounter,
    ]),
    videos: JSON.stringify([]),
    featured: false,
    sortOrder: 4,
  },
  {
    name: "Luxury Bathroom Tile & Stone",
    clientName: "Interior Design Studio",
    location: "Mumbai, Maharashtra",
    description:
      "Full bathroom with imported porcelain tiles, stone mosaic feature wall, and waterproof grouting.",
    category: "tiles",
    photos: JSON.stringify([
      STONE_IMAGES.tileBathroom,
      STONE_IMAGES.tileMosaic,
      STONE_IMAGES.tileFloor,
    ]),
    videos: JSON.stringify([]),
    featured: false,
    sortOrder: 5,
  },
  {
    name: "Marble Inlay Floor Design",
    clientName: "Fine Dining Group",
    location: "Pune, Maharashtra",
    description:
      "Intricate marble inlay flooring with geometric patterns, brass inlay accents, and premium polish work.",
    category: "marble",
    photos: JSON.stringify([
      STONE_IMAGES.marbleInlay,
      STONE_IMAGES.marbleFloor,
    ]),
    videos: JSON.stringify([]),
    featured: false,
    sortOrder: 6,
  },
];

const WITH_MATERIAL_PRICING = [
  { category: "marble", itemName: "Marble Flooring", unit: "SFT", rate: 280 },
  { category: "marble", itemName: "Marble Wall Cladding", unit: "SFT", rate: 320 },
  { category: "marble", itemName: "Marble Staircase (Tread + Riser)", unit: "RFT", rate: 4500 },
  { category: "marble", itemName: "Marble Skirting", unit: "RFT", rate: 180 },
  { category: "marble", itemName: "Marble Window Sill", unit: "RFT", rate: 350 },
  { category: "marble", itemName: "Marble Kitchen Countertop", unit: "RFT", rate: 2800 },
  { category: "marble", itemName: "Marble Vanity Top", unit: "RFT", rate: 2200 },
  { category: "granite", itemName: "Granite Flooring", unit: "SFT", rate: 220 },
  { category: "granite", itemName: "Granite Wall Cladding", unit: "SFT", rate: 280 },
  { category: "granite", itemName: "Granite Kitchen Countertop", unit: "RFT", rate: 2500 },
  { category: "granite", itemName: "Granite Vanity Top", unit: "RFT", rate: 2000 },
  { category: "granite", itemName: "Granite Window Sill", unit: "RFT", rate: 300 },
  { category: "granite", itemName: "Granite Staircase", unit: "RFT", rate: 4000 },
  { category: "tile", itemName: "Floor Tile Fixing", unit: "SFT", rate: 85 },
  { category: "tile", itemName: "Wall Tile Fixing", unit: "SFT", rate: 95 },
  { category: "tile", itemName: "Bathroom Tile (Full)", unit: "SFT", rate: 120 },
  { category: "tile", itemName: "Kitchen Backsplash Tile", unit: "SFT", rate: 110 },
  { category: "tile", itemName: "Outdoor Tile Fixing", unit: "SFT", rate: 100 },
  { category: "tile", itemName: "Swimming Pool Tile", unit: "SFT", rate: 150 },
  { category: "tile", itemName: "Designer Mosaic Tile", unit: "SFT", rate: 180 },
];

const WITHOUT_MATERIAL_PRICING = [
  { category: "marble", itemName: "Marble Flooring", unit: "SFT", rate: 120 },
  { category: "marble", itemName: "Marble Wall Cladding", unit: "SFT", rate: 140 },
  { category: "marble", itemName: "Marble Staircase (Tread + Riser)", unit: "RFT", rate: 1800 },
  { category: "marble", itemName: "Marble Skirting", unit: "RFT", rate: 60 },
  { category: "marble", itemName: "Marble Window Sill", unit: "RFT", rate: 120 },
  { category: "marble", itemName: "Marble Kitchen Countertop", unit: "RFT", rate: 900 },
  { category: "marble", itemName: "Marble Vanity Top", unit: "RFT", rate: 750 },
  { category: "granite", itemName: "Granite Flooring", unit: "SFT", rate: 150 },
  { category: "granite", itemName: "Granite Wall Cladding", unit: "SFT", rate: 160 },
  { category: "granite", itemName: "Granite Kitchen Countertop", unit: "RFT", rate: 850 },
  { category: "granite", itemName: "Granite Vanity Top", unit: "RFT", rate: 700 },
  { category: "granite", itemName: "Granite Window Sill", unit: "RFT", rate: 100 },
  { category: "granite", itemName: "Granite Staircase", unit: "RFT", rate: 1600 },
  { category: "tile", itemName: "Floor Tile Fixing", unit: "SFT", rate: 45 },
  { category: "tile", itemName: "Wall Tile Fixing", unit: "SFT", rate: 50 },
  { category: "tile", itemName: "Bathroom Tile (Full)", unit: "SFT", rate: 65 },
  { category: "tile", itemName: "Kitchen Backsplash Tile", unit: "SFT", rate: 55 },
  { category: "tile", itemName: "Outdoor Tile Fixing", unit: "SFT", rate: 55 },
  { category: "tile", itemName: "Swimming Pool Tile", unit: "SFT", rate: 80 },
  { category: "tile", itemName: "Designer Mosaic Tile", unit: "SFT", rate: 90 },
];

const TESTIMONIALS = [
  {
    name: "Ar. Rajesh Mehta",
    role: "Principal Architect, Mehta Design Studio",
    quote:
      "Sanjana Stone Arts consistently delivers the precision and finish quality our luxury residential projects demand. Their marble work is simply outstanding.",
    rating: 5,
    sortOrder: 1,
  },
  {
    name: "Vikram Singh",
    role: "Project Manager, BuildRight Constructions",
    quote:
      "We've partnered with Devisingh and his team on multiple commercial projects. Timely completion and competitive pricing without compromising quality.",
    rating: 5,
    sortOrder: 2,
  },
  {
    name: "Priya Desai",
    role: "Interior Designer",
    quote:
      "The attention to detail in their granite countertop and tile work is exceptional. My clients are always impressed with the final results.",
    rating: 5,
    sortOrder: 3,
  },
  {
    name: "Mr. & Mrs. Agarwal",
    role: "Homeowners, Jaipur",
    quote:
      "Our entire villa marble flooring was completed beautifully and on schedule. Sanjana Stone Arts transformed our home into something truly special.",
    rating: 5,
    sortOrder: 4,
  },
];

async function main() {
  await prisma.contactInquiry.deleteMany();
  await prisma.pricingItem.deleteMany();
  await prisma.project.deleteMany();
  await prisma.testimonial.deleteMany();

  for (const project of PROJECTS) {
    await prisma.project.create({ data: project });
  }

  for (const [index, item] of WITH_MATERIAL_PRICING.entries()) {
    await prisma.pricingItem.create({
      data: { ...item, materialType: "with_material", sortOrder: index },
    });
  }

  for (const [index, item] of WITHOUT_MATERIAL_PRICING.entries()) {
    await prisma.pricingItem.create({
      data: { ...item, materialType: "without_material", sortOrder: index },
    });
  }

  for (const testimonial of TESTIMONIALS) {
    await prisma.testimonial.create({ data: testimonial });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "admin" },
      create: {
        name: "Devisingh Prajapathi",
        email: adminEmail,
        phone: "+91 9900984570",
        passwordHash,
        role: "admin",
      },
    });
    console.log("Owner admin account ready:", adminEmail);
  }

  console.log("Seed completed successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
