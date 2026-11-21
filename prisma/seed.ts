import { PrismaClient, Role, PlanInterval } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Inicializando banco da Scott English Academy (conta Master + 2 planos personalizados)...");

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

  await prisma.plan.createMany({
    data: [
      {
        name: "Plano 1x por Semana",
        slug: "1x-semana",
        description:
          "Aula ao vivo exclusiva e personalizada para você conversar, praticar e evoluir no seu ritmo. Para saber mais, entre em contato com a nossa equipe — nosso diferencial faz a diferença no seu aprendizado.",
        priceCents: 0,
        interval: PlanInterval.MENSAL,
        features: [
          "1 aula ao vivo exclusiva por semana (individual por aluno)",
          "Aula 100% personalizada para o seu objetivo e nível",
          "Foco total em conversação e prática real",
          "Material e acompanhamento individual na plataforma",
        ],
        highlight: false,
        active: true,
        position: 1,
      },
      {
        name: "Plano 2x por Semana",
        slug: "2x-semana",
        description:
          "Duas aulas ao vivo exclusivas e personalizadas por semana para acelerar sua conversação e prática. Para saber mais, entre em contato com a nossa equipe — nosso diferencial faz a diferença no seu aprendizado.",
        priceCents: 0,
        interval: PlanInterval.MENSAL,
        features: [
          "2 aulas ao vivo exclusivas por semana (individual por aluno)",
          "Aulas 100% personalizadas para cada aluno conversar e praticar",
          "Evolução acelerada com acompanhamento próximo do professor",
          "Material, atividades e histórico completo na plataforma",
        ],
        highlight: true,
        active: true,
        position: 2,
      },
    ],
  });

  console.log(`✅ Banco atualizado! Usuário Master: ${master.email} (${master.role}) + 2 planos ativos (1x Semana e 2x Semana).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
