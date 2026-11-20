import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  try {
    const [plans, courses] = await Promise.all([
      prisma.plan.updateMany({ where: { description: { contains: "2 meses grátis" } }, data: { description: "Acesso Pro por 12 meses, com valor anual apresentado antes da contratação." } }),
      prisma.course.updateMany({ where: { subtitle: { contains: "garantida" } }, data: { subtitle: "Preparação estruturada para avançar no IELTS" } }),
    ]);
    console.log(`Textos atualizados: ${plans.count} plano(s), ${courses.count} curso(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
