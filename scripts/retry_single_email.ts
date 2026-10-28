import { PrismaClient } from "@prisma/client";
import { processEmailIntelligence } from "../src/lib/intelligence";

const prisma = new PrismaClient();

async function main() {
  const emailId = "cmvs4wemn008f13aecnvw44zu";
  const res = await processEmailIntelligence(emailId);
  console.log("Retry result:", res);

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { deadlines: true },
  });
  console.log("Deadlines for email:", email?.deadlines);
}

main().finally(() => prisma.$disconnect());
