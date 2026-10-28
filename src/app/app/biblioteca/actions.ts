"use server";

import { revalidatePath } from "next/cache";
import { LessonKind } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const lessonUpdateSchema = z.object({
  lessonId: z.string().min(1, "Aula inválida."),
  title: z.string().trim().min(3, "O título precisa de ao menos 3 caracteres.").max(160, "Título muito longo."),
  description: z.string().trim().max(2000, "Descrição muito longa.").nullable().optional(),
  kind: z.nativeEnum(LessonKind),
  durationSec: z.coerce.number().int().min(0, "Duração inválida.").max(60 * 60 * 12, "Duração máxima de 12h."),
  videoUrl: z.string().trim().max(500, "URL muito longa.").nullable().optional(),
  published: z.boolean(),
});

/**
 * Carrega a aula e valida se o usuário logado pode alterá-la.
 * EDITOR e ADMIN podem tudo; PROFESSOR apenas as aulas dos próprios cursos.
 */
async function loadEditableLesson(lessonId: string) {
  const user = await requireUser();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: { select: { id: true, title: true, teacherId: true } } } },
    },
  });

  if (!lesson) return { ok: false as const, error: "Aula não encontrada." };

  const canEdit =
    user.role === "ADMIN" ||
    user.role === "EDITOR" ||
    lesson.module.course.teacherId === user.id;

  if (!canEdit) {
    return { ok: false as const, error: "Você não tem permissão para alterar esta aula." };
  }

  return { ok: true as const, user, lesson };
}

export async function toggleLessonPublished(
  lessonId: string,
  published: boolean,
): Promise<ActionResult> {
  const guard = await loadEditableLesson(lessonId);
  if (!guard.ok) return { ok: false, error: guard.error };

  await prisma.lesson.update({ where: { id: lessonId }, data: { published } });
  revalidatePath("/app/biblioteca");
  return { ok: true, message: published ? "Aula publicada." : "Aula despublicada." };
}

export async function updateLesson(input: unknown): Promise<ActionResult> {
  const parsed = lessonUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Dados inválidos." };
  }

  const { lessonId, title, description, kind, durationSec, videoUrl, published } = parsed.data;

  const guard = await loadEditableLesson(lessonId);
  if (!guard.ok) return { ok: false, error: guard.error };

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title,
      description: description && description.length > 0 ? description : null,
      kind,
      durationSec,
      videoUrl: videoUrl && videoUrl.length > 0 ? videoUrl : null,
      published,
    },
  });

  revalidatePath("/app/biblioteca");
  return { ok: true, message: "Aula atualizada com sucesso." };
}

export async function duplicateLesson(lessonId: string): Promise<ActionResult> {
  const guard = await loadEditableLesson(lessonId);
  if (!guard.ok) return { ok: false, error: guard.error };
  const { lesson } = guard;

  const last = await prisma.lesson.findFirst({
    where: { moduleId: lesson.moduleId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const created = await prisma.lesson.create({
    data: {
      title: `${lesson.title} (cópia)`,
      description: lesson.description,
      kind: lesson.kind,
      videoUrl: lesson.videoUrl,
      provider: lesson.provider,
      durationSec: lesson.durationSec,
      position: (last?.position ?? 0) + 1,
      free: lesson.free,
      published: false,
      moduleId: lesson.moduleId,
    },
  });

  const materials = await prisma.lessonMaterial.findMany({ where: { lessonId: lesson.id } });
  if (materials.length > 0) {
    await prisma.lessonMaterial.createMany({
      data: materials.map((m) => ({ title: m.title, url: m.url, kind: m.kind, lessonId: created.id })),
    });
  }

  revalidatePath("/app/biblioteca");
  return { ok: true, message: "Aula duplicada como rascunho." };
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  const guard = await loadEditableLesson(lessonId);
  if (!guard.ok) return { ok: false, error: guard.error };

  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath("/app/biblioteca");
  return { ok: true, message: "Aula excluída." };
}
