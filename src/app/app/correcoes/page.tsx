import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { ClipboardList, PenLine } from "lucide-react";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SectionHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { CorrecoesView } from "@/components/app/correcoes-view";
import { QueryFilters } from "@/components/app/query-filters";

export const metadata = { title: "Correções" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CorrecoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(["PROFESSOR", "ADMIN"]);
  const sp = await searchParams;

  const aluno = first(sp.aluno) ?? "";
  const curso = first(sp.curso) ?? "";
  const prova = first(sp.prova) ?? "";
  const status = first(sp.status) ?? "";
  const conteudo = first(sp.conteudo) ?? "";

  const courses = await prisma.course.findMany({
    where: user.role === "PROFESSOR" ? { teacherId: user.id } : {},
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  const courseIds = courses.map((c) => c.id);

  const exams = await prisma.exam.findMany({
    where: courseIds.length ? { courseId: { in: courseIds } } : { courseId: "__none__" },
    select: { id: true, title: true, courseId: true },
    orderBy: { title: "asc" },
  });

  const students = await prisma.user.findMany({
    where: {
      role: "ALUNO",
      attempts: {
        some: {
          status: "CONCLUIDA",
          ...(courseIds.length ? { exam: { courseId: { in: courseIds } } } : {}),
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const examFilter: Prisma.ExamWhereInput = curso
    ? { courseId: curso }
    : courseIds.length
      ? { courseId: { in: courseIds } }
      : { courseId: "__none__" };

  const where: Prisma.ExamAttemptWhereInput = {
    status: "CONCLUIDA",
    exam: examFilter,
    ...(prova ? { examId: prova } : {}),
    ...(aluno ? { studentId: aluno } : {}),
  };

  const [attempts, feedbackNotes] = await Promise.all([
    prisma.examAttempt.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        exam: {
          select: {
            id: true,
            title: true,
            passingPercent: true,
            course: {
              select: {
                id: true,
                title: true,
                teacher: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
        answers: {
          include: {
            question: { select: { id: true, prompt: true, type: true, points: true, position: true } },
            option: { select: { text: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { title: { startsWith: "Correção:" } },
      select: { body: true, href: true, createdAt: true, userId: true },
    }),
  ]);

  const feedbackByAnswer = new Map<string, { body: string; createdAt: string }>();
  for (const note of feedbackNotes) {
    const answerId = note.href?.split("resposta=")[1];
    if (answerId) feedbackByAnswer.set(answerId, { body: note.body, createdAt: note.createdAt.toISOString() });
  }

  const rows = attempts
    .map((attempt) => {
      const answers = attempt.answers
        .map((answer) => {
          const feedback = feedbackByAnswer.get(answer.id);
          return {
            id: answer.id,
            prompt: answer.question.prompt,
            questionType: answer.question.type,
            points: answer.question.points,
            position: answer.question.position,
            textAnswer: answer.textAnswer,
            optionText: answer.option?.text ?? null,
            isCorrect: answer.isCorrect,
            pointsAwarded: answer.pointsAwarded,
            feedback: feedback?.body ?? null,
            feedbackAt: feedback?.createdAt ?? null,
          };
        })
        .sort((a, b) => a.position - b.position);

      const pending = answers.some(
        (a) => a.questionType === "TEXTO_LIVRE" && !a.isCorrect && a.pointsAwarded === 0,
      );

      return {
        id: attempt.id,
        examId: attempt.exam.id,
        examTitle: attempt.exam.title,
        courseId: attempt.exam.course?.id ?? null,
        courseTitle: attempt.exam.course?.title ?? "—",
        teacher: attempt.exam.course?.teacher ?? { name: "Professor", avatarUrl: null },
        passingPercent: attempt.exam.passingPercent,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        score: attempt.score,
        passed: attempt.passed,
        status: pending ? ("PENDENTE" as const) : ("REVISADA" as const),
        student: attempt.student,
        answers,
      };
    })
    .filter((row) => {
      if (status && row.status !== status) return false;
      if (conteudo === "redacoes" && !row.answers.some((a) => a.questionType === "TEXTO_LIVRE")) {
        return false;
      }
      return true;
    });

  const pendingCount = rows.filter((r) => r.status === "PENDENTE").length;
  const redacoes = rows.reduce(
    (sum, r) => sum + r.answers.filter((a) => a.questionType === "TEXTO_LIVRE").length,
    0,
  );
  const graded = rows.filter((r) => r.status === "REVISADA").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Correções"
        description="Revise as respostas dos alunos, corrija redações e devolva um feedback direto para eles."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tentativas" value={rows.length} icon={ClipboardList} />
        <StatCard label="Aguardando revisão" value={pendingCount} icon={PenLine} hint="Redações ainda não corrigidas" />
        <StatCard label="Revisadas" value={graded} icon={ClipboardList} />
        <StatCard label="Redações" value={redacoes} icon={PenLine} />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <QueryFilters
          selects={[
            {
              name: "aluno",
              label: "Todos os alunos",
              value: aluno,
              options: students.map((s) => ({ value: s.id, label: s.name })),
            },
            {
              name: "curso",
              label: "Todos os cursos",
              value: curso,
              options: courses.map((c) => ({ value: c.id, label: c.title })),
            },
            {
              name: "prova",
              label: "Todas as provas",
              value: prova,
              options: exams.map((e) => ({ value: e.id, label: e.title })),
            },
            {
              name: "status",
              label: "Todos os status",
              value: status,
              options: [
                { value: "PENDENTE", label: "Pendente de revisão" },
                { value: "REVISADA", label: "Revisada" },
              ],
            },
            {
              name: "conteudo",
              label: "Todos os tipos de resposta",
              value: conteudo,
              options: [{ value: "redacoes", label: "Apenas redações" }],
            },
          ]}
        />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma tentativa para corrigir"
          description="Quando os alunos concluírem as provas, elas aparecerão aqui para revisão."
        />
      ) : (
        <CorrecoesView rows={rows} />
      )}
    </div>
  );
}
