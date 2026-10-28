import { Role } from "@prisma/client";
import { addWeeks, startOfWeek, subWeeks } from "date-fns";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { AgendaCalendar } from "@/components/ui/agenda-calendar";
import type { SessionDTO } from "@/components/ui/session-kit";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const user = await requireUser();

  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const rangeStart = subWeeks(currentWeek, 6);
  const rangeEnd = addWeeks(currentWeek, 20);

  const roleFilter =
    user.role === Role.ADMIN
      ? {}
      : user.role === Role.PROFESSOR
        ? { OR: [{ teacherId: user.id }, { createdById: user.id }] }
        : { OR: [{ studentId: user.id }, { studentId: null }] };

  const [sessions, teachers, students, courses] = await Promise.all([
    prisma.scheduledSession.findMany({
      where: {
        ...roleFilter,
        startsAt: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        teacher: { select: { id: true, name: true, avatarUrl: true } },
        student: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: Role.PROFESSOR },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
    user.role === Role.PROFESSOR || user.role === Role.ADMIN
      ? prisma.user.findMany({
          where: { role: Role.ALUNO },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const payload: SessionDTO[] = sessions.map((session) => ({
    id: session.id,
    title: session.title,
    description: session.description,
    kind: String(session.kind) as SessionDTO["kind"],
    status: String(session.status) as SessionDTO["status"],
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    meetingUrl: session.meetingUrl,
    meetingCode: session.meetingCode,
    recordedUrl: session.recordedUrl,
    teacher: session.teacher,
    student: session.student,
    course: session.course,
    createdById: session.createdById,
  }));

  return (
    <AgendaCalendar
      sessions={payload}
      teachers={teachers}
      students={students}
      courses={courses}
      canCreate={user.role === Role.PROFESSOR || user.role === Role.ADMIN}
      isAdmin={user.role === Role.ADMIN}
    />
  );
}
