"use server";
import { revalidatePath } from "next/cache";
import { issueCompletionCertificate } from "@/lib/completion-certificate";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
type EnrollmentResult = { ok: true } | { ok: false; error: string };
function refreshCourse(slug: string) {
  revalidatePath("/app/cursos");
  revalidatePath("/app/cursos/" + slug);
  revalidatePath("/app/aulas");
  revalidatePath("/app/progresso");
  revalidatePath("/app/certificados");
  revalidatePath("/app");
}
export async function enrollInCourse(courseId: string): Promise<EnrollmentResult> {
  const user = await requireUser();
  if (user.role !== "ALUNO") return { ok: false, error: "Apenas alunos podem se inscrever em cursos." };
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { published: true, slug: true } });
  if (!course?.published) return { ok: false, error: "Curso indisponível." };
  const [total, done] = await Promise.all([
    prisma.lesson.count({ where: { published: true, module: { courseId } } }),
    prisma.lessonProgress.count({ where: { studentId: user.id, completed: true, lesson: { published: true, module: { courseId } } } }),
  ]);
  const progress = total ? Math.min(100, Math.round(done / total * 100)) : 0;
  const data = { progress, status: progress === 100 ? "CONCLUIDO" as const : "ATIVO" as const, finishedAt: progress === 100 ? new Date() : null };
  await prisma.enrollment.upsert({ where: { studentId_courseId: { studentId: user.id, courseId } }, create: { studentId: user.id, courseId, ...data }, update: data });
  if (progress === 100) await issueCompletionCertificate(user.id, courseId);
  refreshCourse(course.slug);
  return { ok: true };
}
export async function unenrollFromCourse(courseId: string): Promise<EnrollmentResult> {
  const user = await requireUser();
  if (user.role !== "ALUNO") return { ok: false, error: "Apenas alunos podem cancelar inscrições." };
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  if (!course) return { ok: false, error: "Curso não encontrado." };
  await prisma.enrollment.updateMany({ where: { studentId: user.id, courseId }, data: { status: "CANCELADO" } });
  refreshCourse(course.slug);
  return { ok: true };
}
