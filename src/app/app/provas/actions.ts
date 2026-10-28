"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

/**
 * Critério objetivo para respostas em texto livre.
 * Uma resposta em texto é considerada correta quando tem pelo menos
 * este número de caracteres (sem espaços nas pontas).
 */
const MIN_FREE_TEXT_CHARS = 30;

/* ------------------------------------------------------------------ */
/* Schemas (Zod)                                                       */
/* ------------------------------------------------------------------ */

const answerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1).nullish(),
  textAnswer: z.string().max(10_000).nullish(),
});

const submitSchema = z.object({
  examId: z.string().min(1),
  answers: z.array(answerSchema).max(500),
});

export type AttemptAnswerInput = {
  questionId: string;
  optionId?: string | null;
  textAnswer?: string | null;
};

export type StartAttemptResult =
  | { ok: true; attemptId: string; resumed: boolean }
  | { ok: false; error: string };

export type SubmitAttemptResult =
  | {
      ok: true;
      attemptId: string;
      score: number;
      passed: boolean;
      alreadySubmitted: boolean;
    }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* startAttempt                                                        */
/* ------------------------------------------------------------------ */

/**
 * Cria (ou retoma) uma tentativa de prova.
 * Sempre resolve a tentativa pelo aluno logado — nunca pelo id vindo do cliente.
 */
export async function startAttempt(examId: string): Promise<StartAttemptResult> {
  const user = await requireUser();

  if (!examId || typeof examId !== "string") {
    return { ok: false, error: "Prova inválida." };
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, title: true, published: true, maxAttempts: true },
  });

  if (!exam) {
    return { ok: false, error: "Prova não encontrada." };
  }

  if (!exam.published) {
    return { ok: false, error: "Esta prova ainda não está disponível." };
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { examId: exam.id, studentId: user.id },
    select: { id: true, status: true, startedAt: true },
    orderBy: { startedAt: "desc" },
  });

  // Retoma a tentativa em andamento (botão "Continuar prova").
  const emAndamento = attempts.find((a) => a.status === "EM_ANDAMENTO");
  if (emAndamento) {
    return { ok: true, attemptId: emAndamento.id, resumed: true };
  }

  if (attempts.length >= exam.maxAttempts) {
    return {
      ok: false,
      error: "Você já utilizou todas as tentativas desta prova.",
    };
  }

  const attempt = await prisma.examAttempt.create({
    data: { examId: exam.id, studentId: user.id, status: "EM_ANDAMENTO" },
  });

  revalidatePath("/app/provas");

  return { ok: true, attemptId: attempt.id, resumed: false };
}

/* ------------------------------------------------------------------ */
/* submitAttempt                                                       */
/* ------------------------------------------------------------------ */

/**
 * Envia as respostas, corrige a prova e fecha a tentativa.
 * A tentativa é sempre localizada por (examId + studentId logado + EM_ANDAMENTO).
 */
export async function submitAttempt(
  examId: string,
  answers: AttemptAnswerInput[],
): Promise<SubmitAttemptResult> {
  const user = await requireUser();

  const parsed = submitSchema.safeParse({ examId, answers });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Não foi possível enviar as respostas. Revise e tente novamente.",
    };
  }

  const attempt = await prisma.examAttempt.findFirst({
    where: {
      examId: parsed.data.examId,
      studentId: user.id, // <- vínculo com o aluno logado
      status: "EM_ANDAMENTO",
    },
    orderBy: { startedAt: "desc" },
    include: {
      exam: {
        include: {
          questions: {
            include: { options: true },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  if (!attempt) {
    // Idempotência: se já foi enviada, devolve o resultado existente.
    const concluida = await prisma.examAttempt.findFirst({
      where: {
        examId: parsed.data.examId,
        studentId: user.id,
        status: "CONCLUIDA",
      },
      orderBy: { submittedAt: "desc" },
      select: { id: true, score: true, passed: true },
    });

    if (concluida) {
      return {
        ok: true,
        attemptId: concluida.id,
        score: concluida.score ?? 0,
        passed: Boolean(concluida.passed),
        alreadySubmitted: true,
      };
    }

    return { ok: false, error: "Não há prova em andamento para enviar." };
  }

  const byQuestion = new Map(
    parsed.data.answers.map((a) => [a.questionId, a] as const),
  );

  let pontosObtidos = 0;
  let pontosTotais = 0;

  const registros = attempt.exam.questions.map((question) => {
    pontosTotais += question.points;

    const dada = byQuestion.get(question.id);
    let isCorrect = false;
    let pointsAwarded = 0;
    let optionId: string | null = null;
    let textAnswer: string | null = null;

    if (dada) {
      if (question.type === "TEXTO_LIVRE") {
        const texto = (dada.textAnswer ?? "").trim();
        textAnswer = texto.length > 0 ? texto : null;
        // Correção objetiva: mínimo de caracteres define o acerto.
        if (texto.length >= MIN_FREE_TEXT_CHARS) {
          isCorrect = true;
          pointsAwarded = question.points;
        }
      } else if (dada.optionId) {
        const option = question.options.find((o) => o.id === dada.optionId);
        if (option) {
          optionId = option.id;
          if (option.isCorrect) {
            isCorrect = true;
            pointsAwarded = question.points;
          }
        }
      }
    }

    if (pointsAwarded > 0) pontosObtidos += pointsAwarded;

    return {
      attemptId: attempt.id,
      questionId: question.id,
      optionId,
      textAnswer,
      isCorrect,
      pointsAwarded,
    };
  });

  const score =
    pontosTotais > 0 ? Math.round((pontosObtidos / pontosTotais) * 100) : 0;
  const passed = score >= attempt.exam.passingPercent;

  await prisma.$transaction([
    prisma.examAnswer.deleteMany({ where: { attemptId: attempt.id } }),
    prisma.examAnswer.createMany({ data: registros }),
    prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "CONCLUIDA",
        score,
        passed,
        submittedAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/app/provas");
  revalidatePath(`/app/provas/resultado/${attempt.id}`);
  revalidatePath(`/app/provas/${attempt.examId}`);

  return {
    ok: true,
    attemptId: attempt.id,
    score,
    passed,
    alreadySubmitted: false,
  };
}

/* ------------------------------------------------------------------ */
/* getAttemptResult                                                    */
/* ------------------------------------------------------------------ */

/**
 * Carrega o resultado completo de uma tentativa.
 * Retorna null se a tentativa não existe OU não pertence ao aluno logado.
 */
export async function getAttemptResult(attemptId: string) {
  const user = await requireUser();

  if (!attemptId || typeof attemptId !== "string") return null;

  return prisma.examAttempt.findFirst({
    where: {
      id: attemptId,
      studentId: user.id, // <- nunca confiar no id sem checar o dono
    },
    include: {
      exam: {
        include: {
          course: { select: { id: true, title: true, slug: true } },
          module: { select: { id: true, title: true, position: true } },
          questions: {
            include: { options: true },
            orderBy: { position: "asc" },
          },
        },
      },
      answers: {
        include: { option: true },
      },
    },
  });
}
