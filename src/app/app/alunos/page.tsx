import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { Users } from "lucide-react";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SectionHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { AlunosView } from "@/components/app/alunos-view";
import { QueryFilters } from "@/components/app/query-filters";

export const metadata = { title: "Alunos" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(["PROFESSOR", "ADMIN"]);
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;

  const q = (first(sp.q) ?? "").trim();
  const courseFilter = first(sp.curso) ?? "";
  const statusFilter = first(sp.status) ?? "";
  const sort = first(sp.ordem) ?? "nome";

  const courses = await prisma.course.findMany({
    where: isAdmin ? {} : { teacherId: user.id },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const visibleCourseIds = courses.map((c) => c.id);
  const selectedCourseId = visibleCourseIds.includes(courseFilter) ? courseFilter : "";

  const enrollmentWhere: Prisma.EnrollmentWhereInput = {
    student: { role: "ALUNO" },
    ...(visibleCourseIds.length > 0 ? { courseId: { in: visibleCourseIds } } : { id: "__none__" }),
    ...(selectedCourseId ? { courseId: selectedCourseId } : {}),
  };

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          phone: true,
          createdAt: true,
        },
      },
      course: { select: { id: true, title: true } },
    },
  });

  const studentIds = Array.from(new Set(enrollments.map((e) => e.studentId)));

  const [lessons, progress, attempts, feedbackNotes] = await Promise.all([
    visibleCourseIds.length
      ? prisma.lesson.findMany({
          where: { module: { courseId: { in: visibleCourseIds } } },
          select: {
            id: true,
            title: true,
            moduleId: true,
            module: { select: { id: true, title: true, position: true, courseId: true } },
          },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.lessonProgress.findMany({
          where: {
            studentId: { in: studentIds },
            lesson: { module: { courseId: { in: visibleCourseIds } } },
          },
          select: {
            studentId: true,
            lessonId: true,
            completed: true,
            watchedPercent: true,
            lastViewedAt: true,
            completedAt: true,
          },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.examAttempt.findMany({
          where: {
            studentId: { in: studentIds },
            status: "CONCLUIDA",
            exam: { courseId: { in: visibleCourseIds } },
          },
          include: {
            exam: { select: { title: true, course: { select: { title: true } } } },
            answers: {
              include: {
                question: { select: { prompt: true, type: true, points: true } },
                option: { select: { text: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.notification.findMany({
          where: { userId: { in: studentIds }, title: { startsWith: "Correção:" } },
          select: { body: true, href: true, createdAt: true, userId: true },
        })
      : Promise.resolve([]),
  ]);

  // ---- agregações por aluno -------------------------------------------------
  const feedbackByAnswer = new Map<string, { body: string; createdAt: string }>();
  for (const note of feedbackNotes) {
    const answerId = note.href?.split("resposta=")[1];
    if (answerId) feedbackByAnswer.set(answerId, { body: note.body, createdAt: note.createdAt.toISOString() });
  }

  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  const completedByStudent = new Map<string, number>();
  const lastActivityByStudent = new Map<string, string>();
  for (const p of progress) {
    if (p.completed) {
      completedByStudent.set(p.studentId, (completedByStudent.get(p.studentId) ?? 0) + 1);
    }
    const current = lastActivityByStudent.get(p.studentId);
    if (!current || p.lastViewedAt.toISOString() > current) {
      lastActivityByStudent.set(p.studentId, p.lastViewedAt.toISOString());
    }
  }

  const scoreByStudent = new Map<string, { sum: number; count: number }>();
  for (const attempt of attempts) {
    if (attempt.score == null) continue;
    const entry = scoreByStudent.get(attempt.studentId) ?? { sum: 0, count: 0 };
    entry.sum += attempt.score;
    entry.count += 1;
    scoreByStudent.set(attempt.studentId, entry);
    const submitted = attempt.submittedAt?.toISOString();
    if (submitted) {
      const current = lastActivityByStudent.get(attempt.studentId);
      if (!current || submitted > current) lastActivityByStudent.set(attempt.studentId, submitted);
    }
  }

  // ---- linhas da tabela ----------------------------------------------------
  const searchLower = q.toLowerCase();

  const rows = enrollments
    .map((e) => {
      const completed = completedByStudent.get(e.studentId) ?? 0;
      const score = scoreByStudent.get(e.studentId);
      const avgScore = score && score.count > 0 ? Math.round(score.sum / score.count) : null;
      const lastActivity = lastActivityByStudent.get(e.studentId) ?? null;
      const status = (e.status === "ATIVO" ? "ATIVO" : "INATIVO") as "ATIVO" | "INATIVO";
      return {
        enrollmentId: e.id,
        studentId: e.studentId,
        name: e.student.name,
        email: e.student.email,
        avatarUrl: e.student.avatarUrl,
        courseId: e.course.id,
        courseTitle: e.course.title,
        progress: e.progress,
        completedLessons: completed,
        avgScore,
        status,
        statusLabel: e.status === "ATIVO" ? "Ativo" : "Inativo",
        lastActivity,
      };
    })
    .filter((row) => {
      if (!searchLower) return true;
      return (
        row.name.toLowerCase().includes(searchLower) || row.email.toLowerCase().includes(searchLower)
      );
    })
    .filter((row) => {
      if (!statusFilter) return true;
      return row.status === statusFilter;
    });

  rows.sort((a, b) => {
    switch (sort) {
      case "progresso":
        return b.progress - a.progress;
      case "aulas":
        return b.completedLessons - a.completedLessons;
      case "nota":
        return (b.avgScore ?? -1) - (a.avgScore ?? -1);
      case "atividade":
        return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
      default:
        return a.name.localeCompare(b.name, "pt-BR");
    }
  });

  // ---- detalhe de cada aluno (painel lateral) ------------------------------
  const details = new Map<
    string,
    {
      studentId: string;
      name: string;
      email: string;
      avatarUrl: string | null;
      bio: string | null;
      phone: string | null;
      createdAt: string;
      courses: {
        id: string;
        title: string;
        progress: number;
        status: string;
        modules: { id: string; title: string; position: number; completed: number; total: number; percent: number }[];
      }[];
      exams: {
        id: string;
        title: string;
        courseTitle: string;
        score: number | null;
        passed: boolean | null;
        submittedAt: string | null;
        answers: {
          id: string;
          prompt: string;
          questionType: string;
          points: number;
          textAnswer: string | null;
          optionText: string | null;
          isCorrect: boolean;
          pointsAwarded: number;
          feedback: string | null;
          feedbackAt: string | null;
        }[];
      }[];
      completedLessons: { id: string; title: string; courseTitle: string; moduleTitle: string; completedAt: string | null }[];
      stats: { completedLessons: number; totalLessons: number; avgScore: number | null; lastActivity: string | null };
    }
  >();

  for (const studentId of studentIds) {
    const student = enrollments.find((e) => e.studentId === studentId)?.student;
    if (!student) continue;

    const studentEnrollments = enrollments.filter((e) => e.studentId === studentId);
    const courseBlocks = studentEnrollments.map((e) => {
      const modules = new Map<string, { id: string; title: string; position: number; total: number; completed: number }>();
      for (const lesson of lessons) {
        if (lesson.module.courseId !== e.course.id) continue;
        const entry = modules.get(lesson.moduleId) ?? {
          id: lesson.module.id,
          title: lesson.module.title,
          position: lesson.module.position,
          total: 0,
          completed: 0,
        };
        entry.total += 1;
        modules.set(lesson.moduleId, entry);
      }
      const studentProgress = progress.filter((p) => p.studentId === studentId);
      for (const p of studentProgress) {
        const lesson = lessonById.get(p.lessonId);
        if (!lesson || lesson.module.courseId !== e.course.id) continue;
        const entry = modules.get(lesson.moduleId);
        if (entry && p.completed) entry.completed += 1;
      }
      return {
        id: e.course.id,
        title: e.course.title,
        progress: e.progress,
        status: e.status,
        modules: Array.from(modules.values())
          .sort((a, b) => a.position - b.position)
          .map((m) => ({
            id: m.id,
            title: m.title,
            position: m.position,
            completed: m.completed,
            total: m.total,
            percent: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
          })),
      };
    });

    const studentAttempts = attempts
      .filter((a) => a.studentId === studentId)
      .map((a) => ({
        id: a.id,
        title: a.exam.title,
        courseTitle: a.exam.course?.title ?? "—",
        score: a.score,
        passed: a.passed,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        answers: a.answers.map((ans) => {
          const feedback = feedbackByAnswer.get(ans.id);
          return {
            id: ans.id,
            prompt: ans.question.prompt,
            questionType: ans.question.type,
            points: ans.question.points,
            textAnswer: ans.textAnswer,
            optionText: ans.option?.text ?? null,
            isCorrect: ans.isCorrect,
            pointsAwarded: ans.pointsAwarded,
            feedback: feedback?.body ?? null,
            feedbackAt: feedback?.createdAt ?? null,
          };
        }),
      }));

    const studentCompletedLessons = progress
      .filter((p) => p.studentId === studentId && p.completed)
      .map((p) => {
        const lesson = lessonById.get(p.lessonId);
        return {
          id: p.lessonId,
          title: lesson?.title ?? "Aula",
          courseTitle: lesson ? courses.find((c) => c.id === lesson.module.courseId)?.title ?? "—" : "—",
          moduleTitle: lesson?.module.title ?? "—",
          completedAt: p.completedAt?.toISOString() ?? null,
        };
      });

    const score = scoreByStudent.get(studentId);
    details.set(studentId, {
      studentId,
      name: student.name,
      email: student.email,
      avatarUrl: student.avatarUrl,
      bio: student.bio,
      phone: student.phone,
      createdAt: student.createdAt.toISOString(),
      courses: courseBlocks,
      exams: studentAttempts,
      completedLessons: studentCompletedLessons,
      stats: {
        completedLessons: completedByStudent.get(studentId) ?? 0,
        totalLessons: lessons.length,
        avgScore: score && score.count > 0 ? Math.round(score.sum / score.count) : null,
        lastActivity: lastActivityByStudent.get(studentId) ?? null,
      },
    });
  }

  const activeCount = rows.filter((r) => r.status === "ATIVO").length;
  const avgProgress = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.progress, 0) / rows.length)
    : 0;
  const scored = rows.filter((r) => r.avgScore != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + (r.avgScore ?? 0), 0) / scored.length)
    : 0;

  const detailList = Array.from(details.values()).filter((d) =>
    rows.some((r) => r.studentId === d.studentId),
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alunos"
        description={
          isAdmin
            ? "Todos os alunos matriculados na plataforma."
            : "Alunos matriculados nos seus cursos."
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Alunos matriculados" value={rows.length} icon={Users} hint={`${activeCount} ativos`} />
        <StatCard label="Progresso médio" value={`${avgProgress}%`} icon={Users} hint="Média das matrículas" />
        <StatCard label="Nota média" value={scored.length ? `${avgScore}%` : "—"} icon={Users} hint="Média das provas corrigidas" />
        <StatCard label="Cursos" value={courses.length} icon={Users} hint={isAdmin ? "Todos os cursos" : "Seus cursos"} />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <QueryFilters
          search={{ value: q, placeholder: "Buscar por nome ou e-mail" }}
          selects={[
            {
              name: "curso",
              label: "Todos os cursos",
              value: selectedCourseId,
              options: courses.map((c) => ({ value: c.id, label: c.title })),
            },
            {
              name: "status",
              label: "Todos os status",
              value: statusFilter,
              options: [
                { value: "ATIVO", label: "Ativo" },
                { value: "INATIVO", label: "Inativo" },
              ],
            },
            {
              name: "ordem",
              label: "Ordenar por nome",
              value: sort,
              defaultValue: "nome",
              options: [
                { value: "nome", label: "Nome (A–Z)" },
                { value: "progresso", label: "Maior progresso" },
                { value: "aulas", label: "Mais aulas concluídas" },
                { value: "nota", label: "Melhor nota média" },
                { value: "atividade", label: "Atividade recente" },
              ],
            },
          ]}
        />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum aluno encontrado"
          description="Ajuste a busca ou os filtros para ver outros alunos matriculados."
        />
      ) : (
        <AlunosView rows={rows} details={detailList} />
      )}
    </div>
  );
}
