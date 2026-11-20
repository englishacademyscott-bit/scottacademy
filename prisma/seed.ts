import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Inicializando banco da Scott English Academy (apenas conta Master real)...");

  await prisma.notification.deleteMany();
  await prisma.examAnswer.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.review.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.lessonMaterial.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.scheduledSession.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const masterHash = await bcrypt.hash("123Scott#", 10);
  const master = await prisma.user.create({
    data: {
      name: "Scott English Academy",
      email: "englishacademyscott@gmail.com",
      passwordHash: masterHash,
      role: Role.ADMIN,
      bio: "Administrador Master da Scott English Academy.",
      phone: "+55 15 99822-9592",
      avatarUrl: null,
    },
  });

  console.log(`✅ Banco pronto em modo produção real! Usuário Master: ${master.email} (${master.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
