import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Info,
  Lightbulb,
  ListChecks,
  Target,
  Timer,
  XCircle,
} from "lucide-react";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate, formatDuration, formatTime } from "@/lib/utils";
import { TentarNovamenteButton } from "./tentar-novamente";

export const metadata: Metadata = {
  title: "Resultado da prova",
};

const TYPE_LABEL: Record<string, string> = {
  MULTIPLA_ESCOLHA: "Múltipla escolha",
  VERDADEIRO_FALSO: "Verdadeiro ou falso",
  TEXTO_LIVRE: "Resposta aberta",
};

function ScoreRing({ score }: { score: number }) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg
        viewBox="0 0 160 160"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Nota final: ${score}%`}
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="12"
          className="stroke-sunken"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-1000 ease-[var(--ease-out-quint)]",
            score >= 60 ? "stroke-emerald-500" : "stroke-cherry-500",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-default">
          {score}%
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-subtle">
          Sua nota
        </span>
      </div>
    </div>
  );
}

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireUser();

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId: user.id },
    include: {
      exam: {
        include: {
          course: { select: { id: true, title: true } },
          module: { select: { id: true, title: true } },
          questions: {
            include: { options: true },
            orderBy: { position: "asc" },
          },
        },
      },
      answers: { include: { option: true } },
    },
  });

  if (!attempt) notFound();
  if (attempt.status !== "CONCLUIDA") {
    redirect(`/app/provas/${attempt.examId}/realizar`);
  }

  const { exam } = attempt;
  const score = attempt.score ?? 0;
  const passed = Boolean(attempt.passed);
  const isAprovado = passed;

  const answerByQuestion = new Map(
    attempt.answers.map((a) => [a.questionId, a] as const),
  );

  const pontosTotais = exam.questions.reduce((acc, q) => acc + q.points, 0);
  const pontosObtidos = attempt.answers.reduce(
    (acc, a) => acc + a.pointsAwarded,
    0,
  );
  const acertos = attempt.answers.filter((a) => a.isCorrect).length;
  const answered = attempt.answers.filter(
    (a) => a.optionId !== null || (a.textAnswer ?? "").length > 0,
  ).length;

  const duracaoSegundos =
    attempt.submittedAt && attempt.startedAt
      ? Math.max(
          0,
          Math.round(
            (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000,
          ),
        )
      : 0;

  const totalTentativas = await prisma.examAttempt.count({
    where: { examId: exam.id, studentId: user.id },
  });
  const restantes = Math.max(0, exam.maxAttempts - totalTentativas);

  // Desempenho agregado por tipo de questão
  const porTipo = Array.from(
    exam.questions.reduce((map, question) => {
      const current = map.get(question.type) ?? { total: 0, earned: 0, count: 0 };
      const resposta = answerByQuestion.get(question.id);
      current.total += question.points;
      current.earned += resposta?.pointsAwarded ?? 0;
      current.count += 1;
      map.set(question.type, current);
      return map;
    }, new Map<string, { total: number; earned: number; count: number }>()).entries(),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/app/provas">
          <ArrowLeft className="h-4 w-4" />
          Voltar para as provas
        </Link>
      </Button>

      {/* ------------------------------ header ------------------------------ */}
      <header className="rounded-xl border border-subtle bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <ScoreRing score={score} />
            <div className="space-y-3 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {isAprovado ? (
                  <Badge variant="success" className="px-3 py-1 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Aprovado
                  </Badge>
                ) : (
                  <Badge variant="danger" className="px-3 py-1 text-sm">
                    <XCircle className="h-4 w-4" />
                    Reprovado
                  </Badge>
                )}
                <Badge variant="outline">
                  Nota de corte {exam.passingPercent}%
                </Badge>
              </div>

              <div>
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-default sm:text-3xl">
                  {exam.title}
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  {exam.course?.title ?? "Geral"}
                  {exam.module?.title ? ` · ${exam.module.title}` : ""}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-muted">
                {isAprovado
                  ? "Parabéns! Você atingiu a nota de corte. Continue avançando no módulo."
                  : "Você não atingiu a nota de corte desta vez. Revise as justificativas abaixo e tente novamente."}
              </p>
            </div>
          </div>
        </div>

        {/* estatísticas */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            icon={Target}
            label="Percentual"
            value={`${score}%`}
            hint={`${pontosObtidos} de ${pontosTotais} pontos`}
          />
          <Stat
            icon={CheckCircle2}
            label="Acertos"
            value={`${acertos}/${exam.questions.length}`}
            hint={`${Math.round(
              (acertos / Math.max(1, exam.questions.length)) * 100,
            )}% de acerto`}
          />
          <Stat
            icon={Timer}
            label="Tempo usado"
            value={formatDuration(duracaoSegundos)}
            hint={`Limite de ${exam.timeLimitMin} min`}
          />
          <Stat
            icon={Clock}
            label="Enviada em"
            value={formatDate(attempt.submittedAt ?? attempt.startedAt)}
            hint={`${formatTime(attempt.submittedAt ?? attempt.startedAt)} · ${answered} respondidas`}
          />
        </div>
      </header>

      {/* -------------------------- gráficos ------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-brand-500" />
              Desempenho por questão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {exam.questions.map((question, index) => {
              const resposta = answerByQuestion.get(question.id);
              const ratio =
                question.points > 0
                  ? (resposta?.pointsAwarded ?? 0) / question.points
                  : 0;
              const correta = Boolean(resposta?.isCorrect);
              return (
                <div key={question.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-muted">
                      Q{index + 1}. {question.prompt}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-semibold tabular-nums",
                        correta
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-cherry-600 dark:text-cherry-400",
                      )}
                    >
                      {resposta?.pointsAwarded ?? 0}/{question.points}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quint)]",
                        correta ? "bg-emerald-500" : "bg-cherry-500",
                      )}
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-brand-500" />
              Desempenho por tipo de questão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {porTipo.map(([tipo, dados]) => {
              const ratio =
                dados.total > 0 ? Math.round((dados.earned / dados.total) * 100) : 0;
              return (
                <div key={tipo} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-default">
                      {TYPE_LABEL[tipo] ?? tipo}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-default">
                      {ratio}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full gradient-brand transition-[width] duration-700 ease-[var(--ease-out-quint)]"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted">
                    {dados.earned} de {dados.total} pontos em {dados.count}{" "}
                    {dados.count === 1 ? "questão" : "questões"}
                  </p>
                </div>
              );
            })}

            {exam.module?.title ? (
              <div className="flex gap-3 rounded-xl border border-subtle bg-sunken p-4">
                <BookOpen className="h-5 w-5 shrink-0 text-brand-500" />
                <p className="text-sm leading-relaxed text-muted">
                  Conteúdo avaliado:{" "}
                  <span className="font-semibold text-default">
                    {exam.module.title}
                  </span>
                  {exam.course?.title ? ` — ${exam.course.title}` : ""}.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ----------------------- detalle por questão ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-brand-500" />
            Revisão das questões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exam.questions.map((question, index) => {
            const resposta = answerByQuestion.get(question.id);
            const gabarito = question.options.find((o) => o.isCorrect);
            const correta = Boolean(resposta?.isCorrect);

            return (
              <article
                key={question.id}
                className={cn(
                  "rounded-xl border p-4 sm:p-5",
                  correta
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5"
                    : "border-cherry-500/30 bg-cherry-500/5",
                )}
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
                        correta
                          ? "bg-emerald-600 text-white"
                          : "bg-cherry-500 text-white",
                      )}
                    >
                      {index + 1}
                    </span>
                    <h3 className="min-w-0 text-base font-semibold leading-relaxed text-default">
                      {question.prompt}
                    </h3>
                  </div>
                  <Badge variant={correta ? "success" : "danger"} className="shrink-0">
                    {correta ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {resposta?.pointsAwarded ?? 0} / {question.points} pts
                  </Badge>
                </header>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex flex-col gap-1 rounded-lg border border-subtle bg-surface px-3.5 py-2.5 sm:flex-row sm:gap-3">
                    <dt className="shrink-0 font-semibold text-muted sm:w-28">
                      Sua resposta
                    </dt>
                    <dd className="min-w-0 text-default">
                      {question.type === "TEXTO_LIVRE" ? (
                        resposta?.textAnswer ? (
                          <span className="whitespace-pre-wrap break-words">
                            {resposta.textAnswer}
                          </span>
                        ) : (
                          <span className="italic text-subtle">
                            Sem resposta
                          </span>
                        )
                      ) : resposta?.option ? (
                        resposta.option.text
                      ) : (
                        <span className="italic text-subtle">Sem resposta</span>
                      )}
                    </dd>
                  </div>

                  {question.type !== "TEXTO_LIVRE" ? (
                    <div className="flex flex-col gap-1 rounded-lg border border-subtle bg-surface px-3.5 py-2.5 sm:flex-row sm:gap-3">
                      <dt className="shrink-0 font-semibold text-muted sm:w-28">
                        Gabarito
                      </dt>
                      <dd className="min-w-0 font-medium text-default">
                        {gabarito?.text ?? "—"}
                      </dd>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 rounded-lg border border-subtle bg-surface px-3.5 py-2.5 sm:flex-row sm:gap-3">
                      <dt className="shrink-0 font-semibold text-muted sm:w-28">
                        Critério
                      </dt>
                      <dd className="min-w-0 text-default">
                        Resposta aberta correta a partir de 30 caracteres.
                      </dd>
                    </div>
                  )}
                </dl>

                {question.explanation ? (
                  <div className="mt-4 flex gap-3 rounded-lg border border-brand-200 bg-brand-50/60 p-3.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                    <Lightbulb className="h-4 w-4 shrink-0 text-brand-500" />
                    <p className="text-sm leading-relaxed text-default">
                      {question.explanation}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </CardContent>
      </Card>

      {/* ------------------------------ ações ------------------------------ */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {restantes > 0 ? (
            <TentarNovamenteButton
              examId={exam.id}
              attemptsRemaining={restantes}
            />
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-subtle bg-surface px-4 py-3 text-sm text-muted">
              <Info className="h-4 w-4 shrink-0 text-subtle" />
              Você utilizou todas as tentativas desta prova.
            </div>
          )}
        </div>

        <Button asChild variant="secondary" size="lg">
          <Link href="/app/cursos">
            <BookOpen className="h-5 w-5" />
            Ver outros cursos
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-subtle bg-sunken p-3.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
          {label}
        </p>
      </div>
      <p className="mt-1.5 text-lg font-bold tracking-tight tabular-nums text-default">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
