import type { Metadata } from "next";
import { FileCheck2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { ProvasList, type ProvaItem } from "./provas-list";

export const metadata: Metadata = {
  title: "Provas",
  description: "Provas de avaliação do Scott English Academy.",
};

export default async function ProvasPage() {
  const user = await requireUser();

  const exams = await prisma.exam.findMany({
    where: { published: true },
    orderBy: [{ createdAt: "asc" }, { title: "asc" }],
    include: {
      course: { select: { id: true, title: true } },
      module: { select: { id: true, title: true } },
      _count: { select: { questions: true } },
      attempts: {
        where: { studentId: user.id },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          score: true,
          passed: true,
          submittedAt: true,
        },
      },
    },
  });

  const provas: ProvaItem[] = exams.map((exam) => {
    const concluidas = exam.attempts.filter((a) => a.status === "CONCLUIDA");
    const emAndamento = exam.attempts.find((a) => a.status === "EM_ANDAMENTO");
    const ultima = concluidas[0] ?? null;
    const used = exam.attempts.length;

    let status: ProvaItem["status"] = "NAO_INICIADA";
    if (ultima) status = "CONCLUIDA";
    else if (emAndamento) status = "EM_ANDAMENTO";

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      courseId: exam.courseId,
      courseTitle: exam.course?.title ?? null,
      moduleTitle: exam.module?.title ?? null,
      questionCount: exam._count.questions,
      timeLimitMin: exam.timeLimitMin,
      passingPercent: exam.passingPercent,
      maxAttempts: exam.maxAttempts,
      attemptsUsed: used,
      attemptsRemaining: Math.max(0, exam.maxAttempts - used),
      status,
      lastAttemptId: ultima?.id ?? null,
      lastScore: ultima?.score ?? null,
      lastPassed: ultima?.passed ?? null,
      lastSubmittedAt: ultima?.submittedAt
        ? ultima.submittedAt.toISOString()
        : null,
    };
  });

  const cursos: { id: string; title: string }[] = Array.from(
    new Map<string, { id: string; title: string }>(
      provas
        .filter(
          (p): p is ProvaItem & { courseId: string; courseTitle: string } =>
            Boolean(p.courseId && p.courseTitle),
        )
        .map((p) => [p.courseId, { id: p.courseId, title: p.courseTitle }]),
    ).values(),
  );

  const pendentes = provas.filter((p) => p.status !== "CONCLUIDA").length;
  const feitas = provas.filter((p) => p.status === "CONCLUIDA").length;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200">
          <FileCheck2 className="h-3.5 w-3.5" />
          Avaliações
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
          Provas
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Teste seu inglês com as provas de cada módulo. Leia as instruções com
          atenção, faça a prova no seu tempo e veja o gabarito comentado
          imediatamente depois do envio.
        </p>
        <p className="text-sm text-subtle">
          {provas.length} {provas.length === 1 ? "prova" : "provas"} ·{" "}
          {pendentes} pendente{pendentes === 1 ? "" : "s"} · {feitas} feita
          {feitas === 1 ? "" : "s"}
        </p>
      </header>

      <ProvasList provas={provas} cursos={cursos} />
    </div>
  );
}
