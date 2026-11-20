"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

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
  if (user.role !== "ALUNO") {
    return { ok: false, error: "Apenas alunos podem realizar provas." };
  }

  if (!examId || typeof examId !== "string") {
    return { ok: false, error: "Prova inválida." };
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, title: true, published: true, maxAttempts: true, courseId: true },
  });

  if (!exam) {
    return { ok: false, error: "Prova não encontrada." };
  }

  if (!exam.published) {
    return { ok: false, error: "Esta prova ainda não está disponível." };
  }

  if (exam.courseId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId: exam.courseId } },
      select: { status: true },
    });
    if (!enrollment || enrollment.status === "CANCELADO") {
      return { ok: false, error: "Inscreva-se no curso para realizar esta prova." };
    }
  }

  let attempt: { id: string; resumed: boolean } | null = null;
  for (let retry = 0; retry < 2; retry += 1) {
    try {
      attempt = await prisma.$transaction(async (tx) => {
        const attempts = await tx.examAttempt.findMany({
          where: { examId: exam.id, studentId: user.id },
          select: { id: true, status: true, startedAt: true },
          orderBy: { startedAt: "desc" },
        });

        const emAndamento = attempts.find((item) => item.status === "EM_ANDAMENTO");
        if (emAndamento) return { id: emAndamento.id, resumed: true };
        if (attempts.length >= exam.maxAttempts) return null;

        const created = await tx.examAttempt.create({
          data: { examId: exam.id, studentId: user.id, status: "EM_ANDAMENTO" },
          select: { id: true },
        });
        return { id: created.id, resumed: false };
      }, { isolationLevel: "Serializable" });
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2034" || retry === 1) throw error;
    }
  }

  if (!attempt) {
    return { ok: false, error: "Você já utilizou todas as tentativas desta prova." };
  }

  revalidatePath("/app/provas");

  return { ok: true, attemptId: attempt.id, resumed: attempt.resumed };
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
  if (user.role !== "ALUNO") {
    return { ok: false, error: "Apenas alunos podem enviar provas." };
  }

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

  const deadline = attempt.startedAt.getTime() + attempt.exam.timeLimitMin * 60_000;
  const expired = Date.now() > deadline + 5_000;
  if (attempt.exam.courseId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId: attempt.exam.courseId,
        },
      },
      select: { status: true },
    });
    if (!enrollment || enrollment.status === "CANCELADO") {
      return { ok: false, error: "Sua inscrição neste curso não está ativa." };
    }
  }

  const byQuestion = new Map(
    parsed.data.answers.map((a) => [a.questionId, a] as const),
  );

  let pontosObtidos = 0;
  let pontosTotais = 0;

  const registros = attempt.exam.questions.map((question) => {
    pontosTotais += question.points;

    // Depois do prazo, encerra a tentativa sem aceitar alterações tardias.
    const dada = expired ? undefined : byQuestion.get(question.id);
    let isCorrect = false;
    let pointsAwarded = 0;
    let optionId: string | null = null;
    let textAnswer: string | null = null;

    if (dada) {
      if (question.type === "TEXTO_LIVRE") {
        const texto = (dada.textAnswer ?? "").trim();
        textAnswer = texto.length > 0 ? texto : null;
        // Respostas abertas começam sem pontuação e aguardam correção humana.
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
