"use server";

import { revalidatePath } from "next/cache";
import { LessonKind, Role, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export type SessionActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function revalidateSessionPaths(sessionId?: string) {
  revalidatePath("/app/agenda");
  revalidatePath("/app/particulares");
  if (sessionId) revalidatePath(`/app/particulares/${sessionId}`);
}

/** Cancela uma sessão. Apenas o aluno dono, o professor, o criador ou um admin podem. */
export async function cancelSession(sessionId: string): Promise<SessionActionResult> {
  if (!sessionId || typeof sessionId !== "string") {
    return { ok: false, message: "Sessão inválida." };
  }

  const user = await requireUser();

  const session = await prisma.scheduledSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { ok: false, message: "Aula não encontrada." };
  }

  const isParticipant =
    session.studentId === user.id ||
    session.teacherId === user.id ||
    session.createdById === user.id;
  const isAdmin = user.role === Role.ADMIN;

  if (!isParticipant && !isAdmin) {
    return {
      ok: false,
      message: "Você não tem permissão para cancelar esta aula.",
    };
  }

  if (session.status === SessionStatus.CONCLUIDA) {
    return { ok: false, message: "Aulas já concluídas não podem ser canceladas." };
  }

  if (session.status === SessionStatus.CANCELADA) {
    return { ok: false, message: "Esta aula já está cancelada." };
  }

  await prisma.scheduledSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.CANCELADA },
  });

  revalidateSessionPaths(sessionId);
  return { ok: true, message: "Aula cancelada." };
}

export type CreateSessionInput = {
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  teacherId?: string | null;
  studentId?: string | null;
  courseId?: string | null;
  meetingUrl?: string | null;
  meetingCode?: string | null;
  kind?: "AULA_AO_VIVO" | "AULA_PARTICULAR";
};

/** Professor ou admin cria uma nova sessão (aula ao vivo ou particular). */
export async function createSession(
  input: CreateSessionInput,
): Promise<SessionActionResult> {
  const user = await requireUser();

  if (user.role !== Role.PROFESSOR && user.role !== Role.ADMIN) {
    return {
      ok: false,
      message: "Apenas professores e administradores podem criar aulas.",
    };
  }

  const title = (input.title ?? "").trim();
  if (title.length < 3) {
    return { ok: false, message: "Informe um título com pelo menos 3 caracteres." };
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, message: "Data ou horário inválidos." };
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, message: "O término precisa ser depois do início." };
  }

  // Professor só pode criar aulas em nome próprio.
  const teacherId =
    user.role === Role.ADMIN && input.teacherId ? input.teacherId : user.id;

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || !([Role.PROFESSOR, Role.ADMIN] as Role[]).includes(teacher.role)) {
    return { ok: false, message: "Professor inválido." };
  }

  if (input.studentId) {
    const student = await prisma.user.findUnique({ where: { id: input.studentId } });
    if (!student || student.role !== Role.ALUNO) {
      return { ok: false, message: "Aluno inválido." };
    }
  }

  if (input.courseId) {
    const course = await prisma.course.findUnique({ where: { id: input.courseId } });
    if (!course || (user.role === Role.PROFESSOR && course.teacherId !== user.id)) {
      return { ok: false, message: "Curso inválido." };
    }
  }

  const conflict = await prisma.scheduledSession.findFirst({
    where: {
      teacherId,
      status: { notIn: [SessionStatus.CANCELADA] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  if (conflict) {
    return {
      ok: false,
      message: "O professor já possui uma aula nesse horário.",
    };
  }

  const kind = input.kind === "AULA_PARTICULAR" ? LessonKind.AULA_PARTICULAR : LessonKind.AULA_AO_VIVO;

  await prisma.scheduledSession.create({
    data: {
      title,
      description: input.description?.trim() || null,
      kind,
      status: SessionStatus.AGENDADA,
      startsAt,
      endsAt,
      teacherId,
      studentId: input.studentId || null,
      courseId: input.courseId || null,
      meetingUrl: input.meetingUrl?.trim() || null,
      meetingCode: input.meetingCode?.trim() || null,
      createdById: user.id,
    },
  });

  revalidateSessionPaths();
  return { ok: true, message: "Aula criada com sucesso." };
}
