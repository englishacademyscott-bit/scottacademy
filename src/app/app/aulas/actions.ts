"use server";

import { revalidatePath } from "next/cache";
import { issueCompletionCertificate } from "@/lib/completion-certificate";
import { prisma } from "@/lib/prisma";
import { getAccessibleLesson } from "@/lib/learning-access";
import { requireUser } from "@/lib/guards";

/**
 * Recalcula o percentual de progresso do aluno em um curso, considerando
 * apenas aulas publicadas. Usado após concluir (ou desmarcar) uma aula.
 */
async function recalcEnrollmentProgress(studentId: string, courseId: string) {
  const [total, done] = await Promise.all([
    prisma.lesson.count({
      where: { module: { courseId }, published: true },
    }),
    prisma.lessonProgress.count({
      where: { studentId, completed: true, lesson: { published: true, module: { courseId } } },
    }),
  ]);

  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  await prisma.enrollment.updateMany({
    where: { studentId, courseId, status: { not: "CANCELADO" } },
    data: {
      progress,
      status: progress >= 100 ? "CONCLUIDO" : "ATIVO",
      finishedAt: progress >= 100 ? new Date() : null,
    },
  });

  if (progress >= 100) await issueCompletionCertificate(studentId, courseId);
  return progress;
}

/**
 * Registra/atualiza o progresso da aula ao ser aberta.
 * Cria o registro se ainda não existir e atualiza `lastViewedAt`.
 *
 * Não chama `revalidatePath`: é disparado no `useEffect` do player e o
 * refresh da página já re-renderiza os dados. Revalidar durante o render
 * seria redundante.
 */
export async function registerLessonView(lessonId: string) {
  const user = await requireUser();

  const lesson = await getAccessibleLesson(user, lessonId);
  if (!lesson || user.role !== "ALUNO") return { ok: false };

  await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: user.id, lessonId } },
    create: { studentId: user.id, lessonId, watchedPercent: 0, lastPositionSec: 0, lastViewedAt: new Date() },
    update: { lastViewedAt: new Date() },
  });
  return { ok: true };
}

/**
 * Marca (ou desmarca) uma aula como concluída.
 * Atualiza `watchedPercent`, `completed`, `completedAt`, `lastViewedAt`
 * e recalcula o `Enrollment.progress` do aluno no curso.
 */
export async function setLessonCompleted(
  lessonId: string,
  completed: boolean,
  watchedPercent?: number,
) {
  const user = await requireUser();

  const lesson = await getAccessibleLesson(user, lessonId);
  if (!lesson || user.role !== "ALUNO") return { ok: false };

  if (typeof completed !== "boolean" || (watchedPercent !== undefined && !Number.isFinite(watchedPercent))) return { ok: false };
  const percent = completed ? 100 : Math.max(0, Math.min(99, watchedPercent ?? 0));

  const data = {
    watchedPercent: percent,
    completed,
    completedAt: completed ? new Date() : null,
    lastViewedAt: new Date(),
  };

  await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: user.id, lessonId } },
    create: {
      studentId: user.id,
      lessonId,
      ...data,
    },
    update: data,
  });

  const progress = await recalcEnrollmentProgress(user.id, lesson.module.courseId);

  revalidatePath(`/app/aulas/${lessonId}`);
  revalidatePath("/app/aulas");
  revalidatePath("/app/cursos/[slug]", "page");
  revalidatePath("/app/progresso");
  revalidatePath("/app/certificados");
  revalidatePath("/app");
  return { ok: true, progress };
}

/**
 * Salva a posição do vídeo (em segundos) e o percentual assistido.
 */
export async function saveLessonPosition(
  lessonId: string,
  lastPositionSec: number,
  watchedPercent: number,
) {
  const user = await requireUser();

  const lesson = await getAccessibleLesson(user, lessonId);
  if (!lesson || user.role !== "ALUNO") return { ok: false };

  if (!Number.isFinite(lastPositionSec) || !Number.isFinite(watchedPercent)) return { ok: false };
  const percent = Math.max(0, Math.min(100, Math.round(watchedPercent)));
  const completed = percent >= 95;

  const existing = await prisma.lessonProgress.findUnique({
    where: { studentId_lessonId: { studentId: user.id, lessonId } },
  });

  const data = {
    watchedPercent: percent,
    lastPositionSec: Math.max(0, Math.min(lesson.durationSec, Math.round(lastPositionSec))),
    completed: completed || (existing?.completed ?? false),
    completedAt: completed ? (existing?.completedAt ?? new Date()) : existing?.completedAt ?? null,
    lastViewedAt: new Date(),
  };

  await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: user.id, lessonId } },
    create: { studentId: user.id, lessonId, ...data },
    update: data,
  });

  if (completed) {
    await recalcEnrollmentProgress(user.id, lesson.module.courseId);
  }

  revalidatePath(`/app/aulas/${lessonId}`);
  revalidatePath("/app/progresso");
  return { ok: true };
}
