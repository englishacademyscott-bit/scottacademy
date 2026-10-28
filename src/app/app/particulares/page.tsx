import { LessonKind, Role } from "@prisma/client";
import { addWeeks, subWeeks } from "date-fns";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PrivateLessons, type TeacherDTO } from "@/components/ui/private-lessons";
import type { SessionDTO } from "@/components/ui/session-kit";

export const dynamic = "force-dynamic";

export default async function ParticularesPage() {
  const user = await requireUser();

  const now = new Date();
  const rangeStart = subWeeks(now, 26);
  const rangeEnd = addWeeks(now, 26);

  const teachers = await prisma.user.findMany({
    where: { role: Role.PROFESSOR },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      coursesAuthored: {
        select: { id: true, category: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const reviews = await prisma.review.findMany({
    where: { course: { teacherId: { in: teachers.map((teacher) => teacher.id) } } },
    select: { rating: true, course: { select: { teacherId: true } } },
  });

  const ratingByTeacher = new Map<string, { total: number; count: number }>();
  for (const review of reviews) {
    const teacherId = review.course.teacherId;
    const current = ratingByTeacher.get(teacherId) ?? { total: 0, count: 0 };
    current.total += review.rating;
    current.count += 1;
    ratingByTeacher.set(teacherId, current);
  }

  const teacherPayload: TeacherDTO[] = teachers.map((teacher) => {
    const stats = ratingByTeacher.get(teacher.id);
    return {
      id: teacher.id,
      name: teacher.name,
      avatarUrl: teacher.avatarUrl,
      bio: teacher.bio,
      rating: stats && stats.count ? stats.total / stats.count : null,
      ratingCount: stats?.count ?? 0,
      courseCount: teacher.coursesAuthored.length,
      specialty: teacher.coursesAuthored[0]?.category ?? null,
    };
  });

  const sessions = await prisma.scheduledSession.findMany({
    where: {
      kind: LessonKind.AULA_PARTICULAR,
      ...(user.role === Role.ADMIN ? {} : { OR: [{ studentId: user.id }, { teacherId: user.id }] }),
      startsAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      teacher: { select: { id: true, name: true, avatarUrl: true } },
      student: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { startsAt: "asc" },
  });

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

  return <PrivateLessons teachers={teacherPayload} sessions={payload} />;
}
