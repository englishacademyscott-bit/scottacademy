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

function generateMeetingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SEA-";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function overlaps(
  where: {
    teacherId?: string;
    studentId?: string;
  },
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
) {
  return prisma.scheduledSession.findFirst({
    where: {
      ...where,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { notIn: [SessionStatus.CANCELADA] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
}

export type BookPrivateLessonInput = {
  teacherId: string;
  date: string;
  time: string;
  durationMin: number;
  topic?: string | null;
};

/** Agenda uma aula particular 1:1 (aluno logado x professor escolhido). */
export async function bookPrivateLesson(
  input: BookPrivateLessonInput,
): Promise<SessionActionResult> {
  const user = await requireUser();

  if (!input?.teacherId || !input?.date || !input?.time) {
    return { ok: false, message: "Preencha professor, data e horário." };
  }

  const durationMin = Number(input.durationMin);
  if (![30, 50, 60].includes(durationMin)) {
    return { ok: false, message: "Duração inválida. Escolha 30, 50 ou 60 minutos." };
  }

  const teacher = await prisma.user.findUnique({ where: { id: input.teacherId } });
  if (!teacher || teacher.role !== Role.PROFESSOR) {
    return { ok: false, message: "Professor inválido." };
  }
  if (teacher.id === user.id) {
    return { ok: false, message: "Você não pode agendar uma aula consigo mesmo." };
  }

  const startsAt = new Date(`${input.date}T${input.time}:00-03:00`);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, message: "Data ou horário inválidos." };
  }
  if (startsAt.getTime() < Date.now()) {
    return { ok: false, message: "Escolha um horário no futuro." };
  }

  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

  const teacherBusy = await overlaps({ teacherId: teacher.id }, startsAt, endsAt);
  if (teacherBusy) {
    return { ok: false, message: "O professor já possui uma aula nesse horário." };
  }

  const studentBusy = await overlaps({ studentId: user.id }, startsAt, endsAt);
  if (studentBusy) {
    return { ok: false, message: "Você já possui uma aula nesse horário." };
  }

  const topic = input.topic?.trim();

  await prisma.scheduledSession.create({
    data: {
      title: topic
        ? `Aula particular — ${topic}`
        : `Aula particular com ${teacher.name}`,
      description: topic
        ? `Aula particular (${durationMin}min) com ${teacher.name}. Tema: ${topic}.`
        : `Aula particular (${durationMin}min) com ${teacher.name}.`,
      kind: LessonKind.AULA_PARTICULAR,
      status: SessionStatus.AGENDADA,
      startsAt,
      endsAt,
      teacherId: teacher.id,
      studentId: user.id,
      courseId: null,
      meetingUrl: null,
      meetingCode: generateMeetingCode(),
      createdById: user.id,
    },
  });

  revalidateSessionPaths();
  return {
    ok: true,
    message: "Aula particular agendada. Você receberá a confirmação do professor.",
  };
}

/** Reagenda uma sessão existente (participante ou admin). */
export async function rescheduleSession(
  sessionId: string,
  startsAt: string,
  endsAt: string,
): Promise<SessionActionResult> {
  if (!sessionId) return { ok: false, message: "Sessão inválida." };

  const user = await requireUser();

  const session = await prisma.scheduledSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, message: "Aula não encontrada." };

  const isParticipant =
    session.studentId === user.id ||
    session.teacherId === user.id ||
    session.createdById === user.id;
  if (!isParticipant && user.role !== Role.ADMIN) {
    return { ok: false, message: "Você não tem permissão para reagendar esta aula." };
  }

  if (session.status === SessionStatus.CONCLUIDA || session.status === SessionStatus.CANCELADA) {
    return { ok: false, message: "Aulas concluídas ou canceladas não podem ser reagendadas." };
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "Data ou horário inválidos." };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, message: "O término precisa ser depois do início." };
  }
  if (start.getTime() < Date.now()) {
    return { ok: false, message: "Escolha um horário no futuro." };
  }

  const teacherBusy = await overlaps({ teacherId: session.teacherId }, start, end, session.id);
  if (teacherBusy && teacherBusy.id !== session.id) {
    return { ok: false, message: "O professor já possui uma aula nesse horário." };
  }

  if (session.studentId) {
    const studentBusy = await overlaps({ studentId: session.studentId }, start, end, session.id);
    if (studentBusy && studentBusy.id !== session.id) {
      return { ok: false, message: "O aluno já possui uma aula nesse horário." };
    }
  }

  await prisma.scheduledSession.update({
    where: { id: sessionId },
    data: {
      startsAt: start,
      endsAt: end,
      status: SessionStatus.AGENDADA,
    },
  });

  revalidateSessionPaths(sessionId);
  return { ok: true, message: "Aula reagendada." };
}

/** Cancela uma aula particular (participante ou admin). */
export async function cancelSession(sessionId: string): Promise<SessionActionResult> {
  if (!sessionId) return { ok: false, message: "Sessão inválida." };

  const user = await requireUser();

  const session = await prisma.scheduledSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, message: "Aula não encontrada." };

  const isParticipant =
    session.studentId === user.id ||
    session.teacherId === user.id ||
    session.createdById === user.id;
  if (!isParticipant && user.role !== Role.ADMIN) {
    return { ok: false, message: "Você não tem permissão para cancelar esta aula." };
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
