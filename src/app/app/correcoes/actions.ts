"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

export type GradeResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const gradeSchema = z.object({
  answerId: z.string().min(1, "Resposta inválida."),
  isCorrect: z.boolean(),
  pointsAwarded: z.coerce.number().int().min(0, "Pontos inválidos.").max(100, "Pontos inválidos."),
  feedback: z.string().trim().max(2000, "Feedback muito longo.").optional(),
});

/**
 * O schema não possui campo de feedback em ExamAnswer.
 * O feedback do professor é persistido como Notification do aluno
 * (title = "Correção: <prova>", href = /app/correcoes?tentativa=...&resposta=...).
 */
export async function gradeAnswer(input: unknown): Promise<GradeResult> {
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireRole(["PROFESSOR", "ADMIN"]);
  const { answerId, isCorrect, pointsAwarded, feedback } = parsed.data;

  const answer = await prisma.examAnswer.findUnique({
    where: { id: answerId },
    include: {
      question: { include: { exam: { include: { course: { select: { id: true, title: true, teacherId: true } } } } } },
      attempt: { include: { student: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!answer) return { ok: false, error: "Resposta não encontrada." };

  const course = answer.question.exam.course;
  const canGrade =
    user.role === "ADMIN" || (course ? course.teacherId === user.id : false);

  if (!canGrade) {
    return { ok: false, error: "Você só pode corrigir provas dos seus cursos." };
  }

  const maxPoints = answer.question.points;
  const awarded = Math.min(pointsAwarded, maxPoints);

  await prisma.examAnswer.update({
    where: { id: answerId },
    data: { isCorrect, pointsAwarded: awarded },
  });

  // Recalcula a nota da tentativa.
  const answers = await prisma.examAnswer.findMany({
    where: { attemptId: answer.attemptId },
    include: { question: { select: { points: true } } },
  });
  const totalPoints = answers.reduce((sum, a) => sum + a.question.points, 0);
  const score = answers.reduce((sum, a) => sum + a.pointsAwarded, 0);
  const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passing = answer.question.exam.passingPercent;

  await prisma.examAttempt.update({
    where: { id: answer.attemptId },
    data: {
      score: percent,
      passed: percent >= passing,
    },
  });

  const feedbackBody = feedback?.trim() || "Correção registrada pelo professor.";
  {
    const href = `/app/provas/resultado/${answer.attemptId}?resposta=${answer.id}`;
    const existing = await prisma.notification.findFirst({
      where: { userId: answer.attempt.studentId, href },
    });
    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: { title: `Correção: ${answer.question.exam.title}`, body: feedbackBody, read: false },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: answer.attempt.studentId,
          title: `Correção: ${answer.question.exam.title}`,
          body: feedbackBody,
          href,
          read: false,
        },
      });
    }
  }

  revalidatePath("/app/correcoes");
  revalidatePath(`/app/provas/resultado/${answer.attemptId}`);
  revalidatePath("/app/notificacoes");
  return { ok: true, message: "Correção registrada." };
}
