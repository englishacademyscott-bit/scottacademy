"use server";

import { LessonKind, QuestionType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

const roles = [Role.ADMIN, Role.EDITOR, Role.PROFESSOR];
const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const number = (form: FormData, key: string, fallback = 0) => {
  const parsed = Number(value(form, key));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const slugify = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const done = (message: string) => {
  revalidatePath("/app/gestao-conteudo");
  redirect(`/app/gestao-conteudo?ok=${encodeURIComponent(message)}`);
};

async function editableCourse(courseId: string) {
  const user = await requireRole(roles);
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, teacherId: true } });
  if (!course || (user.role === Role.PROFESSOR && course.teacherId !== user.id)) redirect("/app");
  return { user, course };
}

export async function createCourse(form: FormData) {
  const user = await requireRole(roles);
  if (user.role === Role.PROFESSOR) redirect("/app");
  const title = value(form, "title");
  const description = value(form, "description");
  const teacherId = value(form, "teacherId");
  if (title.length < 3 || description.length < 10 || !teacherId) redirect("/app/gestao-conteudo?error=Dados+do+curso+incompletos");
  const base = slugify(title) || "curso";
  let slug = base;
  for (let suffix = 2; await prisma.course.findUnique({ where: { slug } }); suffix += 1) slug = `${base}-${suffix}`;
  await prisma.course.create({ data: { title, slug, description, subtitle: value(form, "subtitle") || null, category: value(form, "category") || "Inglês", level: value(form, "level") || "INICIANTE", teacherId, priceCents: Math.max(0, Math.round(number(form, "price") * 100)), published: false } });
  done("Curso criado como rascunho.");
}

export async function createModule(form: FormData) {
  const courseId = value(form, "courseId");
  await editableCourse(courseId);
  const title = value(form, "title");
  if (title.length < 2) redirect("/app/gestao-conteudo?error=Informe+o+título+do+módulo");
  const last = await prisma.module.aggregate({ where: { courseId }, _max: { position: true } });
  await prisma.module.create({ data: { courseId, title, summary: value(form, "summary") || null, position: (last._max.position ?? 0) + 1 } });
  done("Módulo adicionado.");
}

export async function createLesson(form: FormData) {
  const moduleId = value(form, "moduleId");
  const courseModule = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!courseModule) redirect("/app/gestao-conteudo?error=Módulo+inválido");
  await editableCourse(courseModule.courseId);
  const title = value(form, "title");
  if (title.length < 2) redirect("/app/gestao-conteudo?error=Informe+o+título+da+aula");
  const last = await prisma.lesson.aggregate({ where: { moduleId }, _max: { position: true } });
  await prisma.lesson.create({ data: { moduleId, title, description: value(form, "description") || null, videoUrl: value(form, "videoUrl") || null, kind: (value(form, "kind") as LessonKind) || LessonKind.AULA_GRAVADA, durationSec: Math.max(0, number(form, "durationMin") * 60), position: (last._max.position ?? 0) + 1, published: form.get("published") === "on", free: form.get("free") === "on" } });
  done("Aula adicionada.");
}

export async function createMaterial(form: FormData) {
  const lessonId = value(form, "lessonId");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
  if (!lesson) redirect("/app/gestao-conteudo?error=Aula+inválida");
  await editableCourse(lesson.module.courseId);
  const url = value(form, "url");
  if (!/^https?:\/\//i.test(url)) redirect("/app/gestao-conteudo?error=Use+uma+URL+válida+para+o+material");
  await prisma.lessonMaterial.create({ data: { lessonId, title: value(form, "title") || "Material complementar", url, kind: value(form, "kind") || "PDF" } });
  done("Material vinculado.");
}

export async function createExam(form: FormData) {
  const courseId = value(form, "courseId");
  await editableCourse(courseId);
  const title = value(form, "title");
  if (title.length < 3) redirect("/app/gestao-conteudo?error=Informe+o+título+da+prova");
  await prisma.exam.create({ data: { courseId, title, description: value(form, "description") || null, timeLimitMin: Math.max(1, number(form, "timeLimitMin", 30)), passingPercent: Math.min(100, Math.max(0, number(form, "passingPercent", 60))), maxAttempts: Math.max(1, number(form, "maxAttempts", 3)), published: false } });
  done("Prova criada como rascunho.");
}

export async function createQuestion(form: FormData) {
  const examId = value(form, "examId");
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { courseId: true } });
  if (!exam?.courseId) redirect("/app/gestao-conteudo?error=Prova+inválida");
  await editableCourse(exam.courseId);
  const prompt = value(form, "prompt");
  const options = value(form, "options").split("\n").map((item) => item.trim()).filter(Boolean);
  const correct = Math.max(0, number(form, "correctOption", 1) - 1);
  if (prompt.length < 3 || options.length < 2) redirect("/app/gestao-conteudo?error=Inclua+o+enunciado+e+ao+menos+duas+opções");
  const last = await prisma.question.aggregate({ where: { examId }, _max: { position: true } });
  await prisma.question.create({ data: { examId, prompt, type: QuestionType.MULTIPLA_ESCOLHA, position: (last._max.position ?? 0) + 1, points: Math.max(1, number(form, "points", 1)), explanation: value(form, "explanation") || null, options: { create: options.map((text, index) => ({ text, position: index + 1, isCorrect: index === correct })) } } });
  done("Questão adicionada.");
}

export async function togglePublish(form: FormData) {
  const type = value(form, "type");
  const id = value(form, "id");
  if (type === "course") {
    await editableCourse(id);
    const item = await prisma.course.findUniqueOrThrow({ where: { id }, select: { published: true } });
    await prisma.course.update({ where: { id }, data: { published: !item.published } });
  } else if (type === "lesson") {
    const item = await prisma.lesson.findUniqueOrThrow({ where: { id }, select: { published: true, module: { select: { courseId: true } } } });
    await editableCourse(item.module.courseId);
    await prisma.lesson.update({ where: { id }, data: { published: !item.published } });
  } else if (type === "exam") {
    const item = await prisma.exam.findUniqueOrThrow({ where: { id }, select: { published: true, courseId: true } });
    if (!item.courseId) redirect("/app");
    await editableCourse(item.courseId);
    await prisma.exam.update({ where: { id }, data: { published: !item.published } });
  }
  done("Status de publicação atualizado.");
}
