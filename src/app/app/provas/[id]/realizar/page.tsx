import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import type { ProvaQuestion } from "@/components/ui/question-card";
import { ProvaRealizacao } from "./prova-realizacao";

export const metadata: Metadata = {
  title: "Realizando prova",
};

/**
 * Embaralhamento determinístico: a ordem das questões precisa ser a mesma
 * em todos os recarregamentos da mesma tentativa, mas diferente entre
 * tentativas diferentes.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const random = () => {
    hash = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    hash ^= hash + Math.imul(hash ^ (hash >>> 7), 61 | hash);
    return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
  };

  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default async function RealizarProvaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const exam = await prisma.exam.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      published: true,
      timeLimitMin: true,
      passingPercent: true,
      shuffleQuestions: true,
      maxAttempts: true,
      questions: {
        select: {
          id: true,
          type: true,
          prompt: true,
          points: true,
          position: true,
          // ATENÇÃO: isCorrect nunca é enviado ao cliente antes do envio.
          options: {
            select: { id: true, text: true, position: true },
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!exam || !exam.published) notFound();

  // A tentativa só é criada pela ação explícita de começar a prova.
  let attemptId: string | null = null;
  let startedAt = new Date();

  const [emAndamento, totalTentativas] = await Promise.all([
    prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: user.id, status: "EM_ANDAMENTO" },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true },
    }),
    prisma.examAttempt.count({
      where: { examId: exam.id, studentId: user.id },
    }),
  ]);

  if (emAndamento) {
    attemptId = emAndamento.id;
    startedAt = emAndamento.startedAt;
  } else if (totalTentativas < exam.maxAttempts) {
    redirect(`/app/provas/${exam.id}`);
  } else {
    // Sem tentativas disponíveis: leva para o resultado da última prova feita.
    const ultima = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: user.id, status: "CONCLUIDA" },
      orderBy: { submittedAt: "desc" },
      select: { id: true },
    });
    if (ultima) redirect(`/app/provas/resultado/${ultima.id}`);
    notFound();
  }

  const base: ProvaQuestion[] = exam.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    position: q.position,
    options: q.options,
  }));

  const questions = exam.shuffleQuestions
    ? seededShuffle(base, attemptId ?? exam.id)
    : base;

  // Calculado no servidor para evitar divergência de hidratação no cronômetro.
  const initialRemaining = Math.max(
    0,
    Math.round(
      (startedAt.getTime() + exam.timeLimitMin * 60_000 - Date.now()) / 1000,
    ),
  );

  return (
    <ProvaRealizacao
      examId={exam.id}
      title={exam.title}
      timeLimitMin={exam.timeLimitMin}
      passingPercent={exam.passingPercent}
      startedAt={startedAt.toISOString()}
      initialRemaining={initialRemaining}
      questions={questions}
    />
  );
}
