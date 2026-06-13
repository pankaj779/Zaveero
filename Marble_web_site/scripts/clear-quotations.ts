import { prisma } from "../lib/prisma";

async function main() {
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  console.log("Cleared quotations");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
