import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { cache } from "react";

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });
  if (!user) redirect("/login");
  return { id: user.id, name: user.name, email: user.email, role: user.role, image: user.avatarUrl };
});

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/app");
  return user;
}

export async function getUserCounts() {
  const [alunos, cursos, aulas, sessoes] = await Promise.all([
    prisma.user.count({ where: { role: "ALUNO" } }),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.scheduledSession.count(),
  ]);
  return { alunos, cursos, aulas, sessoes };
}
