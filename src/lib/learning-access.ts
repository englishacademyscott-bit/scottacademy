import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LearningUser = { id: string; role: Role };
export function canManageCourse(user: LearningUser, teacherId: string) {
  return user.role === "ADMIN" || user.role === "EDITOR" || (user.role === "PROFESSOR" && user.id === teacherId);
}

export async function getAccessibleLesson(user: LearningUser, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: {
    id: true, published: true, free: true, durationSec: true,
    module: { select: { courseId: true, course: { select: { teacherId: true, published: true, enrollments: { where: { studentId: user.id, status: { not: "CANCELADO" } }, select: { id: true } } } } } },
  } });
  if (!lesson) return null;
  const course = lesson.module.course;
  if (canManageCourse(user, course.teacherId)) return lesson;
  if (!lesson.published || !course.published || (!lesson.free && !course.enrollments.length)) return null;
  return lesson;
}
